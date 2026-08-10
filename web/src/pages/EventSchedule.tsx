import * as React from "react"
import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams } from "react-router-dom"
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  addDays,
  setHours,
  setMinutes,
  addMinutes,
  startOfDay,
  isBefore,
  isAfter,
} from "date-fns"
import { getEvent, submitTimeSlots, type GetEventResponse } from "@/api/events"
import { parseAPIDate, formatAPIDate } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons"

const EMOJIS = [
  "🦊",
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🦝",
  "🦄",
  "🐥",
]
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SLOT_DURATION_MINUTES = 30

/* =========================
   Memoized Cell (6)
========================= */
const TimeCell = React.memo(function TimeCell({
  time,
  outside,
  count,
  isSelected,
  totalAttendees,
  showOverlapOnly,
  onMouseDown,
  onMouseEnter,
  dragPreview,
  dragType,
}: any) {
  return (
    <div
      className={cn(
        "relative h-6 bg-background transition-colors",
        outside && "cursor-not-allowed bg-muted/50",
        !outside && "z-10 cursor-pointer hover:ring-1 hover:ring-primary/30",
        !outside && isSelected && "bg-primary/60 ring-1 ring-primary", // FINAL selection
        !outside && dragPreview && dragType === "select" && "bg-primary/30", // GHOST preview
        !outside &&
          dragPreview &&
          dragType === "deselect" &&
          "bg-destructive/30",
        !outside && !isSelected && count > 0 && !showOverlapOnly && "bg-primary"
      )}
      style={{
        opacity:
          !outside && !isSelected && count > 0 && !showOverlapOnly
            ? Math.max(0.1, count / totalAttendees)
            : 1,
      }}
      onMouseDown={() => onMouseDown(time)}
      onMouseEnter={() => onMouseEnter(time)}
    >
      {!outside && count > 1 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary-foreground">
            {count}
          </span>
        </div>
      )}

      {!outside && showOverlapOnly && totalAttendees > 0 && count > 1 && (
        <div className="absolute inset-0 z-0 bg-primary" />
      )}
    </div>
  )
})

export function EventSchedule() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<GetEventResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [comment, setComment] = useState("")

  const [filter, setFilter] = useState("")
  const [showOverlapOnly, setShowOverlapOnly] = useState(false)

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date())

  /* ===== (3) Set instead of array ===== */
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set())

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Date | null>(null)
  const [dragType, setDragType] = useState<"select" | "deselect" | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)

  useEffect(() => {
    if (eventId) fetchEvent()
  }, [eventId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // ignore if the user is typing in an input/textarea
        const target = e.target as HTMLElement
        const tag = target.tagName.toLowerCase()
        const isTyping =
          tag === "input" || tag === "textarea" || target.isContentEditable

        if (isTyping) return

        setSelectedSlots(new Set())
        setIsDragging(false)
        setDragStart(null)
        setDragType(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const fetchEvent = async () => {
    if (!eventId) return
    try {
      setLoading(true)
      const data = await getEvent(eventId)
      setEvent(data)

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
  }

  /* ===== (2) Normalize dates ===== */
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

  /* ===== (1) Slot map ===== */
  const slotMap = useMemo(() => {
    if (!normalizedEvent) return new Map<number, number>()
    const map = new Map<number, number>()

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

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: addDays(currentWeekStart, 6),
    })
  }, [currentWeekStart])

  const handlePrevWeek = () =>
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  const handleNextWeek = () =>
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))

  const filteredAttendees = useMemo(() => {
    if (!event) return []
    return event.attendees.filter((a) =>
      a.name.toLowerCase().includes(filter.toLowerCase())
    )
  }, [event, filter])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard!")
  }

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

  /* ===== (4,5) callbacks ===== */
  const isInDragRange = useCallback(
    (time: Date) => {
      if (!isDragging || !dragStart || !dragEnd) return false

      const t = time.getTime()
      const start = Math.min(dragStart.getTime(), dragEnd.getTime())
      const end = Math.max(dragStart.getTime(), dragEnd.getTime())

      return t >= start && t <= end
    },
    [isDragging, dragStart, dragEnd]
  )

  const handleMouseDown = useCallback(
    (time: Date) => {
      if (isOutsideRange(time)) return

      const key = time.getTime()
      const isSelected = selectedSlots.has(key)

      setIsDragging(true)
      setDragStart(time)
      setDragEnd(time)
      setDragType(isSelected ? "deselect" : "select")
    },
    [selectedSlots, isOutsideRange]
  )

  const handleMouseEnter = useCallback(
    (time: Date) => {
      if (!isDragging || !dragStart) return
      if (isOutsideRange(time)) return

      setDragEnd(time)
    },
    [isDragging, dragStart, isOutsideRange]
  )

  const handleMouseUp = useCallback(() => {
    if (!dragStart || !dragEnd || !dragType) {
      setIsDragging(false)
      return
    }

    const start = Math.min(dragStart.getTime(), dragEnd.getTime())
    const end = Math.max(dragStart.getTime(), dragEnd.getTime())

    setSelectedSlots((prev) => {
      const next = new Set(prev)

      for (let t = start; t <= end; t += SLOT_DURATION_MINUTES * 60 * 1000) {
        if (dragType === "select") next.add(t)
        else next.delete(t)
      }

      return next
    })

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    setDragType(null)
  }, [dragStart, dragEnd, dragType])

  const handleSubmitAvailability = async () => {
    if (!name) return toast.error("Please enter your name")
    if (selectedSlots.size === 0)
      return toast.error("Please select at least one time slot")

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
      fetchEvent()
      setSelectedSlots(new Set())
    } catch (err) {
      toast.error("Failed to submit: " + err)
    }
  }

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
      {/* LEFT PANEL */}
      <aside className="flex w-80 flex-col border-r bg-card p-4 shadow-sm">
        <div className="flex h-full flex-col space-y-4">
          <div>
            <h2 className="truncate text-xl font-bold">{event.name}</h2>
            {event.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {event.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-md text-xl transition-colors hover:bg-muted",
                    emoji === e && "bg-muted ring-2 ring-primary"
                  )}
                  onClick={() => setEmoji(e === emoji ? "" : e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <Input
              placeholder="Optional comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button className="w-full" onClick={handleSubmitAvailability}>
              Submit My Availability
            </Button>
          </div>

          <Separator />

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 pb-2">
              <HugeiconsIcon
                icon={FilterIcon}
                size={16}
                className="text-muted-foreground"
              />
              <Input
                placeholder="Filter attendees..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8"
              />
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {filteredAttendees.map((a) => (
                  <HoverCard key={a.id} openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex items-center gap-2 rounded-lg border p-2 transition-colors hover:bg-accent">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-sm">
                            {a.emoji || a.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">
                          {a.name}
                        </span>
                      </div>
                    </HoverCardTrigger>
                    {a.comment && (
                      <HoverCardContent side="right">
                        <p className="text-sm font-semibold">{a.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {a.comment}
                        </p>
                      </HoverCardContent>
                    )}
                  </HoverCard>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="overlap"
                checked={showOverlapOnly}
                onCheckedChange={(checked) => setShowOverlapOnly(!!checked)}
              />
              <label
                htmlFor="overlap"
                className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show overlaps only
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={window.location.href}
                className="h-9 text-xs"
              />
              <Button
                size="icon"
                variant="outline"
                className="shrink-0"
                onClick={copyLink}
              >
                <HugeiconsIcon icon={Copy01Icon} size={16} />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main
        className="flex flex-1 flex-col overflow-hidden"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <header className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {format(currentWeekStart, "MMM d")} –{" "}
              {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 select-none">
          <div className="grid min-w-200 grid-cols-[60px_repeat(7,1fr)] gap-px border bg-border">
            <div className="bg-background p-2" />

            {weekDays.map((day) => (
              <div
                key={day.toString()}
                className="bg-background p-2 text-center"
              >
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {format(day, "eee")}
                </div>
                <div className="text-lg font-bold">{format(day, "d")}</div>
              </div>
            ))}

            {HOURS.map((hour) => (
              <React.Fragment key={hour}>
                {[0, SLOT_DURATION_MINUTES].map((minute) => (
                  <React.Fragment key={`${hour}:${minute}`}>
                    <div className="self-center bg-background pr-2 text-right text-[10px] text-muted-foreground">
                      {minute === 0 ? `${hour}:00` : ""}
                    </div>

                    {weekDays.map((day) => {
                      const time = setMinutes(
                        setHours(startOfDay(day), hour),
                        minute
                      )

                      const outside = isOutsideRange(time)
                      const ts = time.getTime()
                      const count = slotMap.get(ts) || 0
                      const isSelected = selectedSlots.has(ts)
                      const inDragRange = isInDragRange(time)

                      return (
                        <TimeCell
                          key={ts}
                          time={time}
                          outside={outside}
                          count={count}
                          isSelected={isSelected}
                          totalAttendees={event.attendees.length}
                          showOverlapOnly={showOverlapOnly}
                          onMouseDown={handleMouseDown}
                          onMouseEnter={handleMouseEnter}
                          dragPreview={inDragRange}
                          dragType={dragType}
                        />
                      )
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
