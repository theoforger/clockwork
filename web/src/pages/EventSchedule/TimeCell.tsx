import * as React from "react"
import { addMinutes } from "date-fns"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

export interface TimeCellProps {
  time: Date
  outside: boolean
  // Display glyph (emoji, or a name-initial fallback) of each selected
  // attendee available in this slot. Also stands in for the attendee
  // count — its length is that count.
  emojis: string[]
  isSelected: boolean
  onPointerDown: (
    time: Date,
    e: { clientX: number; clientY: number; pointerType: string }
  ) => void
  onPointerEnter: (time: Date) => void
  onHoverChange: (time: Date | null) => void
  dragPreview: boolean
  dragType: "select" | "deselect" | null
  // Label for the whole in-progress drag selection, shown instead of this
  // cell's own 30-minute label while a drag is active.
  dragRangeLabel: string | null
  // Whether *this* cell is the one the drag is currently extended to.
  // Mouse/pen already show the tooltip via isHovered (a real pointerenter
  // fires on every cell they cross), but touch never fires that per-cell
  // during a drag — this is what shows it there instead.
  isDragCursor: boolean
}

export const TimeCell = React.memo(function TimeCell({
  time,
  outside,
  emojis,
  isSelected,
  onPointerDown,
  onPointerEnter,
  onHoverChange,
  dragPreview,
  dragType,
  dragRangeLabel,
  isDragCursor,
}: TimeCellProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  // While a cell is mid-drag it's still technically in its pre-drag state
  // (selected or not — the drag hasn't committed yet), so both of these
  // suppress the "normal" styling that would otherwise fight the preview
  // for the same background: the selected ring lingering under a deselect
  // preview, and the submitted-availability wash swallowing a select
  // preview entirely (both set `background-color`, and since the wash's
  // class comes later in the list below, tailwind-merge would let it win
  // and hide the preview until pointerup without this).
  const isPendingSelect = dragPreview && dragType === "select"
  const isPendingDeselect = dragPreview && dragType === "deselect"
  const isPending = isPendingSelect || isPendingDeselect

  const count = emojis.length

  // Keyed on the timestamp rather than `time` itself: the grid passes a new
  // Date object every render, but a given cell's moment in time never
  // actually changes, so this only needs to recompute once per cell.
  const timeMs = time.getTime()
  const cellLabel = React.useMemo(() => {
    const start = new Date(timeMs)
    const end = addMinutes(start, SLOT_DURATION_MINUTES)
    return `${formatTime(start)} – ${formatTime(end)}`
  }, [timeMs])

  // While a drag is in progress, show the whole selection's span instead of
  // just this cell's own slot — dragRangeLabel is only non-null then.
  const label = dragRangeLabel ?? cellLabel

  const clearHover = () => {
    setIsHovered(false)
    onHoverChange(null)
  }

  return (
    <div
      // Read by useAutoScroll (and the touch drag-extension listener in
      // ScheduleGrid) to find whichever cell is under the pointer after a
      // scroll or a touch move that didn't fire this cell's own
      // pointerenter, so the drag selection keeps extending to match.
      data-time={timeMs}
      className={cn(
        "relative h-11 bg-background transition-colors md:h-8",
        outside && "cursor-not-allowed bg-muted/50",
        !outside && "z-10 cursor-pointer hover:ring-1 hover:ring-primary/30",
        // FINAL selection: solid fill + a bold inset ring, so it always
        // reads as "chosen" instead of blending into the availability wash
        // below. (inset, not offset — cells are packed edge-to-edge in a
        // gap-px grid, so an offset ring would spill into neighboring cells.)
        !outside &&
          isSelected &&
          !isPendingDeselect &&
          "bg-primary ring-2 ring-primary ring-inset",
        // GHOST preview: a lighter version of the same solid+ring look, but
        // in blue rather than primary green — the dragging-to-select state
        // isn't committed yet, so it reads as visually distinct from an
        // actual (green) selection until pointerup.
        !outside &&
          isPendingSelect &&
          "bg-info/40 ring-1 ring-info/50 ring-inset",
        !outside && isPendingDeselect && "bg-destructive/30",
        // Flat wash for "someone (selected) is available here" — every
        // slot with at least one attendee gets the same shade regardless
        // of how many, since the emoji row below already shows exactly who.
        !outside && !isSelected && !isPending && count > 0 && "bg-primary/40"
      )}
      onPointerDown={(e) =>
        onPointerDown(time, {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType: e.pointerType,
        })
      }
      onPointerEnter={(e) => {
        onPointerEnter(time)
        // Keep tracking hover through a drag too, so the tooltip/sidebar
        // highlight follows the cursor and keeps showing whichever slot
        // it's currently over instead of freezing on the drag's origin.
        // Touch pointers don't have a meaningful "hover" outside a drag
        // (there's no cursor resting on the cell beforehand), so skip it
        // for those — it would just flicker on/off around each tap.
        if (!outside && e.pointerType !== "touch") {
          setIsHovered(true)
          onHoverChange(time)
        }
      }}
      onPointerLeave={clearHover}
    >
      {!outside && count > 0 && (
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
