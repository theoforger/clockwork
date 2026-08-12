import { useCallback, useEffect, useMemo } from "react"
import { toast } from "sonner"
import {
  deleteAttendee,
  updateAttendee,
  type AttendeeResponse,
  type GetEventResponse,
  type UpdateAttendeeRequest,
} from "@/api/events"
import {
  clearSubmittedAttendee,
  getSubmittedAttendeeId,
  getSubmittedAttendeeToken,
  setSubmittedAttendee,
} from "@/lib/session"

/**
 * Tracks whether this browser already has a submission on record for the
 * current event (a per-event cookie remembering the attendee id and their
 * submission token), so the sidebar can lock the form to that submission —
 * and edit or delete it — instead of offering a fresh one.
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
      clearSubmittedAttendee(eventId)
    }
  }, [eventId, event])

  const rememberSubmission = useCallback(
    (attendeeId: string, token: string) => {
      if (!eventId) return
      setSubmittedAttendee(eventId, attendeeId, token)
    },
    [eventId]
  )

  const deleteSubmission = useCallback(async () => {
    if (!eventId || !submittedAttendee) return
    const token = getSubmittedAttendeeToken(eventId)
    if (!token) {
      toast.error("Can't verify this submission is yours anymore")
      return
    }
    try {
      await deleteAttendee(eventId, submittedAttendee.id, token)
      clearSubmittedAttendee(eventId)
      toast.success("Submission deleted")
      refetch()
    } catch (err) {
      toast.error("Failed to delete submission: " + err)
    }
  }, [eventId, submittedAttendee, refetch])

  // Left to throw on failure (unlike deleteSubmission) so the caller's own
  // submit flow — which already toasts create-submission errors — can
  // handle this one the same way instead of two divergent error paths.
  const updateSubmission = useCallback(
    async (payload: UpdateAttendeeRequest) => {
      if (!eventId || !submittedAttendee) return
      const token = getSubmittedAttendeeToken(eventId)
      if (!token) {
        throw new Error("Can't verify this submission is yours anymore")
      }
      await updateAttendee(eventId, submittedAttendee.id, token, payload)
      refetch()
    },
    [eventId, submittedAttendee, refetch]
  )

  return {
    submittedAttendee,
    rememberSubmission,
    deleteSubmission,
    updateSubmission,
  }
}
