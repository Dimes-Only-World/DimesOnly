import { afterEach, describe, expect, it, vi } from "vitest";
import { withEdgeAuth } from "@/lib/edgeAuthFetch";

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

describe("custom rental and admin authorization", () => {
  it("attaches the admin session to rental-admin requests", () => {
    sessionStorage.setItem("adminToken", "test-admin-session");
    const [, init] = withEdgeAuth("https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/rental-admin", { headers: { apikey: "public-key" } });
    expect(new Headers(init?.headers).get("x-admin-token")).toBe("test-admin-session");
    expect(new Headers(init?.headers).get("apikey")).toBe("public-key");
  });
  it("attaches the member session to rental-booking requests", () => {
    sessionStorage.setItem("dimesPushAuthToken", "test-member-session");
    const [, init] = withEdgeAuth("https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/rental-booking");
    expect(new Headers(init?.headers).get("x-user-token")).toBe("test-member-session");
  });
});