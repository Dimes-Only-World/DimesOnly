import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { rentalIsActiveForExtension } from "./rules.ts";

Deno.test("only collected active rental statuses can be extended", () => {
  assertEquals(rentalIsActiveForExtension("active"), true);
  assertEquals(rentalIsActiveForExtension("in_progress"), true);
  assertEquals(rentalIsActiveForExtension("picked_up"), true);
  assertEquals(rentalIsActiveForExtension("approved"), false);
  assertEquals(rentalIsActiveForExtension("upcoming"), false);
  assertEquals(rentalIsActiveForExtension("paid"), false);
  assertEquals(rentalIsActiveForExtension("returned"), false);
});