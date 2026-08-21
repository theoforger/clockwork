import { useCallback, useEffect, useMemo, useState } from "react"
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
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { ModeToggle } from "@/components/mode-toggle"
import { NotFound } from "../NotFound"
import { AttendeeSidebar, AttendeeSidebarSheet } from "./AttendeeSidebar"
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
  const {
    submittedAttendee,
    rememberSubmission,
    deleteSubmission,
    updateSubmission,
  } = useSubmittedAttendee(eventId, event, refetch)
  const [isEditing, setIsEditing] = useState(false)

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

  // Mobile-only: whether the grid is in touch drag-select mode rather than
  // its default native-scroll ("Browse") mode — see useDragSelection's
  // docstring for why touch needs this distinction.
  const [touchSelectMode, setTouchSelectMode] = useState(false)

  // Once there's a submission on record and it's not being edited, the
  // grid is read-only. Submitted cells need no special-casing to still
  // read as "submitted" (TimeCell's hasSubmissions check) — they're
  // already part of `event.attendees` at that point.
  const isLocked = !!submittedAttendee && !isEditing

  // Entering Select mode while locked is a dead end (every cell's
  // pointerdown no-ops until Edit is hit) — tell the user why instead of
  // silently toggling into a mode that does nothing.
  const handleToggleTouchSelectMode = useCallback(() => {
    if (isLocked) {
      toast.error("Click Edit from the sidebar to change your selections")
      return
    }
    setTouchSelectMode((v) => !v)
  }, [isLocked])

  const {
    selectedSlots,
    setSelectedSlots,
    dragType,
    dragEnd,
    isInDragRange,
    dragRangeLabel,
    handlePointerDown,
    handlePointerEnter,
  } = useDragSelection(isOutsideRange, touchSelectMode)

  // The attendee sidebar's mobile sheet — hidden on md:+, where
  // AttendeeSidebar renders as an always-visible aside instead.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Close the sheet the moment a selection gesture starts, so it doesn't
  // sit on top of the grid the user is trying to interact with.
  useEffect(() => {
    if (dragType !== null) setIsSidebarOpen(false)
  }, [dragType])

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: currentWeekStart,
        end: addDays(currentWeekStart, 6),
      }),
    [currentWeekStart]
  )

  // Stabilized with useCallback: this component re-renders on every
  // throttled drag frame, and a plain inline function would defeat
  // ScheduleGrid/AttendeeSidebar's memoization every time. The functional
  // update form also keeps changeWeek independent of currentWeekStart, so
  // it (and the two handlers below) never need to change identity at all.
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
  const handleOpenSidebar = useCallback(() => setIsSidebarOpen(true), [])

  // Enter edit mode: seed the grid selection from the submission's time
  // slots — each already a single SLOT_DURATION_MINUTES bucket, so no
  // expansion is needed to get back to the Set<timestamp> shape the grid
  // works with.
  const handleStartEdit = useCallback(() => {
    if (!submittedAttendee) return
    setSelectedSlots(
      new Set(
        submittedAttendee.time_slots.map((ts) =>
          parseAPIDate(ts.start_time).getTime()
        )
      )
    )
    setIsEditing(true)
  }, [submittedAttendee, setSelectedSlots])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setSelectedSlots(new Set())
  }, [setSelectedSlots])

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

      const time_slots = Array.from(selectedSlots).map((ts) => ({
        start_time: formatAPIDate(new Date(ts)),
        end_time: formatAPIDate(
          addMinutes(new Date(ts), SLOT_DURATION_MINUTES)
        ),
      }))

      try {
        if (isEditing) {
          await updateSubmission({ name, emoji, comment, time_slots })
          toast.success("Submission updated!")
          setIsEditing(false)
          setSelectedSlots(new Set())
        } else {
          const response = await submitTimeSlots(eventId!, {
            name,
            emoji,
            comment,
            time_slots,
          })
          // Remember this submission so a later visit finds the form
          // already locked to it instead of offering a fresh (duplicate)
          // submission.
          rememberSubmission(response.attendee_id, response.token)
          toast.success("Selection submitted!")
          refetch()
          setSelectedSlots(new Set())
        }
      } catch (err) {
        toast.error("Failed to submit: " + err)
      }
    },
    [
      selectedSlots,
      eventId,
      refetch,
      setSelectedSlots,
      rememberSubmission,
      isEditing,
      updateSubmission,
    ]
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

  const sidebarProps = {
    eventName: event.name,
    eventDescription: event.description,
    attendees: event.attendees,
    selectedAttendeeIds,
    onToggleAttendee: toggleAttendee,
    search,
    onSearchChange: setSearch,
    onSelectAll: selectAll,
    onSelectNone: selectNone,
    isAllSelected,
    isNoneSelected,
    hasSelection: selectedSlots.size > 0,
    onClearSelection: handleClearSelection,
    onSubmitAvailability: handleSubmitAvailability,
    highlightedAttendeeIds,
    submittedAttendee,
    isEditing,
    onStartEdit: handleStartEdit,
    onCancelEdit: handleCancelEdit,
    onDeleteSubmission: deleteSubmission,
    onStartNewEvent: handleStartNewEvent,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Pinned to the viewport corner, matching CreateEvent/NotFound,
          rather than living in the grid's own header. top/right track the
          header's own p-3 md:p-4 padding so it lines up with its icon
          buttons; z-40 clears the grid's sticky rows/columns (z-20/z-30). */}
      <div className="fixed top-3 right-3 z-40 md:top-4 md:right-4">
        <ModeToggle />
      </div>

      <AttendeeSidebar {...sidebarProps} />
      <AttendeeSidebarSheet
        {...sidebarProps}
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />

      <ScheduleGrid
        weekDays={weekDays}
        currentWeekStart={currentWeekStart}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        isOutsideRange={isOutsideRange}
        slotEmojis={slotEmojis}
        selectedSlots={selectedSlots}
        selectionLocked={isLocked}
        isInDragRange={isInDragRange}
        dragType={dragType}
        dragEnd={dragEnd}
        dragRangeLabel={dragRangeLabel}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onHoverSlot={setHoveredSlot}
        touchSelectMode={touchSelectMode}
        onToggleTouchSelectMode={handleToggleTouchSelectMode}
        onOpenSidebar={handleOpenSidebar}
      />

      {/* Mobile-only: once something's selected, submitting is one tap
          away behind the hamburger — easy to miss on a first visit, so
          surface it directly. Hidden mid-drag so it doesn't appear where
          a finger might be dragging near the bottom edge. */}
      {selectedSlots.size > 0 && !isSidebarOpen && dragType === null && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg md:hidden"
        >
          {selectedSlots.size} slot{selectedSlots.size === 1 ? "" : "s"}{" "}
          selected
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </button>
      )}
    </div>
  )
}
