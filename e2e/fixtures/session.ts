import type { BrowserContext } from "@playwright/test"
import { WEB_BASE_URL } from "../env"

// Mirrors the cookie names/shape web/src/lib/session.ts reads and writes,
// so tests can seed "this browser already has a submission" state
// directly instead of re-deriving it by driving the submit form first.

export async function setLastEventCookie(
  context: BrowserContext,
  eventId: string
): Promise<void> {
  await context.addCookies([
    { name: "clockwork_last_event", value: eventId, url: WEB_BASE_URL },
  ])
}

export async function setSubmissionCookies(
  context: BrowserContext,
  eventId: string,
  attendeeId: string,
  token: string
): Promise<void> {
  await context.addCookies([
    {
      name: `clockwork_attendee_${eventId}`,
      value: attendeeId,
      url: WEB_BASE_URL,
    },
    {
      name: `clockwork_attendee_token_${eventId}`,
      value: token,
      url: WEB_BASE_URL,
    },
  ])
}
