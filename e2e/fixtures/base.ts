import { test as base, expect, type Page } from "@playwright/test"
import { ApiClient } from "./api"
import { setLastEventCookie, setSubmissionCookies } from "./session"
import { FIXED_NOW } from "../utils/time"

export interface Fixtures {
  api: ApiClient
  /** Seeds this test's browser context with the cookies session.ts writes
   * after a real submission, so a test can start already "locked" to an
   * existing submission without re-deriving that state through the UI. */
  rememberSubmission: (
    eventId: string,
    attendeeId: string,
    token: string
  ) => Promise<void>
  /** Seeds the "last visited event" cookie that makes `/` redirect
   * straight back into an event. */
  rememberLastEvent: (eventId: string) => Promise<void>
}

export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    await use(new ApiClient())
  },

  rememberSubmission: async ({ context }, use) => {
    await use((eventId, attendeeId, token) =>
      setSubmissionCookies(context, eventId, attendeeId, token)
    )
  },

  rememberLastEvent: async ({ context }, use) => {
    await use((eventId) => setLastEventCookie(context, eventId))
  },
})

export { expect }

/**
 * Pins Date.now()/`new Date()` to a fixed instant, for the handful of
 * tests that actually read the current date/time (the create-event
 * calendar's default month, the schedule's fallback "current week").
 *
 * Deliberately *not* applied to every test by default: it interacts badly
 * with `dragCells` below — with the clock pinned, `useAutoScroll`'s
 * pointer-tracking + requestAnimationFrame loop can stall (likely because
 * something in its frame-timing math depends on a real, advancing
 * `performance.now()`), which silently drops the mousemove events a drag
 * depends on. Every test that needs both a fixed clock and a drag should
 * build its own event with explicit `starts_after`/`ends_before` instead,
 * so the drag target doesn't depend on "today" at all.
 */
export async function pinClock(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW)
}
