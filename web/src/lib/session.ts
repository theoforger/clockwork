import { getCookie, setCookie, deleteCookie } from "./cookies"

// How long a browser "remembers" an event/submission without the user
// visiting again. Chrome caps cookie lifetime at 400 days regardless.
const SESSION_DAYS = 400

const LAST_EVENT_COOKIE = "clockwork_last_event"

/** The most recently visited event, so the base URL can jump back into it. */
export function getLastEventId(): string | null {
  return getCookie(LAST_EVENT_COOKIE)
}

export function setLastEventId(eventId: string): void {
  setCookie(LAST_EVENT_COOKIE, eventId, SESSION_DAYS)
}

export function clearLastEventId(): void {
  deleteCookie(LAST_EVENT_COOKIE)
}

/**
 * Which attendee (if any) this browser already submitted as, for a given
 * event — scoped per-event since one browser may visit several events.
 */
function submittedAttendeeCookieName(eventId: string): string {
  return `clockwork_attendee_${eventId}`
}

export function getSubmittedAttendeeId(eventId: string): string | null {
  return getCookie(submittedAttendeeCookieName(eventId))
}

export function setSubmittedAttendeeId(
  eventId: string,
  attendeeId: string
): void {
  setCookie(submittedAttendeeCookieName(eventId), attendeeId, SESSION_DAYS)
}

export function clearSubmittedAttendeeId(eventId: string): void {
  deleteCookie(submittedAttendeeCookieName(eventId))
}
