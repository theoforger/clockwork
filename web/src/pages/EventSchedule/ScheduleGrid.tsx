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
  Menu01Icon,
} from "@hugeicons/core-free-icons"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
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
  // The cell the drag is currently extended to — see useDragSelection's
  // return-value comment for why this needs to reach TimeCell directly
  // rather than relying on that cell's own pointerenter, for touch.
  dragEnd: Date | null
  dragRangeLabel: string | null
  onPointerDown: (
    time: Date,
    e: { clientX: number; clientY: number; pointerType: string }
  ) => void
  onPointerEnter: (time: Date) => void
  onHoverSlot: (time: Date | null) => void
  // Mobile-only Browse/Select toggle — see useDragSelection's docstring for
  // why touch needs an explicit mode rather than always dragging.
  touchSelectMode: boolean
  onToggleTouchSelectMode: () => void
  // Opens the mobile attendee sidebar sheet — hidden on md:+ where the
  // sidebar is always visible instead.
  onOpenSidebar: () => void
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
  dragEnd,
  dragRangeLabel,
  onPointerDown,
  onPointerEnter,
  onHoverSlot,
  touchSelectMode,
  onToggleTouchSelectMode,
  onOpenSidebar,
}: ScheduleGridProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Computed once per render rather than per-cell below — every cell needs
  // to compare its own timestamp against this same value to know whether
  // *it* is the drag's current cursor (see the `isDragCursor` prop on
  // TimeCell).
  const dragEndTs = dragEnd ? dragEnd.getTime() : null

  // Lets a drag-to-select gesture keep extending past the visible grid
  // instead of stalling at its edge — see the hook for why this needs to
  // drive `onPointerEnter` itself rather than relying on real hover events.
  useAutoScroll(scrollRef, dragType !== null, onPointerEnter)

  // Touch's equivalent of the above: while actively drag-selecting with a
  // finger, per-cell pointerenter never fires for the cells the finger
  // physically moves over (the browser implicitly captures the pointer to
  // the cell it started on) — so resolve whichever cell now sits under the
  // finger on every move, the same `elementFromPoint` + `data-time` trick
  // useAutoScroll uses for the "scroll moved the grid under a stationary
  // cursor" case. Only wired up in Select mode: in Browse mode the grid's
  // native touch scrolling needs pointermove for itself.
  React.useEffect(() => {
    if (!touchSelectMode || dragType === null) return
    const container = scrollRef.current
    if (!container) return

    const handleTouchExtend = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return
      const cell = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("[data-time]")
      if (cell) onPointerEnter(new Date(Number(cell.dataset.time)))
    }

    container.addEventListener("pointermove", handleTouchExtend)
    return () => container.removeEventListener("pointermove", handleTouchExtend)
  }, [touchSelectMode, dragType, onPointerEnter])

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* A single row, always — never flex-wrap here. With this many
          controls (hamburger, nav, title, info, mode toggles) there's no
          width where wrapping to a second row looks intentional, and
          wrapping was also flaky in practice: it kicked in or not
          depending on how wide the current date-range title happened to
          render. The title (flex-1 min-w-0 truncate, below) is the one
          element that absorbs the slack instead, so the row's total width
          is otherwise fixed and this can never wrap. */}
      <header className="flex items-center gap-2 border-b p-3 md:p-4">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={onOpenSidebar}
          aria-label="Open attendee list"
        >
          <HugeiconsIcon icon={Menu01Icon} size={20} />
        </Button>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="icon" onClick={onPrevWeek}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          </Button>
          <Button variant="outline" size="icon" onClick={onNextWeek}>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
          </Button>
        </div>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold md:flex-initial md:text-lg">
          {format(currentWeekStart, "MMM d")} –{" "}
          {format(weekDays[weekDays.length - 1], "MMM d, yyyy")}
        </h2>
        {/* Hover/focus-triggered, so it has no real affordance on a
            touch-primary device anyway — hidden below md: instead of
            competing with everything else for the title's space. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="hidden shrink-0 cursor-help text-muted-foreground md:inline-flex"
            >
              <HugeiconsIcon icon={InformationCircleIcon} size={16} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-56 text-center">
            Click or drag to select time slots. Press Esc to clear your
            selection.
          </TooltipContent>
        </Tooltip>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant={touchSelectMode ? "default" : "outline"}
            size="sm"
            className="md:hidden"
            onClick={onToggleTouchSelectMode}
          >
            {touchSelectMode ? "Selecting" : "Select"}
          </Button>
          <ModeToggle />
        </div>
      </header>

      {/* Top/left spacing lives on the grid as margins, not container
          padding: `position: sticky` pins to the container's padding edge,
          so padding there would leave a gap the sticky weekday row/hour
          column locks to instead of the true edge, letting scrolling
          content show through. Margins scroll away cleanly instead. Right
          and bottom have no sticky element, so they stay as padding. */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto pr-4 pb-4 select-none"
      >
        <div
          className={cn(
            "mt-4 ml-4 grid min-w-200 grid-cols-[60px_repeat(7,1fr)] gap-px border bg-border",
            // Select mode needs to own every touch move on the grid itself
            // (see the effect above) — disabling native panning here is
            // what stops the browser from treating the gesture as a
            // scroll instead. Only toggled between gestures (from the
            // Browse/Select button), never mid-drag, since browsers don't
            // reliably honor a touch-action change once a touch has
            // already started.
            touchSelectMode && "touch-none"
          )}
        >
          {/* Pinned to both edges of the scroll container it sits in the
              corner of — the intersection of the sticky weekday row below
              and the sticky hour-label column further down, so it needs
              to out-rank both (z-30 vs. their z-20) or one would show
              through it at the corner. */}
          <div className="sticky top-0 left-0 z-30 bg-background p-2" />

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
                  {/* Pinned to the left edge of the scroll container, the
                      same way the weekday row above is pinned to the top
                      — so the hour-of-day label stays readable while
                      scrolling horizontally through the week instead of
                      scrolling out of view with the rest of that row. */}
                  <div className="sticky left-0 z-20 flex h-11 items-center justify-end bg-background pr-2 text-[10px] text-muted-foreground md:h-8">
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
                        onPointerDown={onPointerDown}
                        onPointerEnter={onPointerEnter}
                        onHoverChange={onHoverSlot}
                        dragPreview={inDragRange}
                        dragType={dragType}
                        dragRangeLabel={dragRangeLabel}
                        isDragCursor={dragType !== null && dragEndTs === ts}
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
