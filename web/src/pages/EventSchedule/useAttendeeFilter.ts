import { useCallback, useMemo, useState } from "react"
import type { AttendeeResponse } from "@/api/events"

/**
 * Drives the sidebar's attendee list as a filter on the schedule: which
 * attendees' slots show up on the grid (selectedAttendeeIds), and the
 * search box that narrows the *list* itself.
 *
 * Selection is tracked as a deselected-ids set rather than a selected-ids
 * set so "everything selected by default" doesn't require seeding it from
 * `attendees` (which may still be loading) or re-syncing when attendees
 * are added later — an attendee absent from the set is, by construction,
 * selected.
 */
export function useAttendeeFilter(attendees: AttendeeResponse[]) {
  const [search, setSearch] = useState("")
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set())

  const selectedAttendeeIds = useMemo(() => {
    const ids = new Set<string>()
    attendees.forEach((a) => {
      if (!deselectedIds.has(a.id)) ids.add(a.id)
    })
    return ids
  }, [attendees, deselectedIds])

  const toggleAttendee = useCallback((id: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => setDeselectedIds(new Set()), [])

  const selectNone = useCallback(() => {
    setDeselectedIds(new Set(attendees.map((a) => a.id)))
  }, [attendees])

  const isAllSelected = deselectedIds.size === 0
  const isNoneSelected = selectedAttendeeIds.size === 0

  return {
    search,
    setSearch,
    selectedAttendeeIds,
    toggleAttendee,
    selectAll,
    selectNone,
    isAllSelected,
    isNoneSelected,
  }
}
