export interface ScheduledEvent {
  id: string;
  date: string | null;
  date_tba?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  banner_video_url?: string | null;
  video_urls?: string[] | null;
}

function dateStart(event: ScheduledEvent): number {
  if (event.date_tba || !event.date) return Infinity;
  const timestamp = Date.parse(`${event.date.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : Infinity;
}

function timeOffset(time?: string | null): number | null {
  const match = time?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, hours, minutes, seconds = "0"] = match;
  if (+hours > 23 || +minutes > 59 || +seconds > 59) return null;
  return (+hours * 3600 + +minutes * 60 + +seconds) * 1000;
}

// Stored event dates use the site's UTC convention; missing end times last
// through the event day. An end earlier than the start belongs to the next day.
export function eventEndsAt(event: ScheduledEvent): number {
  const day = dateStart(event);
  const end = timeOffset(event.end_time);
  const start = timeOffset(event.start_time);
  if (end === null) return day + 86400000;
  return day + end + (start !== null && end <= start ? 86400000 : 0);
}

export function upcomingEvents<T extends ScheduledEvent>(events: T[], now: number): T[] {
  return events
    .filter((event) => eventEndsAt(event) > now)
    .sort((a, b) => {
      const aStart = dateStart(a);
      const bStart = dateStart(b);
      if (aStart !== bStart) return aStart < bStart ? -1 : 1;
      return (timeOffset(a.start_time) ?? 0) - (timeOffset(b.start_time) ?? 0)
        || a.id.localeCompare(b.id);
    });
}

export function eventBannerVideo(event: ScheduledEvent): string | undefined {
  return event.banner_video_url?.trim() || event.video_urls?.find((url) => url?.trim());
}