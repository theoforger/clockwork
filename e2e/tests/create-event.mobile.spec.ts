import { test, expect, pinClock } from "../fixtures/base"
import { dayCellSelector } from "../utils/time"

// Mobile counterpart of create-event.spec.ts's "description, date range,
// and times" flow — the one that exercises the date-range + two time
// pickers row, which stacks vertically below `sm:` instead of the desktop
// side-by-side layout (see CreateEvent.tsx).
test.describe("Create event — mobile", () => {
  test("the stacked date/time row fits the viewport and the full create flow works", async ({
    page,
  }) => {
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

    // Nothing in the stacked date/time row should spill past the right
    // edge of a narrow viewport — the row is flex-col below `sm:`
    // specifically to avoid this (see CreateEvent.tsx).
    const viewport = page.viewportSize()!
    for (const id of ["#event-date-range", "#event-starts-at", "#event-ends-at"]) {
      const box = await page.locator(id).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    }

    await page.getByRole("button", { name: "Create", exact: true }).click()
    await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/)
    // The event name itself only renders inside the sidebar, reached via a
    // sheet at this viewport (see sidebar-drawer.mobile.spec.ts) — the
    // hamburger being there confirms the schedule page itself loaded.
    await expect(
      page.getByRole("button", { name: "Open attendee list" })
    ).toBeVisible()
  })
})
