import { test, expect } from "../fixtures/base"
import { slotSelector } from "../utils/time"
import { dragSelect } from "../utils/drag"

// All of these deliberately stay within the grid's naturally-visible
// viewport (early hours, no scrolling) — see dragSelect's docstring for
// why a scrolled starting position isn't safe to test against right now.

test.describe("Schedule grid — selection", () => {
  test("a single click selects exactly that cell", async ({ page, api }) => {
    const created = await api.createEvent({ name: "Click Select" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Click Select")).toBeVisible()

    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await cell.click()
    await expect(cell).toHaveClass(/bg-primary/)
  })

  test("dragging across multiple cells selects the whole range", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Drag Range" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Drag Range")).toBeVisible()

    const start = page.locator(slotSelector("2026-08-09 02:00:00"))
    const mid = page.locator(slotSelector("2026-08-09 02:30:00"))
    const end = page.locator(slotSelector("2026-08-09 03:00:00"))

    await dragSelect(page, start, end)

    await expect(start).toHaveClass(/bg-primary/)
    await expect(mid).toHaveClass(/bg-primary/)
    await expect(end).toHaveClass(/bg-primary/)
  })

  test("dragging back over an already-selected range deselects it", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Drag Deselect" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Drag Deselect")).toBeVisible()

    const start = page.locator(slotSelector("2026-08-09 02:00:00"))
    const end = page.locator(slotSelector("2026-08-09 03:00:00"))

    await dragSelect(page, start, end)
    await expect(start).toHaveClass(/bg-primary/)
    await expect(end).toHaveClass(/bg-primary/)

    // Dragging the same already-selected range again should deselect it
    // (handleMouseDown picks "deselect" when the anchor cell is already
    // selected).
    await dragSelect(page, start, end)
    await expect(start).not.toHaveClass(/bg-primary/)
    await expect(end).not.toHaveClass(/bg-primary/)
  })

  test("Escape clears the selection", async ({ page, api }) => {
    const created = await api.createEvent({ name: "Escape Clear" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Escape Clear")).toBeVisible()

    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await cell.click()
    await expect(cell).toHaveClass(/bg-primary/)

    await page.keyboard.press("Escape")
    await expect(cell).not.toHaveClass(/bg-primary/)
  })

  test("Escape does not clear the selection while typing in a text field", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Escape While Typing" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Escape While Typing")).toBeVisible()

    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await cell.click()
    await expect(cell).toHaveClass(/bg-primary/)

    const nameInput = page.getByPlaceholder("Your name")
    await nameInput.fill("Someone")
    await nameInput.press("Escape")
    await expect(cell).toHaveClass(/bg-primary/)
  })

  test("the sidebar's 'Clear selection' row clears the selection and disables itself when there's nothing to clear", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Clear Row" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Clear Row")).toBeVisible()

    const clearRow = page.getByText("Clear selection")
    await expect(clearRow).toBeDisabled()

    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await cell.click()
    await expect(clearRow).toBeEnabled()

    await clearRow.click()
    await expect(cell).not.toHaveClass(/bg-primary/)
    await expect(clearRow).toBeDisabled()
  })

  test("dragging toward the bottom edge auto-scrolls and keeps extending the selection", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Auto Scroll Drag" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Auto Scroll Drag")).toBeVisible()

    const start = page.locator(slotSelector("2026-08-09 00:00:00"))
    const startBox = (await start.boundingBox())!
    const scrollContainer = page.locator(".overflow-auto")

    await expect(scrollContainer).toHaveJSProperty("scrollTop", 0)

    await page.mouse.move(
      startBox.x + startBox.width / 2,
      startBox.y + startBox.height / 2
    )
    await page.mouse.down()
    // Hold near the bottom edge of the viewport and give the auto-scroll
    // tick loop real animation frames to run.
    await page.mouse.move(startBox.x + startBox.width / 2, 700, { steps: 5 })
    await page.waitForTimeout(1500)

    const scrolledTop: number = await scrollContainer.evaluate(
      (el) => el.scrollTop
    )
    expect(scrolledTop).toBeGreaterThan(0)

    await page.mouse.up()

    // The selection should extend well past the single starting cell —
    // count how many cells actually ended up selected.
    const selectedCount = await page.locator("[data-time].bg-primary").count()
    expect(selectedCount).toBeGreaterThan(5)
  })

  test("dragging into another day's column stays locked to the day the drag started on", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Cross Day Drag" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Cross Day Drag")).toBeVisible()

    const start = page.locator(slotSelector("2026-08-09 02:00:00"))
    // Same time-of-day, the very next column over — dragging here should
    // not select anything on 2026-08-10; the selection should clamp to
    // the end of 2026-08-09 instead.
    const nextDayCell = page.locator(slotSelector("2026-08-10 02:00:00"))

    await dragSelect(page, start, nextDayCell)

    await expect(start).toHaveClass(/bg-primary/)
    await expect(nextDayCell).not.toHaveClass(/bg-primary/)
    // 23:30 — the last slot of 2026-08-09 — should be selected instead,
    // confirming the drag clamped to the end of the day rather than just
    // stopping short of the next one.
    const lastSlotOfStartDay = page.locator(slotSelector("2026-08-09 23:30:00"))
    await expect(lastSlotOfStartDay).toHaveClass(/bg-primary/)
  })
})
