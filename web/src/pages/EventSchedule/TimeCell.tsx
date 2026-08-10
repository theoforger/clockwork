import * as React from "react"
import { addMinutes } from "date-fns"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

export interface TimeCellProps {
  time: Date
  outside: boolean
  count: number
  isSelected: boolean
  totalAttendees: number
  showOverlapOnly: boolean
  isDragging: boolean
  onMouseDown: (time: Date) => void
  onMouseEnter: (time: Date) => void
  onHoverChange: (time: Date | null) => void
  dragPreview: boolean
  dragType: "select" | "deselect" | null
}

export const TimeCell = React.memo(function TimeCell({
  time,
  outside,
  count,
  isSelected,
  totalAttendees,
  showOverlapOnly,
  isDragging,
  onMouseDown,
  onMouseEnter,
  onHoverChange,
  dragPreview,
  dragType,
}: TimeCellProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  // While a cell is mid-drag it's still technically in its pre-drag state
  // (selected or not — the drag hasn't committed yet), so both of these
  // suppress the "normal" styling that would otherwise fight the preview
  // for the same background: the selected ring lingering under a deselect
  // preview, and the submitted-availability wash swallowing a select
  // preview entirely (they're both `bg-primary`, and without this the wash
  // would win the class merge and hide the preview until mouseup).
  const isPendingSelect = dragPreview && dragType === "select"
  const isPendingDeselect = dragPreview && dragType === "deselect"
  const isPending = isPendingSelect || isPendingDeselect

  // Cells re-render on every drag frame their own selection state touches,
  // not just when hovered, so this can't just be a plain computation — but
  // a given cell's `time` value never actually changes across its own
  // lifetime (only its object identity does, since the grid recreates it
  // every render). Keying on the timestamp lets this compute once per cell
  // ever, rather than on every one of those renders.
  const label = React.useMemo(
    () =>
      `${formatTime(time)} – ${formatTime(addMinutes(time, SLOT_DURATION_MINUTES))}`,
    [time.getTime()]
  )

  const clearHover = () => {
    setIsHovered(false)
    onHoverChange(null)
  }

  return (
    <div
      className={cn(
        "relative h-6 bg-background transition-colors",
        outside && "cursor-not-allowed bg-muted/50",
        !outside && "z-10 cursor-pointer hover:ring-1 hover:ring-primary/30",
        // FINAL selection: solid fill + a bold inset ring, so it always
        // reads as "chosen" instead of blending into the heatmap wash below.
        // (inset, not offset — cells are packed edge-to-edge in a gap-px
        // grid, so an offset ring would spill into neighboring cells.)
        !outside &&
          isSelected &&
          !isPendingDeselect &&
          "bg-primary ring-2 ring-inset ring-primary",
        // GHOST preview: a lighter version of the same solid+ring look, so
        // it stays visible over a cell's existing heatmap wash instead of
        // just adding a faint tint on top of it.
        !outside &&
          isPendingSelect &&
          "bg-primary/40 ring-1 ring-inset ring-primary/50",
        !outside && isPendingDeselect && "bg-destructive/30",
        !outside &&
          !isSelected &&
          !isPending &&
          count > 0 &&
          !showOverlapOnly &&
          "bg-primary"
      )}
      style={{
        opacity:
          !outside && !isSelected && !isPending && count > 0 && !showOverlapOnly
            ? // Capped well below solid so the submitted-availability wash
              // never approaches the fully-saturated look reserved for a
              // cell you've actually selected.
              Math.min(0.55, Math.max(0.15, count / totalAttendees))
            : 1,
      }}
      onMouseDown={() => {
        onMouseDown(time)
        // A drag is starting — hide the label/sidebar highlight right away
        // rather than letting them linger on the origin cell mid-drag.
        clearHover()
      }}
      onMouseEnter={() => {
        onMouseEnter(time)
        // Don't surface hover state while dragging — it would flicker a
        // new label/highlight for every cell the drag sweeps over.
        if (!outside && !isDragging) {
          setIsHovered(true)
          onHoverChange(time)
        }
      }}
      onMouseLeave={clearHover}
    >
      {!outside && count > 1 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary-foreground">
            {count}
          </span>
        </div>
      )}

      {!outside && showOverlapOnly && totalAttendees > 0 && count > 1 && (
        <div className="absolute inset-0 z-0 bg-primary" />
      )}

      {!outside && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-center text-[10px] font-medium whitespace-nowrap text-background shadow-md transition-all duration-150",
            isHovered && !isDragging
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
