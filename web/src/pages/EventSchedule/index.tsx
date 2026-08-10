import { useCallback, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import {
  addWeeks,
  eachDayOfInterval,
  addDays,
  addMinutes,
  isBefore,
  isAfter,
} from "date-fns"
import { submitTimeSlots } from "@/api/events"
import { parseAPIDate, formatAPIDate } from "@/lib/date-utils"
import { toast } from "sonner"
import { AttendeeSidebar } from "./AttendeeSidebar"
import { ScheduleGrid } from "./ScheduleGrid"
import { useEventData } from "./useEventData"
import { useSlotAggregation } from "./useSlotAggregation"
import { useDragSelection } from "./useDragSelection"
import { SLOT_DURATION_MINUTES } from "./constants"

const EMPTY_ATTENDEE_IDS: Set<string> = new Set()

export function EventSchedule() {
  const { eventId } = useParams<{ eventId: string }>()

  const { event, loading, currentWeekStart, setCurrentWeekStart, refetch } =
    useEventData(eventId)
  const { slotMap, slotAttendeeIds } = useSlotAggregation(event)

  const [showOverlapOnly, setShowOverlapOnly] = useState(false)
  const [hoveredSlot, setHoveredSlot] = useState<Date | null>(null)

  // Which attendees submitted the currently-hovered slot, so the sidebar
  // can highlight them instead of showing a per-cell attendee list.
  const highlightedAttendeeIds = useMemo(() => {
    if (!hoveredSlot) return EMPTY_ATTENDEE_IDS
    const ids = slotAttendeeIds.get(hoveredSlot.getTime())
    return ids ? new Set(ids) : EMPTY_ATTENDEE_IDS
  }, [hoveredSlot, slotAttendeeIds])

  const isOutsideRange = useCallback(
    (time: Date) => {
      if (!event) return false
      const startBoundary = event.starts_after
        ? parseAPIDate(event.starts_after)
        : null
      const endBoundary = event.ends_before
        ? parseAPIDate(event.ends_before)
        : null

      const slotEnd = addMinutes(time, SLOT_DURATION_MINUTES)

      if (startBoundary && isBefore(time, startBoundary)) return true
      if (endBoundary && isAfter(slotEnd, endBoundary)) return true

      return false
    },
    [event]
  )

  const {
    selectedSlots,
    setSelectedSlots,
    dragType,
    isDragging,
    isInDragRange,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  } = useDragSelection(isOutsideRange)

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: currentWeekStart,
        end: addDays(currentWeekStart, 6),
      }),
    [currentWeekStart]
  )

  // Stabilized with useCallback: ScheduleGrid and AttendeeSidebar are
  // memoized, and this component re-renders on every throttled drag frame
  // (dragEnd lives in useDragSelection, above) — a plain inline function
  // here would get a new identity on each of those renders and silently
  // defeat that memoization every time. The functional update form also
  // means changeWeek never depends on currentWeekStart, so it (and the two
  // handlers below) stay stable for the component's whole lifetime, not
  // just between drag frames.
  const changeWeek = useCallback(
    (weeks: number) =>
      setCurrentWeekStart((start) => addWeeks(start, weeks)),
    [setCurrentWeekStart]
  )
  const handlePrevWeek = useCallback(() => changeWeek(-1), [changeWeek])
  const handleNextWeek = useCallback(() => changeWeek(1), [changeWeek])

  const handleSubmitAvailability = useCallback(
    async (name: string, emoji: string, comment: string) => {
      if (!name) {
        toast.error("Please enter your name")
        return
      }
      if (selectedSlots.size === 0) {
        toast.error("Please select at least one time slot")
        return
      }

      try {
        await submitTimeSlots(eventId!, {
          name,
          emoji,
          comment,
          time_slots: Array.from(selectedSlots).map((ts) => ({
            start_time: formatAPIDate(new Date(ts)),
            end_time: formatAPIDate(
              addMinutes(new Date(ts), SLOT_DURATION_MINUTES)
            ),
          })),
        })
        toast.success("Selection submitted!")
        refetch()
        setSelectedSlots(new Set())
      } catch (err) {
        toast.error("Failed to submit: " + err)
      }
    },
    [selectedSlots, eventId, refetch, setSelectedSlots]
  )

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )
  if (!event)
    return (
      <div className="flex h-screen items-center justify-center">
        Event not found
      </div>
    )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AttendeeSidebar
        eventName={event.name}
        eventDescription={event.description}
        attendees={event.attendees}
        showOverlapOnly={showOverlapOnly}
        onShowOverlapOnlyChange={setShowOverlapOnly}
        onSubmitAvailability={handleSubmitAvailability}
        highlightedAttendeeIds={highlightedAttendeeIds}
      />

      <ScheduleGrid
        weekDays={weekDays}
        currentWeekStart={currentWeekStart}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        isOutsideRange={isOutsideRange}
        slotMap={slotMap}
        selectedSlots={selectedSlots}
        totalAttendees={event.attendees.length}
        showOverlapOnly={showOverlapOnly}
        isInDragRange={isInDragRange}
        isDragging={isDragging}
        dragType={dragType}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseUp={handleMouseUp}
        onHoverSlot={setHoveredSlot}
      />
    </div>
  )
}
