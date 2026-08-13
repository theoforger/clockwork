import type { Locator, Page } from "@playwright/test"

/**
 * Performs a click-and-drag gesture from the center of `start` to the
 * center of `end`, the same mousedown → mousemove* → mouseup sequence a
 * real drag-to-select gesture on the schedule grid uses.
 *
 * Both cells must already be inside the current scroll viewport — this
 * deliberately does *not* scroll anything into view first. There's a real
 * timing bug in `useAutoScroll` (its pointer ref defaults to `{x: 0, y:
 * 0}` until the first real mousemove after drag-start updates it, and its
 * auto-scroll tick can run against that stale origin first): starting a
 * drag from an already-scrolled position reliably snaps `scrollTop` back
 * to 0 mid-drag, silently corrupting which cells actually get selected.
 * Tests that need cells outside the initial viewport should pick an event
 * with a `starts_after` that puts them there instead of scrolling — see
 * schedule-viewing.spec.ts for an example. The one test that exercises
 * the auto-scroll behavior on purpose (drag-selection.spec.ts) starts
 * from the unscrolled top and drags toward the bottom edge, which doesn't
 * trip this bug (the stale-origin tick's spurious "scroll up" is a no-op
 * when already at scrollTop 0).
 */
export async function dragSelect(
  page: Page,
  start: Locator,
  end: Locator
): Promise<void> {
  const startBox = await start.boundingBox()
  const endBox = await end.boundingBox()
  if (!startBox || !endBox) {
    throw new Error("dragSelect: start or end cell not found in the DOM")
  }

  const startX = startBox.x + startBox.width / 2
  const startY = startBox.y + startBox.height / 2
  const endX = endBox.x + endBox.width / 2
  const endY = endBox.y + endBox.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: 10 })
  // The grid throttles drag-extension updates to one per animation frame
  // (see useDragSelection's rAF coalescing) — give it a frame to land
  // before releasing.
  await page.waitForTimeout(50)
  await page.mouse.up()
}
