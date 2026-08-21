import { test, expect } from "../fixtures/base"
import { slotSelector } from "../utils/time"
import { selectedOverlay } from "../utils/colors"

// Touch counterpart of drag-selection.spec.ts's "a single click selects
// exactly that cell" — the grid's default (Browse) mode still needs a
// plain tap to toggle one cell, even though native scrolling is enabled
// (see useDragSelection's touch tap-vs-scroll threshold).
test.describe("Schedule grid — mobile tap select", () => {
  test("a tap in Browse mode selects exactly that cell", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Tap Select" })
    await page.goto(`/${created.id}`)

    // Browse mode is the default — the mobile Select toggle isn't engaged.
    // (Also doubles as the "page loaded" signal: the event name itself
    // only renders inside the sidebar, which is reached via a sheet on
    // mobile — see sidebar-drawer.mobile.spec.ts.)
    await expect(page.getByRole("button", { name: "Select" })).toBeVisible()

    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await cell.tap()
    await expect(selectedOverlay(cell)).toBeVisible()

    // Tapping again deselects it (same select/deselect toggle as desktop's
    // single click).
    await cell.tap()
    await expect(selectedOverlay(cell)).not.toBeVisible()
  })
})
