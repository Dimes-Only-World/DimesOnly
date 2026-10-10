import { describe, expect, it } from "vitest";
import { eventBannerVideo, upcomingEvents } from "../src/lib/eventSchedule";

const event = (date: string) => ({ id: date, date, start_time: "18:00", end_time: "23:00" });
const now = Date.parse("2026-10-10T17:22:00Z");

describe("upcoming event feature", () => {
  it("features October 15 with October 19, October 26 and November 1 underneath", () => {
    expect(upcomingEvents([event("2026-11-01"), event("2026-10-26"), event("2026-10-15"), event("2026-10-19")], now).map((e) => e.date))
      .toEqual(["2026-10-15", "2026-10-19", "2026-10-26", "2026-11-01"]);
  });
  it("promotes a newly added October 14 event ahead of October 15", () => {
    expect(upcomingEvents([event("2026-10-15"), event("2026-10-14")], now).map((e) => e.date))
      .toEqual(["2026-10-14", "2026-10-15"]);
  });
  it("promotes October 19 after October 15 ends", () => {
    expect(upcomingEvents([event("2026-10-15"), event("2026-10-19")], Date.parse("2026-10-15T23:00:00Z"))[0]?.date)
      .toBe("2026-10-19");
  });
  it("keeps an overnight event until its actual end", () => {
    const overnight = { ...event("2026-10-15"), end_time: "02:00" };
    expect(upcomingEvents([overnight], Date.parse("2026-10-16T01:59:00Z"))).toHaveLength(1);
    expect(upcomingEvents([overnight], Date.parse("2026-10-16T02:00:00Z"))).toHaveLength(0);
  });
  it("places TBA after dated events, preserving it even with an old placeholder date", () => {
    expect(upcomingEvents([{ ...event("2026-01-01"), date_tba: true }, event("2026-10-15")], now).map((e) => e.date))
      .toEqual(["2026-10-15", "2026-01-01"]);
  });
  it("moves a TBA event into date order once its date is entered", () => {
    const tba = { ...event("2026-10-14"), date_tba: true };
    expect(upcomingEvents([tba, event("2026-10-15")], now).map((e) => e.date))
      .toEqual(["2026-10-15", "2026-10-14"]);
    expect(upcomingEvents([{ ...tba, date_tba: false }, event("2026-10-15")], now).map((e) => e.date))
      .toEqual(["2026-10-14", "2026-10-15"]);
  });
  it("keeps a multi-day event until its stored end date and time", () => {
    const multipleDays = { ...event("2026-10-15"), end_date: "2026-10-17", end_time: "02:00" };
    expect(upcomingEvents([multipleDays], Date.parse("2026-10-16T12:00:00Z"))).toHaveLength(1);
    expect(upcomingEvents([multipleDays], Date.parse("2026-10-17T02:00:00Z"))).toHaveLength(0);
  });
  it("uses the selected banner video then the first uploaded video", () => {
    expect(eventBannerVideo({ ...event("2026-10-15"), banner_video_url: "selected.mp4", video_urls: ["first.mp4"] })).toBe("selected.mp4");
    expect(eventBannerVideo({ ...event("2026-10-15"), video_urls: ["first.mp4"] })).toBe("first.mp4");
  });
});