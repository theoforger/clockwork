import { test, expect } from "../fixtures/base"
import { slotSelector } from "../utils/time"

// The one flow that most needs to work end-to-end on mobile: tap-select a
// slot, open the sidebar sheet, fill the form, submit.
test.describe("Submitting availability — mobile", () => {
  test("tap-select, open the sheet, fill the form, and submit", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Mobile Submit" })
    await page.goto(`/${created.id}`)

    // Select availability on the grid first, then open the sidebar —
    // opening it first would work too, but this is the natural order and
    // avoids relying on the sheet staying open across a drag (it doesn't
    // need to: see EventSchedule/index.tsx's auto-close-on-drag-start
    // effect, which only matters if the sheet was already open).
    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await cell.tap()
    await expect(cell).toHaveClass(/bg-primary/)

    // The floating "1 slot selected" button is the surfaced next step
    // after selecting — use it instead of the hamburger directly, so this
    // test also covers that it actually opens the sidebar.
    await page.getByRole("button", { name: "1 slot selected" }).click()

    // The sheet renders the same content as the (still-present-but-hidden)
    // desktop aside, so scope queries to the sheet's own panel rather than
    // the page as a whole to avoid matching both copies.
    const sheet = page.locator('[data-slot="sheet-content"]')
    await sheet.getByPlaceholder("Your name").fill("Alice")
    await sheet.getByRole("button", { name: "🦊" }).click()
    await sheet
      .getByRole("button", { name: "Submit My Availability" })
      .click()

    // The toast is its own top-level portal, not inside either sidebar
    // copy, so no scoping needed here.
    await expect(page.getByText("Selection submitted!")).toBeVisible()
    await expect(sheet.getByText("Alice")).toBeVisible()

    // Locked: fields disabled, Submit gone, Edit/Delete shown instead —
    // same as the desktop flow, just reached through the sheet.
    await expect(sheet.getByPlaceholder("Your name")).toBeDisabled()
    await expect(
      sheet.getByRole("button", { name: "Submit My Availability" })
    ).toHaveCount(0)
    await expect(sheet.getByRole("button", { name: "Edit" })).toBeVisible()
    await expect(sheet.getByRole("button", { name: "Delete" })).toBeVisible()
  })

  test("the floating selection button only shows up once something's selected, and hides while the sheet is open", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Fab Visibility" })
    await page.goto(`/${created.id}`)

    const fab = page.getByRole("button", { name: /slot(s)? selected/ })
    await expect(fab).toHaveCount(0)

    const first = page.locator(slotSelector("2026-08-09 02:00:00"))
    await first.tap()
    await expect(page.getByRole("button", { name: "1 slot selected" })).toBeVisible()

    const second = page.locator(slotSelector("2026-08-09 03:00:00"))
    await second.tap()
    await expect(page.getByRole("button", { name: "2 slots selected" })).toBeVisible()

    // Opening the sidebar (whichever way) hides it — no point pointing at
    // itself while the destination it points to is already open.
    await page.getByRole("button", { name: "2 slots selected" }).click()
    await expect(fab).toHaveCount(0)

    // Deselecting everything from inside the sheet removes it too.
    const sheet = page.locator('[data-slot="sheet-content"]')
    await sheet.getByText("Clear selection").click()
    await page.keyboard.press("Escape")
    await expect(fab).toHaveCount(0)
  })
})
