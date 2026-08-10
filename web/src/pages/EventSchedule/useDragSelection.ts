import { useCallback, useEffect, useRef, useState } from "react"
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

      const target = e.target as HTMLElement
      const tag = target.tagName.toLowerCase()
      const isTyping =
        tag === "input" || tag === "textarea" || target.isContentEditable
      if (isTyping) return

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

  return {
    selectedSlots,
    setSelectedSlots,
    dragType,
    isDragging,
    isInDragRange,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  }
}
