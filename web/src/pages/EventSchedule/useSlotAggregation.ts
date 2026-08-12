import { useMemo } from "react"
import { addMinutes } from "date-fns"
import type { GetEventResponse } from "@/api/events"
import { parseAPIDate } from "@/lib/date-utils"
import { SLOT_DURATION_MINUTES } from "./constants"

/**
 * Expands every attendee's submitted time ranges into individual
 * SLOT_DURATION_MINUTES buckets, keyed by slot-start-timestamp: who's
 * available in each slot (slotAttendeeIds), and the display glyph (their
 * chosen emoji) of whichever of those are currently selected in the
 * sidebar (slotEmojis) — what the grid actually renders.
 */
export function useSlotAggregation(
  event: GetEventResponse | null,
  selectedAttendeeIds: Set<string>
) {
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

  // Each attendee's display glyph — their chosen emoji. Built once per
  // event fetch so the per-slot pass below can just look ids up instead of
  // re-deriving this per attendee per slot.
  const attendeeEmojis = useMemo(() => {
    const map = new Map<string, string>()
    if (!normalizedEvent) return map
    normalizedEvent.attendees.forEach((a) => {
      map.set(a.id, a.emoji)
    })
    return map
  }, [normalizedEvent])

  // Display glyphs per slot, restricted to the selected attendees — derive
  // it from slotAttendeeIds instead of re-walking every attendee's time
  // ranges a second time. Slots left with nobody selected are dropped
  // rather than kept empty, so callers can treat "present in the map" as
  // "has a selected attendee".
  const slotEmojis = useMemo(() => {
    const map = new Map<number, string[]>()
    slotAttendeeIds.forEach((ids, key) => {
      const emojis = ids
        .filter((id) => selectedAttendeeIds.has(id))
        .map((id) => attendeeEmojis.get(id)!)
      if (emojis.length > 0) map.set(key, emojis)
    })
    return map
  }, [slotAttendeeIds, selectedAttendeeIds, attendeeEmojis])

  return { slotEmojis, slotAttendeeIds }
}
