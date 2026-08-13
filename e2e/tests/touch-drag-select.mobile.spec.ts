import { test, expect } from "../fixtures/base"
import { slotSelector } from "../utils/time"
import { touchDragSelect } from "../utils/drag-touch"

// Touch counterpart of drag-selection.spec.ts's multi-cell drag test —
// exercises Select mode specifically (see useDragSelection's docstring for
// why Browse mode can't safely extend a selection across cells on touch).
// All within the grid's naturally-visible viewport, same caveat as
// drag-selection.spec.ts re: dragSelect's scroll-position timing note.
test.describe("Schedule grid — mobile touch drag select", () => {
  test("toggling Select mode and dragging across multiple cells selects the whole range", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Touch Drag Range" })
    await page.goto(`/${created.id}`)

    await page.getByRole("button", { name: "Select" }).click()
    await expect(page.getByRole("button", { name: "Selecting" })).toBeVisible()

    const start = page.locator(slotSelector("2026-08-09 02:00:00"))
    const mid = page.locator(slotSelector("2026-08-09 02:30:00"))
    const end = page.locator(slotSelector("2026-08-09 03:00:00"))

    await touchDragSelect(page, start, end)

    await expect(start).toHaveClass(/bg-primary/)
    await expect(mid).toHaveClass(/bg-primary/)
    await expect(end).toHaveClass(/bg-primary/)
  })

  test("dragging into another day's column stays locked to the day the drag started on", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Touch Cross Day Drag" })
    await page.goto(`/${created.id}`)

    await page.getByRole("button", { name: "Select" }).click()
    await expect(page.getByRole("button", { name: "Selecting" })).toBeVisible()

    const start = page.locator(slotSelector("2026-08-09 02:00:00"))
    // Same time-of-day, the next column over — both columns are within
    // the naturally-visible mobile viewport without scrolling.
    const nextDayCell = page.locator(slotSelector("2026-08-10 02:00:00"))

    await touchDragSelect(page, start, nextDayCell)

    await expect(start).toHaveClass(/bg-primary/)
    await expect(nextDayCell).not.toHaveClass(/bg-primary/)
    const lastSlotOfStartDay = page.locator(slotSelector("2026-08-09 23:30:00"))
    await expect(lastSlotOfStartDay).toHaveClass(/bg-primary/)
  })

  test("the range tooltip stays visible on the cell a touch drag is currently extended to", async ({
    page,
    api,
  }) => {
    // Before the touch-drag-cursor fix, only mouse/pen dragging kept the
    // tooltip visible per cell (via a real pointerenter on each one) —
    // touch never fired that, so the tooltip stayed hidden throughout an
    // entire touch drag despite the selection itself extending correctly.
    const created = await api.createEvent({ name: "Touch Drag Tooltip" })
    await page.goto(`/${created.id}`)

    await page.getByRole("button", { name: "Select" }).click()
    await expect(page.getByRole("button", { name: "Selecting" })).toBeVisible()

    const start = page.locator(slotSelector("2026-08-09 02:00:00"))
    const end = page.locator(slotSelector("2026-08-09 03:00:00"))
    const startBox = (await start.boundingBox())!
    const endBox = (await end.boundingBox())!

    const pointerInit = (x: number, y: number) => ({
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    })

    await start.dispatchEvent(
      "pointerdown",
      pointerInit(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2)
    )
    await end.dispatchEvent(
      "pointermove",
      pointerInit(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2)
    )
    // The grid throttles drag-extension updates to one per animation frame
    // (see useDragSelection's rAF coalescing) — give it a frame to land.
    await page.waitForTimeout(50)

    await expect(end.locator(".pointer-events-none")).toHaveClass(/opacity-100/)

    await end.dispatchEvent(
      "pointerup",
      pointerInit(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2)
    )
  })
})
