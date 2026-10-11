// Cookie and similar-technologies consent state.
// Choices are stored in localStorage and applied to Google Analytics.
// Global Privacy Control (GPC) always disables advertising/data sharing.

export type CookieChoices = {
  essential: true;
  referralTracking: boolean;
  analytics: boolean;
  advertising: boolean;
};

export type ConsentRecord = {
  version: 1;
  decidedAt: string;
  gpcOptOut: boolean;
  choices: CookieChoices;
};

export const CONSENT_STORAGE_KEY = "dow-cookie-consent";
export const CONSENT_CHANGED_EVENT = "dow-consent-changed";

const readRecord = (): ConsentRecord | null => {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed?.version !== 1 || !parsed.choices) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const hasDecided = () => readRecord() !== null;

export const getConsent = (): ConsentRecord | null => readRecord();

/** Browser Global Privacy Control signal (computed once per load). */
export const isGpcOptOut = (): boolean => {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true;
};

export const setConsent = (choices: Omit<CookieChoices, "essential">) => {
  const gpcOptOut = isGpcOptOut();
  const record: ConsentRecord = {
    version: 1,
    decidedAt: new Date().toISOString(),
    gpcOptOut,
    // GPC is honored as an advertising opt-out regardless of what was chosen.
    choices: { essential: true, ...choices, advertising: gpcOptOut ? false : choices.advertising },
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable — consent simply won't persist.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
  applyConsent(record);
  return record;
};

// ---------- Google Analytics gating ----------
// GA only loads after analytics consent. The gtag stub lives in index.html.

const GA_ID = "G-Z6XX851W8E";
let gaLoaded = false;

const loadGa = () => {
  if (gaLoaded || typeof document === "undefined") return;
  gaLoaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  const w = window as Window & { gtag?: (...args: unknown[]) => void };
  w.gtag?.("js", new Date());
  w.gtag?.("config", GA_ID, { anonymize_ip: true });
};

/** Apply the stored (or fresh) consent to the site's analytics behavior. */
export const applyConsent = (record: ConsentRecord | null) => {
  if (record?.choices.analytics) loadGa();
};

/** Subscribe to consent changes; returns an unsubscribe function. */
export const onConsentChanged = (listener: () => void) => {
  window.addEventListener(CONSENT_CHANGED_EVENT, listener);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, listener);
};
