import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addMinutes } from "date-fns"
import { isEditableTarget } from "@/lib/dom"
import { formatTime } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

/**
 * Manages the set of selected time slots and the click-and-drag
 * select/deselect interaction used to build that set.
 */
export function useDragSelection(isOutsideRange: (time: Date) => boolean) {
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set())

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Date | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)
  const [dragType, setDragType] = useState<"select" | "deselect" | null>(null)

  // `handleMouseEnter` fires once per cell the pointer crosses, which can
  // happen many times within a single animation frame during a fast drag —
  // and since the range below is a flat timestamp comparison (it can span
  // whole days), each update can flip dragPreview for a large slice of the
  // grid at once. Coalesce updates to at most one per frame via a ref +
  // rAF, so React only re-renders once per paint instead of once per raw
  // pointer event.
  const rafRef = useRef<number | null>(null)
  const pendingDragEndRef = useRef<Date | null>(null)

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Clear selection/drag state on Escape, unless the user is typing.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (isEditableTarget(e.target)) return

      setSelectedSlots(new Set())
      setIsDragging(false)
      setDragStart(null)
      setDragType(null)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const isInDragRange = useCallback(
    (time: Date) => {
      if (!isDragging || !dragStart || !dragEnd) return false

      const t = time.getTime()
      const start = Math.min(dragStart.getTime(), dragEnd.getTime())
      const end = Math.max(dragStart.getTime(), dragEnd.getTime())

      return t >= start && t <= end
    },
    [isDragging, dragStart, dragEnd]
  )

  // Label for the whole in-progress selection (dragStart..dragEnd), so a
  // cell's tooltip can show the span being dragged rather than just its own
  // 30-minute slot while a drag is in progress.
  const dragRangeLabel = useMemo(() => {
    if (!isDragging || !dragStart || !dragEnd) return null

    const start = Math.min(dragStart.getTime(), dragEnd.getTime())
    const end = Math.max(dragStart.getTime(), dragEnd.getTime())

    return `${formatTime(new Date(start))} – ${formatTime(addMinutes(new Date(end), SLOT_DURATION_MINUTES))}`
  }, [isDragging, dragStart, dragEnd])

  const handleMouseDown = useCallback(
    (time: Date) => {
      if (isOutsideRange(time)) return

      // Starting a fresh drag — drop anything left over from a previous one.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingDragEndRef.current = null

      const key = time.getTime()
      const isSelected = selectedSlots.has(key)

      setIsDragging(true)
      setDragStart(time)
      setDragEnd(time)
      setDragType(isSelected ? "deselect" : "select")
    },
    [selectedSlots, isOutsideRange]
  )

  const handleMouseEnter = useCallback(
    (time: Date) => {
      if (!isDragging || !dragStart) return
      if (isOutsideRange(time)) return

      pendingDragEndRef.current = time
      if (rafRef.current !== null) return // already scheduled this frame

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (pendingDragEndRef.current) {
          setDragEnd(pendingDragEndRef.current)
          pendingDragEndRef.current = null
        }
      })
    },
    [isDragging, dragStart, isOutsideRange]
  )

  const handleMouseUp = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // The throttled state may be a frame behind — use whatever cell was
    // actually hovered last, so the committed selection matches the
    // pointer's real final position.
    const effectiveDragEnd = pendingDragEndRef.current ?? dragEnd
    pendingDragEndRef.current = null

    if (!dragStart || !effectiveDragEnd || !dragType) {
      setIsDragging(false)
      return
    }

    const start = Math.min(dragStart.getTime(), effectiveDragEnd.getTime())
    const end = Math.max(dragStart.getTime(), effectiveDragEnd.getTime())

    setSelectedSlots((prev) => {
      const next = new Set(prev)

      for (let t = start; t <= end; t += SLOT_DURATION_MINUTES * 60 * 1000) {
        if (dragType === "select") next.add(t)
        else next.delete(t)
      }

      return next
    })

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    setDragType(null)
  }, [dragStart, dragEnd, dragType])

  // End the drag on the button actually being released, tracked on
  // `window` rather than any one element — so it reliably ends no matter
  // where the pointer is by then (over the sidebar, past the edge of the
  // grid, anywhere in the window), instead of the previous approach of
  // canceling as soon as the pointer *left* the grid area, which is what
  // made a fast/far drag feel like it got interrupted.
  //
  // If the button is released outside the browser window entirely, no
  // mouseup ever reaches us — so this also treats any mousemove that
  // shows the primary button no longer held as an implicit release.
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalPointerEvent = (e: MouseEvent) => {
      if (e.type === "mousemove" && (e.buttons & 1) === 1) return
      handleMouseUp()
    }

    window.addEventListener("mouseup", handleGlobalPointerEvent)
    window.addEventListener("mousemove", handleGlobalPointerEvent)
    return () => {
      window.removeEventListener("mouseup", handleGlobalPointerEvent)
      window.removeEventListener("mousemove", handleGlobalPointerEvent)
    }
  }, [isDragging, handleMouseUp])

  return {
    selectedSlots,
    setSelectedSlots,
    dragType,
    isInDragRange,
    dragRangeLabel,
    handleMouseDown,
    handleMouseEnter,
  }
}
