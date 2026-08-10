import * as React from "react"
import { format, setHours, setMinutes, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { TimeCell } from "./TimeCell"
import { HOURS, SLOT_DURATION_MINUTES } from "./constants"

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
  dragType: "select" | "deselect" | null
  onMouseDown: (time: Date) => void
  onMouseEnter: (time: Date) => void
  onMouseUp: () => void
}

export function ScheduleGrid({
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
  dragType,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: ScheduleGridProps) {
  return (
    <main
      className="flex flex-1 flex-col overflow-hidden"
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {format(currentWeekStart, "MMM d")} –{" "}
            {format(weekDays[weekDays.length - 1], "MMM d, yyyy")}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={onPrevWeek}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
            </Button>
            <Button variant="outline" size="icon" onClick={onNextWeek}>
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
            </Button>
          </div>
        </div>
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
                  <div className="self-center bg-background pr-2 text-right text-[10px] text-muted-foreground">
                    {minute === 0 ? `${hour}:00` : ""}
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
                        onMouseDown={onMouseDown}
                        onMouseEnter={onMouseEnter}
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
}
