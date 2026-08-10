import { useCallback, useEffect, useState } from "react"
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

      setDragEnd(time)
    },
    [isDragging, dragStart, isOutsideRange]
  )

  const handleMouseUp = useCallback(() => {
    if (!dragStart || !dragEnd || !dragType) {
      setIsDragging(false)
      return
    }

    const start = Math.min(dragStart.getTime(), dragEnd.getTime())
    const end = Math.max(dragStart.getTime(), dragEnd.getTime())

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
    isInDragRange,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  }
}
