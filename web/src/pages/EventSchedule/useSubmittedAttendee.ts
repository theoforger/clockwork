import { useCallback, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { deleteAttendee, type AttendeeResponse, type GetEventResponse } from "@/api/events"
import {
  clearSubmittedAttendeeId,
  getSubmittedAttendeeId,
  setSubmittedAttendeeId,
} from "@/lib/session"

/**
 * Tracks whether this browser already has a submission on record for the
 * current event (a per-event cookie remembering the attendee id), so the
 * sidebar can lock the form to that submission instead of offering a fresh
 * one until the attendee deletes it.
 */
export function useSubmittedAttendee(
  eventId: string | undefined,
  event: GetEventResponse | null,
  refetch: () => void
) {
  const submittedAttendee = useMemo<AttendeeResponse | null>(() => {
    if (!eventId || !event) return null
    const id = getSubmittedAttendeeId(eventId)
    if (!id) return null
    return event.attendees.find((a) => a.id === id) ?? null
  }, [eventId, event])

  // The remembered id might point at a submission that no longer exists
  // (e.g. deleted from another tab/device) — don't leave the form locked
  // to nothing.
  useEffect(() => {
    if (!eventId || !event) return
    const id = getSubmittedAttendeeId(eventId)
    if (id && !event.attendees.some((a) => a.id === id)) {
      clearSubmittedAttendeeId(eventId)
    }
  }, [eventId, event])

  const rememberSubmission = useCallback(
    (attendeeId: string) => {
      if (!eventId) return
      setSubmittedAttendeeId(eventId, attendeeId)
    },
    [eventId]
  )

  const deleteSubmission = useCallback(async () => {
    if (!eventId || !submittedAttendee) return
    try {
      await deleteAttendee(eventId, submittedAttendee.id)
      clearSubmittedAttendeeId(eventId)
      toast.success("Submission deleted")
      refetch()
    } catch (err) {
      toast.error("Failed to delete submission: " + err)
    }
  }, [eventId, submittedAttendee, refetch])

  return { submittedAttendee, rememberSubmission, deleteSubmission }
}
