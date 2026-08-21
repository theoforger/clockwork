import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  addMinutes,
  isSameDay,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns"
import { isEditableTarget } from "@/lib/dom"
import { formatTime } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

// How far (in px) a touch pointer can move between down and up before a
// tap-in-Browse-mode counts as scrolling rather than selecting, discarding
// the pending single-cell toggle. Mouse/pen never hit this path.
const TOUCH_TAP_MOVE_THRESHOLD = 10

// Pins `time` onto `day`'s column while keeping its own row (time-of-day)
// — the grid's columns are days, and a drag is meant to select a span
// *within* one, so crossing into an adjacent day's column should extend
// the selection to whichever row the cursor is level with there, not
// jump to that day's very first/last slot regardless of how far up or
// down the cursor actually is.
function clampToDay(day: Date, time: Date): Date {
  return setMinutes(
    setHours(startOfDay(day), time.getHours()),
    time.getMinutes()
  )
}

/**
 * Manages the set of selected time slots and the click-and-drag
 * select/deselect interaction used to build that set.
 *
 * `touchSelectMode` distinguishes the two ways a touch gesture can start
 * (see ScheduleGrid's Browse/Select toggle): in Browse mode the grid still
 * scrolls natively, so a touch "drag" is ambiguous until release — only an
 * in-place tap should commit a selection, not a swipe that started on a
 * cell. In Select mode native panning is disabled, so every touch move is
 * a real drag-select gesture and no threshold applies. Mouse/pen ignore
 * this distinction entirely.
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

  // `handlePointerEnter` can fire many times within a single animation
  // frame during a fast drag, and each update can flip dragPreview for a
  // large slice of the grid (it's clamped to one day — see clampToDay).
  // Coalesce to at most one update per frame via a ref + rAF, so React
  // re-renders once per paint instead of once per raw pointer event.
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
    (
      time: Date,
      e: { clientX: number; clientY: number; pointerType: string }
    ) => {
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
      // day's column clamps to the same row there instead (see
      // clampToDay). Applies regardless of *why* this cell was entered (a
      // real pointerenter, auto-scroll, or touch's extension path all
      // funnel through this one function), so it's enforced in one place.
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
    if (
      isTouchInBrowseMode &&
      dragStartPosRef.current &&
      lastPointerPosRef.current
    ) {
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

  // Tracked on `window`, not the grid element, so the drag ends reliably
  // wherever the pointer is instead of canceling as soon as it leaves the
  // grid. Also treats a buttonless pointermove as an implicit release, to
  // catch releases outside the browser window (no pointerup fires there).
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
    // The cell the drag is currently extended to — lets a cell tell
    // whether it's the one that should show the range tooltip. Mouse/pen
    // get this for free from their own pointerenter (TimeCell's
    // isHovered); touch doesn't fire that per-cell during a drag, so it
    // needs this instead.
    dragEnd,
    isInDragRange,
    dragRangeLabel,
    handlePointerDown,
    handlePointerEnter,
  }
}
