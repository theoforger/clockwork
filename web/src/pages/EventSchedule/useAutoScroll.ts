import { useEffect, useRef } from "react"

// How close to the container's bottom/top edge (in px) the pointer needs
// to be before auto-scroll kicks in, and the fastest it'll scroll right
// at that edge.
const EDGE_SIZE = 56
const MAX_SPEED = 16

/**
 * Auto-scrolls `containerRef` vertically while `active` and the pointer
 * sits near its top/bottom edge — lets a drag-to-select gesture keep
 * extending past the currently visible grid instead of stalling the
 * moment the pointer reaches the edge of the scrollable area.
 *
 * Vertical only, deliberately: a drag is locked to the day it started on
 * (see useDragSelection's clampToDay), so auto-scrolling *horizontally*
 * toward another day's column would only scroll the selection preview out
 * of view without ever being able to extend into it.
 *
 * Scrolling can move new cells under an otherwise-stationary cursor, which
 * won't fire their own pointerenter — so after every scroll tick, whichever
 * cell now sits under the pointer (found via its `data-time` attribute) is
 * reported through `onCellHover`, the same callback a real hover would use,
 * so the selection keeps growing in step with the scroll.
 */
export function useAutoScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  onCellHover: (time: Date) => void
) {
  // null until the first real pointermove — a drag's pointerdown fires
  // before this effect's listener attaches, so a default like {x: 0, y: 0}
  // would read as "top-left corner" (inside the top edge's scroll zone)
  // and cause a spurious scroll-up pulse at the start of every drag.
  const pointerRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!active) return

    const handlePointerMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("pointermove", handlePointerMove)

    // How fast to scroll: 0 in the "dead zone" away from both edges,
    // ramping up to MAX_SPEED right at the edge itself.
    const edgeSpeed = (pos: number, start: number, end: number) => {
      if (pos < start + EDGE_SIZE) {
        return -MAX_SPEED * ((start + EDGE_SIZE - pos) / EDGE_SIZE)
      }
      if (pos > end - EDGE_SIZE) {
        return MAX_SPEED * ((pos - (end - EDGE_SIZE)) / EDGE_SIZE)
      }
      return 0
    }

    let rafId: number
    const tick = () => {
      const container = containerRef.current
      if (container && pointerRef.current) {
        const rect = container.getBoundingClientRect()
        const { x, y } = pointerRef.current

        const dy = edgeSpeed(y, rect.top, rect.bottom)
        if (dy) {
          container.scrollTop += dy
          const cell = document
            .elementFromPoint(x, y)
            ?.closest<HTMLElement>("[data-time]")
          if (cell) onCellHover(new Date(Number(cell.dataset.time)))
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      cancelAnimationFrame(rafId)
      // Reset for the next drag — otherwise it'd start out seeded with
      // wherever this one happened to end, which is just as wrong a
      // default as (0, 0) was.
      pointerRef.current = null
    }
  }, [active, containerRef, onCellHover])
}
