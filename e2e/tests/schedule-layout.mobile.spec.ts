import { test, expect } from "../fixtures/base"

test.describe("Schedule grid — mobile layout", () => {
  test("the header stays a single row", async ({ page, api }) => {
    const created = await api.createEvent({ name: "Header Row Test" })
    await page.goto(`/${created.id}`)

    // The hamburger is the header's first element, ModeToggle its last —
    // if the header ever wraps into two rows, these end up at different
    // y-coordinates instead of side by side.
    const hamburger = page.getByRole("button", { name: "Open attendee list" })
    const modeToggle = page.getByRole("button", { name: "Toggle theme" })
    await expect(hamburger).toBeVisible()
    await expect(modeToggle).toBeVisible()

    const hamburgerBox = (await hamburger.boundingBox())!
    const modeToggleBox = (await modeToggle.boundingBox())!
    expect(modeToggleBox.y).toBe(hamburgerBox.y)
  })

  test("hour-of-day labels stay visible while scrolling horizontally through the week", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Sticky Hours" })
    await page.goto(`/${created.id}`)

    const hourLabel = page.getByText("2:00 AM", { exact: true })
    await expect(hourLabel).toBeVisible()

    const scrollContainer = page.locator(".overflow-auto")
    const containerBox = (await scrollContainer.boundingBox())!

    // At rest, the label sits at its normal in-flow position — inset from
    // the container's edge by the grid's own left margin (see the comment
    // above the grid in ScheduleGrid.tsx for why that's a margin and not
    // padding on the container). It hasn't needed to engage `sticky` yet.
    const beforeBox = (await hourLabel.boundingBox())!
    expect(beforeBox.x - containerBox.x).toBeGreaterThan(2)

    await scrollContainer.evaluate((el) => {
      el.scrollLeft = 300
    })
    await expect(scrollContainer).toHaveJSProperty("scrollLeft", 300)

    // Once scrolled far enough to engage `sticky`, the label should sit
    // flush with the container's own edge — not inset from it. An inset
    // here (which is what a padding-left on the container instead of a
    // margin-left on the grid would produce) would leave a sliver where
    // the day columns scrolled out from under the label are still
    // visible, peeking out from behind it.
    const afterBox = (await hourLabel.boundingBox())!
    expect(Math.abs(afterBox.x - containerBox.x)).toBeLessThan(2)
  })
})
