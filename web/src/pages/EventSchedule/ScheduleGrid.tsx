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
  // True once there's a locked-in submission (see index.tsx's isLocked) —
  // cells stop responding to pointerdown until Edit is hit.
  selectionLocked: boolean
  isInDragRange: (time: Date) => boolean
  dragType: "select" | "deselect" | null
  // The cell the drag is currently extended to — needs to reach TimeCell
  // directly for touch, which never fires a per-cell pointerenter.
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
  selectionLocked,
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

  // Shared by every TimeCell so one cell's pointerenter can force-release
  // a stuck hover state left behind by another — see TimeCell's own
  // comment for why. A ref, not state: it's only read when a cell claims
  // hover, never needs to drive a render itself.
  const hoveredCellRef = React.useRef<{
    ts: number
    release: () => void
  } | null>(null)

  // Computed once here rather than per-cell — every cell compares its own
  // timestamp against this to know if it's the drag's current cursor.
  const dragEndTs = dragEnd ? dragEnd.getTime() : null

  // Lets a drag-to-select gesture keep extending past the visible grid
  // instead of stalling at its edge — see the hook for why this needs to
  // drive `onPointerEnter` itself rather than relying on real hover events.
  useAutoScroll(scrollRef, dragType !== null, onPointerEnter)

  // Touch's equivalent of the above: a finger dragging across cells never
  // fires their individual pointerenter (the browser implicitly captures
  // the pointer to the cell it started on), so resolve whichever cell is
  // under the finger on every move instead, via the same `elementFromPoint`
  // trick useAutoScroll uses. Only wired up in Select mode — in Browse mode
  // the grid's native touch scrolling needs pointermove for itself.
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
      {/* Never flex-wrap: with this many controls, no width makes a second
          row look intentional, and wrapping was flaky in practice anyway.
          The title (flex-1 min-w-0 truncate, below) absorbs the slack
          instead, so the row's width is otherwise fixed. */}
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
        <Button
          variant={touchSelectMode ? "default" : "outline"}
          size="sm"
          // mr-12 clears the mode toggle, which floats fixed to the
          // viewport's top-right corner (see index.tsx) rather than
          // sitting in this header — without it the two overlap on
          // mobile, where this button would otherwise butt right up
          // against the same corner.
          className="mr-12 shrink-0 md:hidden"
          onClick={onToggleTouchSelectMode}
        >
          {touchSelectMode ? "Selecting" : "Select"}
        </Button>
      </header>

      {/* Top/left spacing is margin, not container padding: `sticky` pins to
          the container's padding edge, so padding there would leave a gap
          the sticky weekday row/hour column locks to, letting content show
          through. Margins scroll away cleanly instead. Right/bottom have no
          sticky element, so they stay padding. */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto pr-4 pb-4 select-none"
      >
        <div
          className={cn(
            "mt-4 ml-4 grid min-w-200 grid-cols-[60px_repeat(7,1fr)] gap-px border bg-border",
            // Select mode owns every touch move itself (see the effect
            // above); disabling native panning is what stops the browser
            // treating it as a scroll instead. Only toggled between
            // gestures — browsers don't reliably honor a touch-action
            // change once a touch has already started.
            touchSelectMode && "touch-none"
          )}
        >
          {/* Sits at the intersection of the sticky weekday row and hour
              column below, so it must out-rank both (z-30 vs. z-20) or one
              would show through at the corner. */}
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
                  {/* Pinned left, like the weekday row is pinned to the
                      top, so the hour label stays readable while scrolling
                      horizontally through the week. */}
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
                        locked={selectionLocked}
                        onPointerDown={onPointerDown}
                        onPointerEnter={onPointerEnter}
                        onHoverChange={onHoverSlot}
                        hoveredCellRef={hoveredCellRef}
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
