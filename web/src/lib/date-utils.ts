import { parseISO } from "date-fns"

/**
 * Parses a UTC-but-no-timezone-suffix API date string (e.g.
 * "2026-06-01T14:00:00") into a local Date. Appending "Z" is what makes
 * parseISO treat it as UTC instead of local time.
 */
export function parseAPIDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  return parseISO(dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`)
}

/** Formats a Date back into the API's UTC-no-timezone-suffix format. */
export function formatAPIDate(date: Date): string {
  return date.toISOString().slice(0, 19)
}

// Reused across calls — safe, since Intl.DateTimeFormat#format doesn't hold
// any state between calls, and constructing one isn't free.
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
})

/**
 * Formats a time-of-day using the browser's locale, so 12-hour vs. 24-hour
 * display follows the user's own system/browser setting instead of being
 * hardcoded — keep this as the one place time-of-day gets formatted so the
 * whole app stays consistent.
 */
export function formatTime(date: Date): string {
  return timeFormatter.format(date)
}
