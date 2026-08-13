import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addMinutes, isSameDay, startOfDay } from "date-fns"
import { isEditableTarget } from "@/lib/dom"
import { formatTime } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

// How far (in px) a touch pointer can move between its down and up before
// a tap-in-Browse-mode is treated as "the user was scrolling, not
// selecting" and the pending single-cell toggle is discarded. Mouse/pen
// drags never hit this path — see the touchSelectMode check below.
const TOUCH_TAP_MOVE_THRESHOLD = 10

// The start of `day`'s last slot (23:30, for the grid's fixed 30-minute
// slots) — the far edge a drag can reach without crossing into the next
// day. See clampToDay below.
function lastSlotOf(day: Date): Date {
  return addMinutes(startOfDay(day), 24 * 60 - SLOT_DURATION_MINUTES)
}

// Pins `time` to whichever edge of `day` it overshot — the grid's columns
// are days, and a drag is meant to select a span *within* one, not sweep
// across several just because the pointer crossed a column boundary.
function clampToDay(day: Date, time: Date): Date {
  return time.getTime() > day.getTime() ? lastSlotOf(day) : startOfDay(day)
}

/**
 * Manages the set of selected time slots and the click-and-drag
 * select/deselect interaction used to build that set.
 *
 * `touchSelectMode` distinguishes the two ways a touch pointer can start a
 * gesture on the grid (see ScheduleGrid's Browse/Select toggle): in Browse
 * mode the grid still scrolls natively, so a touch "drag" is ambiguous
 * until release — only a in-place tap should commit a selection, not a
 * swipe that happened to start on a cell. In Select mode the grid disables
 * native panning (`touch-action: none`), so every touch movement is a real
 * drag-select gesture and no threshold applies. Mouse/pen pointers ignore
 * this distinction entirely, matching the app's original desktop behavior.
 */
export function useDragSelection(
  isOutsideRange: (time: Date) => boolean,
  touchSelectMode: boolean
) {
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set())

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Date | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)
  const [dragType, setDragType] = useState<"select" | "deselect" | null>(null)

  // `handlePointerEnter` fires once per cell the pointer crosses, which can
  // happen many times within a single animation frame during a fast drag —
  // and since the range below is a flat timestamp comparison (it can span
  // most of a day, now that it's clamped to one — see clampToDay), each
  // update can flip dragPreview for a large slice of the grid at once.
  // Coalesce updates to at most one per frame via a ref + rAF, so React
  // only re-renders once per paint instead of once per raw pointer event.
  const rafRef = useRef<number | null>(null)
  const pendingDragEndRef = useRef<Date | null>(null)

  // Where the current gesture started/last was, in viewport coordinates —
  // only used to tell a touch tap from a touch scroll in Browse mode (see
  // TOUCH_TAP_MOVE_THRESHOLD above). Mouse/pen gestures never read these.
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null)
  const activePointerTypeRef = useRef<string>("mouse")

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

  const handlePointerDown = useCallback(
    (time: Date, e: { clientX: number; clientY: number; pointerType: string }) => {
      if (isOutsideRange(time)) return

      // Starting a fresh drag — drop anything left over from a previous one.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingDragEndRef.current = null
      dragStartPosRef.current = { x: e.clientX, y: e.clientY }
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY }
      activePointerTypeRef.current = e.pointerType

      const key = time.getTime()
      const isSelected = selectedSlots.has(key)

      setIsDragging(true)
      setDragStart(time)
      setDragEnd(time)
      setDragType(isSelected ? "deselect" : "select")
    },
    [selectedSlots, isOutsideRange]
  )

  const handlePointerEnter = useCallback(
    (time: Date) => {
      if (!isDragging || !dragStart) return
      if (isOutsideRange(time)) return

      // Locked to the day the drag started on — entering a different
      // day's column clamps to that day's first/last slot instead of
      // extending the selection into it. Applies uniformly regardless of
      // *why* this cell was entered (a real pointerenter, auto-scroll, or
      // touch's own extension path — see useAutoScroll and ScheduleGrid,
      // both of which funnel through this same function), so there's one
      // place enforcing it rather than three.
      const clamped = isSameDay(time, dragStart)
        ? time
        : clampToDay(dragStart, time)
      if (isOutsideRange(clamped)) return

      pendingDragEndRef.current = clamped
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

  const handlePointerUp = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // The throttled state may be a frame behind — use whatever cell was
    // actually hovered last, so the committed selection matches the
    // pointer's real final position.
    const effectiveDragEnd = pendingDragEndRef.current ?? dragEnd
    pendingDragEndRef.current = null

    // A touch gesture that started on a cell but moved past the threshold
    // while the grid was in Browse mode was the user scrolling, not
    // selecting — discard it rather than toggling the cell it began on.
    const isTouchInBrowseMode =
      activePointerTypeRef.current === "touch" && !touchSelectMode
    if (isTouchInBrowseMode && dragStartPosRef.current && lastPointerPosRef.current) {
      const dx = lastPointerPosRef.current.x - dragStartPosRef.current.x
      const dy = lastPointerPosRef.current.y - dragStartPosRef.current.y
      if (Math.hypot(dx, dy) > TOUCH_TAP_MOVE_THRESHOLD) {
        dragStartPosRef.current = null
        setIsDragging(false)
        setDragStart(null)
        setDragEnd(null)
        setDragType(null)
        return
      }
    }
    dragStartPosRef.current = null

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
  }, [dragStart, dragEnd, dragType, touchSelectMode])

  // Tracked on `window` (not the grid element) so the drag ends reliably no
  // matter where the pointer is by then, instead of canceling as soon as it
  // leaves the grid — which made fast/far drags feel interrupted. Also
  // treats a pointermove with no button/contact held as an implicit release,
  // to catch releases outside the browser window (no pointerup fires there).
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalPointerEvent = (e: PointerEvent) => {
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY }
      if (e.type === "pointermove" && (e.buttons & 1) === 1) return
      handlePointerUp()
    }

    window.addEventListener("pointerup", handleGlobalPointerEvent)
    window.addEventListener("pointercancel", handleGlobalPointerEvent)
    window.addEventListener("pointermove", handleGlobalPointerEvent)
    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerEvent)
      window.removeEventListener("pointercancel", handleGlobalPointerEvent)
      window.removeEventListener("pointermove", handleGlobalPointerEvent)
    }
  }, [isDragging, handlePointerUp])

  return {
    selectedSlots,
    setSelectedSlots,
    dragType,
    // The cell the drag is currently extended to — exposed so a cell can
    // tell whether *it* is that one, and show the range tooltip there.
    // Mouse/pen already get this for free from their own real pointerenter
    // (see TimeCell's isHovered), but touch never fires that per-cell
    // event during a drag (see the docstring above), so it needs this
    // instead to know when it's the one that should be showing the label.
    dragEnd,
    isInDragRange,
    dragRangeLabel,
    handlePointerDown,
    handlePointerEnter,
  }
}
