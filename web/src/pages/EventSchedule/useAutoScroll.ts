import { useEffect, useRef } from "react"

// How close to the container's edge (in px) the pointer needs to be before
// auto-scroll kicks in, and the fastest it'll scroll right at that edge.
const EDGE_SIZE = 56
const MAX_SPEED = 16

/**
 * Auto-scrolls `containerRef` while `active` and the pointer sits near one
 * of its edges — lets a drag-to-select gesture keep extending past the
 * currently visible grid instead of stalling the moment the pointer
 * reaches the edge of the scrollable area.
 *
 * Scrolling can move new cells under an otherwise-stationary cursor, which
 * won't fire their own mouseenter — so after every scroll tick, whichever
 * cell now sits under the pointer (found via its `data-time` attribute) is
 * reported through `onCellHover`, the same callback a real hover would use,
 * so the selection keeps growing in step with the scroll.
 */
export function useAutoScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  onCellHover: (time: Date) => void
) {
  const pointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!active) return

    const handlePointerMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", handlePointerMove)

    // How fast to scroll along one axis: 0 in the "dead zone" away from
    // both edges, ramping up to MAX_SPEED right at the edge itself.
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
      if (container) {
        const rect = container.getBoundingClientRect()
        const { x, y } = pointerRef.current

        const dy = edgeSpeed(y, rect.top, rect.bottom)
        const dx = edgeSpeed(x, rect.left, rect.right)

        if (dy) container.scrollTop += dy
        if (dx) container.scrollLeft += dx

        if (dy || dx) {
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
      window.removeEventListener("mousemove", handlePointerMove)
      cancelAnimationFrame(rafId)
    }
  }, [active, containerRef, onCellHover])
}
