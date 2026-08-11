import { useCallback, useEffect, useState } from "react"
import { startOfWeek, isBefore } from "date-fns"
import { toast } from "sonner"
import { getEvent, type GetEventResponse } from "@/api/events"
import { parseAPIDate } from "@/lib/date-utils"
import { setLastEventId } from "@/lib/session"

/**
 * Fetches the event (and its attendees/time slots) and picks a sensible
 * initial week to display: the event's configured start, or otherwise
 * the earliest submitted time slot, falling back to the current week.
 */
export function useEventData(eventId: string | undefined) {
  const [event, setEvent] = useState<GetEventResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date())

  const fetchEvent = useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      const data = await getEvent(eventId)
      setEvent(data)
      // Remember this as the browser's active event so the base URL can
      // jump back into it later — only once we know it actually exists.
      setLastEventId(data.id)

      if (data.starts_after) {
        setCurrentWeekStart(startOfWeek(parseAPIDate(data.starts_after)))
      } else {
        const earliest = data.attendees
          .flatMap((a) => a.time_slots)
          .reduce((earliest: Date | null, slot) => {
            const start = parseAPIDate(slot.start_time)
            return !earliest || isBefore(start, earliest) ? start : earliest
          }, null)

        setCurrentWeekStart(startOfWeek(earliest || new Date()))
      }
    } catch (err) {
      toast.error("Failed to load event: " + err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  return {
    event,
    loading,
    currentWeekStart,
    setCurrentWeekStart,
    refetch: fetchEvent,
  }
}
