import type { Locator, Page } from "@playwright/test"

/**
 * Touch equivalent of `dragSelect` (see drag.ts) — a pointerdown →
 * pointermove* → pointerup sequence with `pointerType: "touch"`, exercising
 * the app's own Pointer Event handling directly.
 *
 * Deliberately doesn't use Playwright's built-in touch-gesture emulation
 * (`page.touchscreen`): that drives the OS/CDP touch-input layer, which
 * only produces a *scroll*-style gesture unless the page opts out of
 * native panning first — exactly the ambiguity the app's own Browse/Select
 * toggle exists to resolve, and not something CDP's synthetic touch input
 * reliably reproduces the same way a real finger does. Dispatching
 * PointerEvents straight at the target elements instead bypasses that
 * layer entirely and tests the app's listeners deterministically — the
 * same reasoning `dragSelect`'s docstring gives for using `page.mouse`
 * over synthetic mouse events, just one layer further from the browser's
 * own input pipeline.
 *
 * Only meaningful in Select mode (`touchSelectMode`) — that's what gates
 * ScheduleGrid's container-level pointermove listener that extends the
 * selection across cells. Calling this while the grid is in Browse mode
 * will only ever select the starting cell (see useDragSelection's
 * Browse-mode tap-vs-scroll threshold).
 */
export async function touchDragSelect(
  page: Page,
  start: Locator,
  end: Locator
): Promise<void> {
  const startBox = await start.boundingBox()
  const endBox = await end.boundingBox()
  if (!startBox || !endBox) {
    throw new Error("touchDragSelect: start or end cell not found in the DOM")
  }

  const startX = startBox.x + startBox.width / 2
  const startY = startBox.y + startBox.height / 2
  const endX = endBox.x + endBox.width / 2
  const endY = endBox.y + endBox.height / 2

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

  await start.dispatchEvent("pointerdown", pointerInit(startX, startY))

  const steps = 5
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps
    const y = startY + ((endY - startY) * i) / steps
    // Dispatched at the end cell: ScheduleGrid's touch-extension listener
    // resolves the actual cell under (x, y) via elementFromPoint, not off
    // the element the event was dispatched at — matching how a real touch
    // move is delivered to the pointer's original capture target while
    // still carrying the finger's current coordinates.
    await end.dispatchEvent("pointermove", pointerInit(x, y))
  }
  // The grid throttles drag-extension updates to one per animation frame
  // (see useDragSelection's rAF coalescing) — give it a frame to land
  // before releasing.
  await page.waitForTimeout(50)

  await end.dispatchEvent("pointerup", pointerInit(endX, endY))
}
