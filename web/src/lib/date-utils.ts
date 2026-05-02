import { parseISO } from "date-fns"

/**
 * Parses a date string from the API.
 * The API provides UTC strings without a timezone suffix (e.g. "2026-06-01T14:00:00").
 * We append 'Z' to ensure it's treated as UTC by parseISO, which then converts it to a local Date object.
 */
export function parseAPI(dateStr: string): Date {
  if (!dateStr) return new Date()
  return parseISO(dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`)
}

/**
 * Formats a Date object for the API.
 * The API expects UTC strings without a timezone suffix.
 */
export function formatAPI(date: Date): string {
  return date.toISOString().slice(0, 19)
}
