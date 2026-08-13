import { fromZonedTime } from "date-fns-tz"

/**
 * Pinned for the whole suite (see playwright.config.ts's `use.timezoneId`
 * and `use.locale`) so date/calendar rendering — locale-formatted labels,
 * DST handling — is identical on every machine and in CI, regardless of
 * the host's own timezone. Deliberately not UTC, so a UTC-only bug in the
 * app's date handling can't hide behind the test environment.
 */
export const TIMEZONE = "America/New_York"

/**
 * Resolves a local wall-clock time string (`"2026-08-12 10:00:00"`), read
 * in the suite's fixed `TIMEZONE`, to the absolute instant it represents.
 * Delegates DST/offset resolution to date-fns-tz instead of hardcoding
 * UTC offsets, which would silently go wrong across a DST transition.
 */
export function zoned(localDateTime: string): Date {
  return fromZonedTime(localDateTime, TIMEZONE)
}

/**
 * Formats a date the way the API expects request bodies — a naive
 * (timezone-less) string (see web/src/lib/date-utils.ts's `formatAPIDate`).
 */
export function apiDate(date: Date): string {
  return date.toISOString().slice(0, 19)
}

/**
 * Convenience: an API-formatted string for a given local wall-clock time,
 * e.g. `apiDateAt("2026-08-12 10:00:00")`.
 */
export function apiDateAt(localDateTime: string): string {
  return apiDate(zoned(localDateTime))
}

/**
 * The react-day-picker `data-day` attribute value for a given local
 * calendar day (see web/src/components/ui/calendar.tsx's
 * `CalendarDayButton`) — lets tests click a specific day without parsing
 * rendered, locale-formatted text.
 */
export function dayCellSelector(localDate: string): string {
  const midnight = zoned(`${localDate} 00:00:00`)
  const label = midnight.toLocaleDateString("en-US", { timeZone: TIMEZONE })
  return `[data-day="${label}"]`
}

/**
 * The ScheduleGrid TimeCell's `data-time` attribute (an epoch-ms
 * timestamp) for a given local slot start (see
 * web/src/pages/EventSchedule/TimeCell.tsx).
 */
export function slotSelector(localDateTime: string): string {
  return `[data-time="${zoned(localDateTime).getTime()}"]`
}

/**
 * The instant the browser clock is pinned to before every test (see
 * fixtures/base.ts), so anything that reads the current date/time — the
 * create-event calendar's default month, the schedule's fallback
 * "current week" — is deterministic. Wednesday, Aug 12 2026, 9am local.
 */
export const FIXED_NOW = zoned("2026-08-12 09:00:00")
