/**
 * Tiny global registry so dashboard popups can be sequenced.
 * Any popup that is visible should hold a slot; the Mansion Party
 * celebration only fires once every slot is released.
 */

const active = new Set<string>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((cb) => cb());

export const acquirePopupSlot = (id: string) => {
  if (active.has(id)) return;
  active.add(id);
  notify();
};

export const releasePopupSlot = (id: string) => {
  if (!active.delete(id)) return;
  notify();
};

export const isPopupQueueClear = () => active.size === 0;

export const subscribePopupQueue = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Extra safety net: any other Radix dialog/alert-dialog currently mounted. */
export const hasOpenDialogInDom = () => {
  if (typeof document === "undefined") return false;
  return document.querySelectorAll(
    '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]'
  ).length > 0;
};
