import { useCallback, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  addWeeks,
  eachDayOfInterval,
  addDays,
  addMinutes,
  isBefore,
  isAfter,
} from "date-fns"
import { submitTimeSlots, type AttendeeResponse } from "@/api/events"
import { parseAPIDate, formatAPIDate } from "@/lib/date-utils"
import { clearLastEventId } from "@/lib/session"
import { toast } from "sonner"
import { NotFound } from "../NotFound"
import { AttendeeSidebar } from "./AttendeeSidebar"
import { ScheduleGrid } from "./ScheduleGrid"
import { useEventData } from "./useEventData"
import { useSlotAggregation } from "./useSlotAggregation"
import { useAttendeeFilter } from "./useAttendeeFilter"
import { useDragSelection } from "./useDragSelection"
import { useSubmittedAttendee } from "./useSubmittedAttendee"
import { SLOT_DURATION_MINUTES } from "./constants"

const EMPTY_ATTENDEE_IDS: Set<string> = new Set()
const EMPTY_ATTENDEES: AttendeeResponse[] = []

export function EventSchedule() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const { event, loading, currentWeekStart, setCurrentWeekStart, refetch } =
    useEventData(eventId)
  const { submittedAttendee, rememberSubmission, deleteSubmission } =
    useSubmittedAttendee(eventId, event, refetch)

  const attendees = event?.attendees ?? EMPTY_ATTENDEES
  const {
    search,
    setSearch,
    selectedAttendeeIds,
    toggleAttendee,
    selectAll,
    selectNone,
    isAllSelected,
    isNoneSelected,
  } = useAttendeeFilter(attendees)

  // Slot emoji lists are pre-filtered to the selected attendees, so the
  // grid reflects the sidebar filter instead of everyone who submitted.
  const { slotEmojis, slotAttendeeIds } = useSlotAggregation(
    event,
    selectedAttendeeIds
  )

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
    isInDragRange,
    dragRangeLabel,
    handleMouseDown,
    handleMouseEnter,
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
    (weeks: number) => setCurrentWeekStart((start) => addWeeks(start, weeks)),
    [setCurrentWeekStart]
  )
  const handlePrevWeek = useCallback(() => changeWeek(-1), [changeWeek])
  const handleNextWeek = useCallback(() => changeWeek(1), [changeWeek])

  // Same stability concern as above — this backs a clickable row in the
  // (memoized) sidebar's reference section, not just the Esc shortcut.
  const handleClearSelection = useCallback(
    () => setSelectedSlots(new Set()),
    [setSelectedSlots]
  )

  const handleSubmitAvailability = useCallback(
    async (name: string, emoji: string, comment: string) => {
      if (!name) {
        toast.error("Please enter your name")
        return
      }
      if (!emoji) {
        toast.error("Please pick an emoji")
        return
      }
      if (selectedSlots.size === 0) {
        toast.error("Please select at least one time slot")
        return
      }

      try {
        const response = await submitTimeSlots(eventId!, {
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
        // Remember this submission so a later visit finds the form already
        // locked to it instead of offering a fresh (duplicate) submission.
        rememberSubmission(response.attendee_id)
        toast.success("Selection submitted!")
        refetch()
        setSelectedSlots(new Set())
      } catch (err) {
        toast.error("Failed to submit: " + err)
      }
    },
    [selectedSlots, eventId, refetch, setSelectedSlots, rememberSubmission]
  )

  // "New Event": clear the cookie that bounces the base URL back into this
  // event, then leave — the confirmation dialog (in AttendeeSidebar) is
  // what actually gates calling this.
  const handleStartNewEvent = useCallback(() => {
    clearLastEventId()
    navigate("/")
  }, [navigate])

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )
  if (!event) return <NotFound />

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AttendeeSidebar
        eventName={event.name}
        eventDescription={event.description}
        attendees={event.attendees}
        selectedAttendeeIds={selectedAttendeeIds}
        onToggleAttendee={toggleAttendee}
        search={search}
        onSearchChange={setSearch}
        onSelectAll={selectAll}
        onSelectNone={selectNone}
        isAllSelected={isAllSelected}
        isNoneSelected={isNoneSelected}
        hasSelection={selectedSlots.size > 0}
        onClearSelection={handleClearSelection}
        onSubmitAvailability={handleSubmitAvailability}
        highlightedAttendeeIds={highlightedAttendeeIds}
        submittedAttendee={submittedAttendee}
        onDeleteSubmission={deleteSubmission}
        onStartNewEvent={handleStartNewEvent}
      />

      <ScheduleGrid
        weekDays={weekDays}
        currentWeekStart={currentWeekStart}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        isOutsideRange={isOutsideRange}
        slotEmojis={slotEmojis}
        selectedSlots={selectedSlots}
        isInDragRange={isInDragRange}
        dragType={dragType}
        dragRangeLabel={dragRangeLabel}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onHoverSlot={setHoveredSlot}
      />
    </div>
  )
}
