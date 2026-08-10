import { useMemo } from "react"
import { addMinutes } from "date-fns"
import type { GetEventResponse } from "@/api/events"
import { parseAPIDate } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

/**
 * Expands every attendee's submitted time ranges into individual
 * SLOT_DURATION_MINUTES buckets, keyed by slot-start-timestamp: who's
 * available in each slot (slotAttendeeIds), and how many (slotMap).
 */
export function useSlotAggregation(event: GetEventResponse | null) {
  const normalizedEvent = useMemo(() => {
    if (!event) return null
    return {
      ...event,
      attendees: event.attendees.map((a) => ({
        ...a,
        time_slots: a.time_slots.map((ts) => ({
          start: parseAPIDate(ts.start_time),
          end: parseAPIDate(ts.end_time),
        })),
      })),
    }
  }, [event])

  // Map of slot-start-timestamp -> ids of attendees available during that
  // slot, for highlighting "who's free" in the sidebar on cell hover.
  const slotAttendeeIds = useMemo(() => {
    const map = new Map<number, string[]>()
    if (!normalizedEvent) return map

    normalizedEvent.attendees.forEach((a) => {
      a.time_slots.forEach((ts) => {
        let cursor = ts.start
        while (cursor < ts.end) {
          const key = cursor.getTime()
          const list = map.get(key)
          if (list) list.push(a.id)
          else map.set(key, [a.id])
          cursor = addMinutes(cursor, SLOT_DURATION_MINUTES)
        }
      })
    })

    return map
  }, [normalizedEvent])

  // Attendee count per slot is just the length of its id list — derive it
  // from slotAttendeeIds instead of re-walking every attendee's time
  // ranges a second time.
  const slotMap = useMemo(() => {
    const map = new Map<number, number>()
    slotAttendeeIds.forEach((ids, key) => map.set(key, ids.length))
    return map
  }, [slotAttendeeIds])

  return { slotMap, slotAttendeeIds }
}
