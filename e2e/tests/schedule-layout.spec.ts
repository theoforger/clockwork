import { test, expect } from "../fixtures/base"

// Desktop counterpart of schedule-layout.mobile.spec.ts's header test —
// this one specifically catches a regression only visible at `md:`+ (the
// title reverting to its natural size there instead of staying flex-1
// meant nothing pushed the trailing controls to the header's right edge
// anymore, so ModeToggle ended up trailing the title instead of sitting
// in the corner).
test.describe("Schedule grid — layout", () => {
  test("the mode toggle sits at the header's right edge", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Mode Toggle Position" })
    await page.goto(`/${created.id}`)

    const modeToggle = page.getByRole("button", { name: "Toggle theme" })
    await expect(modeToggle).toBeVisible()

    const viewport = page.viewportSize()!
    const box = (await modeToggle.boundingBox())!
    // Should be right up against the header's own right padding (p-4 =
    // 16px on desktop), not trailing off wherever the title happens to
    // end.
    expect(viewport.width - (box.x + box.width)).toBeLessThan(24)
  })
})
