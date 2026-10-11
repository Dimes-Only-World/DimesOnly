export type AgeGateStep = "warning" | "role" | "form" | "video";

/** The intro step is reached only after a saved form or verified returning lead. */
export function shouldPlayAgeGateWarning(step: AgeGateStep): boolean {
  return step !== "video";
}