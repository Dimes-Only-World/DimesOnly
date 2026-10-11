import { describe, expect, it } from "vitest";
import { shouldPlayAgeGateWarning } from "@/lib/ageGatePlayback";

describe("age-gate warning playback", () => {
  it("continues across warning, role selection and the unsubmitted short form", () => {
    expect(shouldPlayAgeGateWarning("warning")).toBe(true);
    expect(shouldPlayAgeGateWarning("role")).toBe(true);
    expect(shouldPlayAgeGateWarning("form")).toBe(true);
  });

  it("stops when successful submission opens the introduction", () => {
    expect(shouldPlayAgeGateWarning("video")).toBe(false);
  });
});