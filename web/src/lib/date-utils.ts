import { parseISO } from "date-fns"

/**
 * Parses a date string from the API.
 * The API provides UTC strings without a timezone suffix (e.g. "2026-06-01T14:00:00").
 * We append 'Z' to ensure it's treated as UTC by parseISO, which then converts it to a local Date object.
 */
export function parseAPIDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  return parseISO(dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`)
}

/**
 * Formats a Date object for the API.
 * The API expects UTC strings without a timezone suffix.
 */
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
