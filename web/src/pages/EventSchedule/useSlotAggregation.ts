import { useMemo } from "react"
import { addMinutes } from "date-fns"
import type { GetEventResponse } from "@/api/events"
import { parseAPIDate } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

/**
 * Builds a map of slot-start-timestamp -> number of attendees available
 * during that slot, by expanding every attendee's submitted time ranges
 * into individual SLOT_DURATION_MINUTES buckets.
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

  const slotMap = useMemo(() => {
    const map = new Map<number, number>()
    if (!normalizedEvent) return map

    normalizedEvent.attendees.forEach((a) => {
      a.time_slots.forEach((ts) => {
        let cursor = ts.start
        while (cursor < ts.end) {
          const key = cursor.getTime()
          map.set(key, (map.get(key) || 0) + 1)
          cursor = addMinutes(cursor, SLOT_DURATION_MINUTES)
        }
      })
    })

    return map
  }, [normalizedEvent])

  return { slotMap }
}
