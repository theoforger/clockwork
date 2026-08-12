import * as React from "react"
import { format, setHours, setMinutes, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { ModeToggle } from "@/components/mode-toggle"
import { formatTime } from "@/lib/date-utils"
import { TimeCell } from "./TimeCell"
import { useAutoScroll } from "./useAutoScroll"
import { HOURS, SLOT_DURATION_MINUTES } from "./constants"

// Hour-of-day labels for the left axis (locale-aware). These depend only
// on the fixed HOURS constant, never on props/state, so compute them once
// at module load instead of re-deriving all 24 on every grid render.
const HOUR_LABELS = HOURS.map((hour) =>
  formatTime(setHours(startOfDay(new Date()), hour))
)

// Stable empty array so cells with nobody selected get the same reference
// on every render instead of a fresh `[]` — avoids handing TimeCell (a
// memoized component) a new prop identity for a slot that hasn't changed.
const EMPTY_EMOJIS: string[] = []

export interface ScheduleGridProps {
  weekDays: Date[]
  currentWeekStart: Date
  onPrevWeek: () => void
  onNextWeek: () => void
  isOutsideRange: (time: Date) => boolean
  slotEmojis: Map<number, string[]>
  selectedSlots: Set<number>
  isInDragRange: (time: Date) => boolean
  dragType: "select" | "deselect" | null
  dragRangeLabel: string | null
  onMouseDown: (time: Date) => void
  onMouseEnter: (time: Date) => void
  onHoverSlot: (time: Date | null) => void
}

// Memoized so unrelated state changes elsewhere in the page (e.g. sidebar
// hover state) don't force all 336 grid cells through a render pass.
export const ScheduleGrid = React.memo(function ScheduleGrid({
  weekDays,
  currentWeekStart,
  onPrevWeek,
  onNextWeek,
  isOutsideRange,
  slotEmojis,
  selectedSlots,
  isInDragRange,
  dragType,
  dragRangeLabel,
  onMouseDown,
  onMouseEnter,
  onHoverSlot,
}: ScheduleGridProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Lets a drag-to-select gesture keep extending past the visible grid
  // instead of stalling at its edge — see the hook for why this needs to
  // drive `onMouseEnter` itself rather than relying on real hover events.
  useAutoScroll(scrollRef, dragType !== null, onMouseEnter)

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={onPrevWeek}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
            </Button>
            <Button variant="outline" size="icon" onClick={onNextWeek}>
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">
            {format(currentWeekStart, "MMM d")} –{" "}
            {format(weekDays[weekDays.length - 1], "MMM d, yyyy")}
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="cursor-help text-muted-foreground">
                <HugeiconsIcon icon={InformationCircleIcon} size={16} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-56 text-center">
              Click or drag to select time slots. Press Esc to clear your
              selection.
            </TooltipContent>
          </Tooltip>
        </div>
        <ModeToggle />
      </header>

      {/* Top padding lives on the grid itself (as a margin) rather than on
          this scroll container: `position: sticky` pins relative to the
          container's own padding edge, so a top padding here would leave a
          gap between the container's true top and where the sticky weekday
          row actually locks — a gap the grid's own (non-sticky, scrolling)
          rows would show through once scrolled past it. A margin on the
          grid instead scrolls away cleanly, since there's no grid content
          inside it to bleed through. */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-4 pb-4 select-none"
      >
        <div className="mt-4 grid min-w-200 grid-cols-[60px_repeat(7,1fr)] gap-px border bg-border">
          {/* Pinned to the top of the scroll container (not the page) so
              the weekday row stays visible while scrolling through the
              hour rows below — still the grid's own first row, so column
              alignment and horizontal scroll stay in sync for free. */}
          <div className="sticky top-0 z-20 bg-background p-2" />

          {weekDays.map((day) => (
            <div
              key={day.toString()}
              className="sticky top-0 z-20 bg-background p-2 text-center"
            >
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {format(day, "eee")}
              </div>
              <div className="text-lg font-bold">{format(day, "d")}</div>
            </div>
          ))}

          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              {[0, SLOT_DURATION_MINUTES].map((minute) => (
                <React.Fragment key={`${hour}:${minute}`}>
                  <div className="flex h-8 items-center justify-end bg-background pr-2 text-[10px] text-muted-foreground">
                    {minute === 0 ? HOUR_LABELS[hour] : ""}
                  </div>

                  {weekDays.map((day) => {
                    const time = setMinutes(
                      setHours(startOfDay(day), hour),
                      minute
                    )

                    const outside = isOutsideRange(time)
                    const ts = time.getTime()
                    const emojis = slotEmojis.get(ts) ?? EMPTY_EMOJIS
                    const isSelected = selectedSlots.has(ts)
                    const inDragRange = isInDragRange(time)

                    return (
                      <TimeCell
                        key={ts}
                        time={time}
                        outside={outside}
                        emojis={emojis}
                        isSelected={isSelected}
                        onMouseDown={onMouseDown}
                        onMouseEnter={onMouseEnter}
                        onHoverChange={onHoverSlot}
                        dragPreview={inDragRange}
                        dragType={dragType}
                        dragRangeLabel={dragRangeLabel}
                      />
                    )
                  })}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </main>
  )
})
