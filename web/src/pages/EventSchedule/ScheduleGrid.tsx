import * as React from "react"
import { format, setHours, setMinutes, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { ModeToggle } from "@/components/mode-toggle"
import { formatTime } from "@/lib/date-utils"
import { TimeCell } from "./TimeCell"
import { HOURS, SLOT_DURATION_MINUTES } from "./constants"

// Hour-of-day labels for the left axis (locale-aware). These depend only
// on the fixed HOURS constant, never on props/state, so compute them once
// at module load instead of re-deriving all 24 on every grid render.
const HOUR_LABELS = HOURS.map((hour) =>
  formatTime(setHours(startOfDay(new Date()), hour))
)

export interface ScheduleGridProps {
  weekDays: Date[]
  currentWeekStart: Date
  onPrevWeek: () => void
  onNextWeek: () => void
  isOutsideRange: (time: Date) => boolean
  slotMap: Map<number, number>
  selectedSlots: Set<number>
  totalAttendees: number
  showOverlapOnly: boolean
  isInDragRange: (time: Date) => boolean
  isDragging: boolean
  dragType: "select" | "deselect" | null
  onMouseDown: (time: Date) => void
  onMouseEnter: (time: Date) => void
  onMouseUp: () => void
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
  slotMap,
  selectedSlots,
  totalAttendees,
  showOverlapOnly,
  isInDragRange,
  isDragging,
  dragType,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onHoverSlot,
}: ScheduleGridProps) {
  return (
    <main
      className="flex flex-1 flex-col overflow-hidden"
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
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
        </div>
        <ModeToggle />
      </header>

      <div className="flex-1 overflow-auto p-4 select-none">
        <div className="grid min-w-200 grid-cols-[60px_repeat(7,1fr)] gap-px border bg-border">
          <div className="bg-background p-2" />

          {weekDays.map((day) => (
            <div key={day.toString()} className="bg-background p-2 text-center">
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
                  <div className="flex h-6 items-center justify-end bg-background pr-2 text-[10px] text-muted-foreground">
                    {minute === 0 ? HOUR_LABELS[hour] : ""}
                  </div>

                  {weekDays.map((day) => {
                    const time = setMinutes(
                      setHours(startOfDay(day), hour),
                      minute
                    )

                    const outside = isOutsideRange(time)
                    const ts = time.getTime()
                    const count = slotMap.get(ts) || 0
                    const isSelected = selectedSlots.has(ts)
                    const inDragRange = isInDragRange(time)

                    return (
                      <TimeCell
                        key={ts}
                        time={time}
                        outside={outside}
                        count={count}
                        isSelected={isSelected}
                        totalAttendees={totalAttendees}
                        showOverlapOnly={showOverlapOnly}
                        isDragging={isDragging}
                        onMouseDown={onMouseDown}
                        onMouseEnter={onMouseEnter}
                        onHoverChange={onHoverSlot}
                        dragPreview={inDragRange}
                        dragType={dragType}
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
