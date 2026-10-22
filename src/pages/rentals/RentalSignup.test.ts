import { describe, it, expect } from "vitest";
import { rentalSignupMissing } from "./RentalSignup";

const ok = {
  firstName: "Ann", lastName: "Lee", dateOfBirth: "1990-05-05", gender: "female",
  email: "ann@example.com", mobileNumber: "+1 (555) 555-5555", address: "1 Main St",
  city: "Goodyear", state: "AZ", zip: "85395", username: "annlee",
  password: "secret1", confirmPassword: "secret1",
};

describe("rental signup form", () => {
  it("accepts a complete form", () => expect(rentalSignupMissing(ok)).toEqual([]));
  it("blocks anyone under 18", () => {
    const y = new Date().getFullYear() - 17;
    expect(rentalSignupMissing({ ...ok, dateOfBirth: `${y}-01-01` })).toContain("You must be at least 18 years old");
  });
  it("requires matching passwords", () =>
    expect(rentalSignupMissing({ ...ok, confirmPassword: "other12" })).toContain("Passwords must match"));
});
