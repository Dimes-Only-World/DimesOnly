/** Opens the shared "New or returning?" join pop-up from any Join Free / Start Free button. */
export const JOIN_FLOW_EVENT = "dimes:open-join-flow";

export function openJoinFlow() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(JOIN_FLOW_EVENT));
}

export const AGE_OK_KEY = "ageVerified";
export const SHORT_FORM_USERNAME_KEY = "shortFormUsername";
