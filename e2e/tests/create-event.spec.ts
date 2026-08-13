import { test, expect, pinClock } from "../fixtures/base"
import { dayCellSelector } from "../utils/time"

test.describe("Create event", () => {
  test("creating an event with only a name redirects to the event page", async ({
    page,
  }) => {
    await page.goto("/")
    await page.locator("#event-name").fill("Team Sync")
    await page.getByRole("button", { name: "Create", exact: true }).click()

    await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/)
    // CardTitle isn't a semantic heading (see AttendeeSidebar's <h2> for a
    // real one), so this can't be getByRole("heading", ...).
    await expect(page.getByText("Team Sync")).toBeVisible()
  })

  test("creating an event with description, date range, and times", async ({
    page,
  }) => {
    // The calendar's default visible month depends on "today" — pin it so
    // Aug 12/14 2026 are guaranteed to be on screen without navigating.
    await pinClock(page)

    await page.goto("/")
    await page.locator("#event-name").fill("Quarterly Planning")
    await page
      .locator("#event-description")
      .fill("Bring your roadmap notes")

    await page.locator("#event-date-range").click()
    await page.locator(dayCellSelector("2026-08-12")).first().click()
    await page.locator(dayCellSelector("2026-08-14")).first().click()
    await page.keyboard.press("Escape")

    await expect(page.locator("#event-starts-at")).toBeVisible()
    await page.locator("#event-starts-at").fill("09:00")
    await page.locator("#event-ends-at").fill("17:00")

    await expect(page.getByText(/starts no earlier than/)).toBeVisible()

    await page.getByRole("button", { name: "Create", exact: true }).click()
    await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/)
    await expect(page.getByText("Quarterly Planning")).toBeVisible()
  })

  test("blocks submitting when the start time is at/after the end time, without hitting the API", async ({
    page,
  }) => {
    await pinClock(page)

    await page.goto("/")
    await page.locator("#event-name").fill("Bad Range")
    await page.locator("#event-date-range").click()
    // A single click on react-day-picker's range mode already selects a
    // same-day range (from === to) — a second click on the same day would
    // deselect it entirely. One-day range, so only the *times* (not the
    // dates) are responsible for start >= end here.
    await page.locator(dayCellSelector("2026-08-12")).first().click()
    await page.keyboard.press("Escape")

    await page.locator("#event-starts-at").fill("17:00")
    await page.locator("#event-ends-at").fill("09:00")

    await page.getByRole("button", { name: "Create", exact: true }).click()

    await expect(
      page.getByText("The event must start before it ends")
    ).toBeVisible()
    // Still on the form — nothing was submitted.
    await expect(page).toHaveURL("/")
  })

  test("missing a name is rejected by the required field, not submitted", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Create", exact: true }).click()
    // The browser's native `required` validation blocks the submit —
    // still on the form, and the input itself reports it's invalid.
    await expect(page).toHaveURL("/")
    const isValid = await page
      .locator("#event-name")
      .evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(isValid).toBe(false)
  })

  test("revisiting the home page redirects back into the last created event", async ({
    page,
  }) => {
    await page.goto("/")
    await page.locator("#event-name").fill("Repeat Visit")
    await page.getByRole("button", { name: "Create", exact: true }).click()
    await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/)
    // The "last event" cookie is only set once the schedule page itself
    // finishes loading the event (see useEventData), not at creation time.
    await expect(page.getByText("Repeat Visit")).toBeVisible()
    const eventUrl = page.url()

    await page.goto("/")
    await expect(page).toHaveURL(eventUrl)
    await expect(page.getByText("Repeat Visit")).toBeVisible()
  })
})
