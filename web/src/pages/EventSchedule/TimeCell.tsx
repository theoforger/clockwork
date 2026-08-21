import * as React from "react"
import { addMinutes } from "date-fns"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

export interface TimeCellProps {
  time: Date
  outside: boolean
  // Each available attendee's emoji — its length also doubles as the count.
  emojis: string[]
  isSelected: boolean
  // True once this browser has a locked-in submission (see index.tsx's
  // isLocked): pointerdown and the hover-to-select affordance are both
  // disabled, so browsing can't accidentally start a new selection.
  locked: boolean
  onPointerDown: (
    time: Date,
    e: { clientX: number; clientY: number; pointerType: string }
  ) => void
  onPointerEnter: (time: Date) => void
  onHoverChange: (time: Date | null) => void
  // Ref (shared across the whole grid) tracking whichever cell most
  // recently claimed "hovered" — lets a new claim force-release the
  // previous one. See the onPointerEnter handler below.
  hoveredCellRef: React.RefObject<{ ts: number; release: () => void } | null>
  dragPreview: boolean
  dragType: "select" | "deselect" | null
  // Whole in-progress drag selection's span, shown instead of this cell's
  // own 30-minute label while a drag is active.
  dragRangeLabel: string | null
  // Whether *this* cell is the drag's current cursor. Mouse/pen get the
  // tooltip from isHovered instead; touch never fires per-cell
  // pointerenter during a drag, so this covers that case.
  isDragCursor: boolean
}

export const TimeCell = React.memo(function TimeCell({
  time,
  outside,
  emojis,
  isSelected,
  locked,
  onPointerDown,
  onPointerEnter,
  onHoverChange,
  hoveredCellRef,
  dragPreview,
  dragType,
  dragRangeLabel,
  isDragCursor,
}: TimeCellProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  // A cell being dragged over to *deselect* is still technically selected
  // until the drag commits, but should read red, not blue.
  const isPendingDeselect = dragPreview && dragType === "deselect"
  const isPendingSelect = dragPreview && dragType === "select"
  const showSelected = isPendingSelect || (isSelected && !isPendingDeselect)

  const hasSubmissions = emojis.length > 0

  // Keyed on the timestamp, not `time` itself, since the grid hands us a
  // new Date every render even though a cell's own moment never changes.
  const timeMs = time.getTime()
  const cellLabel = React.useMemo(() => {
    const start = new Date(timeMs)
    const end = addMinutes(start, SLOT_DURATION_MINUTES)
    return `${formatTime(start)} – ${formatTime(end)}`
  }, [timeMs])

  // Show the whole drag's span instead of this cell's own slot while one's
  // in progress — dragRangeLabel is only non-null then.
  const label = dragRangeLabel ?? cellLabel

  const clearHover = () => {
    setIsHovered(false)
    onHoverChange(null)
    // Only release the shared claim if it's still ours — a newer cell may
    // have already stolen it (see onPointerEnter below).
    if (hoveredCellRef.current?.ts === timeMs) {
      hoveredCellRef.current = null
    }
  }

  return (
    <div
      // Read by useAutoScroll (and ScheduleGrid's touch drag-extension
      // listener) to find whichever cell is under the pointer after a
      // scroll or touch move that didn't fire this cell's own pointerenter.
      data-time={timeMs}
      className={cn(
        "relative h-11 bg-background transition-colors md:h-8",
        outside && "cursor-not-allowed bg-muted/50",
        !outside && "z-10",
        // Dropped while locked, so a browsing pointer over an
        // already-submitted grid doesn't look interactive when it isn't.
        !outside &&
          !locked &&
          "cursor-pointer hover:ring-1 hover:ring-primary/30",
        // Flat, opaque base for "someone's submitted here" regardless of
        // count (the emoji row already shows exactly who). Kept as its own
        // layer rather than one shared background-color so the
        // selection/drag overlay below can stay translucent on top of it.
        !outside && hasSubmissions && "bg-primary"
      )}
      onPointerDown={(e) => {
        if (locked) return
        onPointerDown(time, {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType: e.pointerType,
        })
      }}
      onPointerEnter={(e) => {
        onPointerEnter(time)
        // Keep tracking hover through a drag too, so the tooltip/sidebar
        // highlight follows the cursor instead of freezing at the drag's
        // origin. Touch has no meaningful "hover" outside a drag, so skip
        // it there — it'd just flicker on/off around each tap.
        if (!outside && e.pointerType !== "touch") {
          // A fast drag can occasionally skip a cell's own pointerleave
          // (coalesced pointer samples), stranding its tooltip forever.
          // Self-heal by force-releasing whoever last claimed hover
          // before claiming it here — the stuck tooltip clears itself on
          // the next hover anywhere, not just a re-hover of that cell.
          if (hoveredCellRef.current && hoveredCellRef.current.ts !== timeMs) {
            hoveredCellRef.current.release()
          }
          hoveredCellRef.current = {
            ts: timeMs,
            release: () => setIsHovered(false),
          }
          setIsHovered(true)
          onHoverChange(time)
        }
      }}
      onPointerLeave={clearHover}
    >
      {/* Translucent overlay stacked over the base background so it stays
          see-through over a submitted (green) cell. Blue covers both a
          committed-but-unsubmitted selection and a live drag preview —
          they read identically until pointerup commits one. */}
      {!outside && showSelected && (
        <div className="absolute inset-0 bg-info/40 ring-2 ring-info ring-inset" />
      )}
      {!outside && isPendingDeselect && (
        <div className="absolute inset-0 bg-destructive/40 ring-2 ring-destructive ring-inset" />
      )}

      {!outside && hasSubmissions && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-0.5 overflow-hidden px-0.5">
          {emojis.map((emoji, i) => (
            <span
              key={i}
              className="text-xs leading-none text-primary-foreground"
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {!outside && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-center text-xs font-medium whitespace-nowrap text-background shadow-md transition-all duration-150",
            // isHovered covers mouse/pen (a real pointerenter fires on
            // every cell they cross); isDragCursor covers touch, which
            // doesn't fire that per-cell during a drag — see its prop doc.
            isHovered || isDragCursor
              ? "translate-y-0 opacity-100"
              : "translate-y-1 opacity-0"
          )}
        >
          {label}
        </div>
      )}
    </div>
  )
})
