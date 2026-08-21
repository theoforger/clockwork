import type { SubmitEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RangePicker } from "@/components/range-picker"
import { TimePicker } from "@/components/time-picker"
import { ModeToggle } from "@/components/mode-toggle"
import { createEvent, type CreateEventRequest } from "@/api/events"
import { toast } from "sonner"
import { formatAPIDate, formatTime } from "@/lib/date-utils"
import { getLastEventId } from "@/lib/session"

// Returns a local Date rather than an API-formatted string, so both the
// submit payload and the human-readable description below share the same
// combination logic instead of drifting apart.
function combineDateAndTime(
  date: Date | undefined,
  time: string
): Date | undefined {
  if (!date) return

  const [hours, minutes] = time.split(":").map(Number)

  const local = new Date(date)
  local.setHours(hours, minutes, 0, 0)

  return local
}

export function CreateEvent() {
  const navigate = useNavigate()

  // If this browser already has an active event, jump straight back into
  // it instead of showing a blank form. Lazy initializer so the redirect
  // decision is made before the first paint — no flash of the form.
  const [lastEventId] = useState(() => getLastEventId())

  useEffect(() => {
    if (lastEventId) navigate(`/${lastEventId}`, { replace: true })
  }, [lastEventId, navigate])

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [startsAt, setStartsAt] = useState("10:00")
  const [endsAt, setEndsAt] = useState("10:00")

  // Combined once here rather than separately in the submit handler and
  // the description text below, so both always agree.
  const startsAfterDate = useMemo(
    () => combineDateAndTime(dateRange?.from, startsAt),
    [dateRange?.from, startsAt]
  )
  const endsBeforeDate = useMemo(
    () => combineDateAndTime(dateRange?.to, endsAt),
    [dateRange?.to, endsAt]
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()

    if (
      startsAfterDate &&
      endsBeforeDate &&
      startsAfterDate >= endsBeforeDate
    ) {
      toast.error("The event must start before it ends")
      return
    }

    setIsSubmitting(true)

    try {
      const body: CreateEventRequest = { name }
      if (description) body.description = description
      if (startsAfterDate) body.starts_after = formatAPIDate(startsAfterDate)
      if (endsBeforeDate) body.ends_before = formatAPIDate(endsBeforeDate)

      const data = await createEvent(body)
      toast.success("Event created successfully!")
      navigate(`/${data.id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Redirecting — render nothing rather than flashing the create form.
  if (lastEventId) return null

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex w-full justify-center">
            <CardTitle className="text-2xl font-bold">
              Create an event
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form id="create-event-form" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="event-name">
                  Name<span className="text-red-600">*</span>
                </FieldLabel>
                <Input
                  id="event-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-description">
                  Description (Optional)
                </FieldLabel>
                <Textarea
                  id="event-description"
                  placeholder="An optional description for your event"
                  className="resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-stretch">
                <RangePicker
                  id="event-date-range"
                  label="Date Range (Optional)"
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                />
                {dateRange && (
                  <div className="flex gap-2">
                    <TimePicker
                      id="event-starts-at"
                      label="Starts At"
                      time={startsAt}
                      setTime={setStartsAt}
                    />
                    <TimePicker
                      id="event-ends-at"
                      label="Ends At"
                      time={endsAt}
                      setTime={setEndsAt}
                    />
                  </div>
                )}
              </div>
              {startsAfterDate && endsBeforeDate && (
                <FieldDescription>
                  The event starts no earlier than{" "}
                  <span className="font-medium text-foreground">
                    {format(startsAfterDate, "LLL dd, y")} at{" "}
                    {formatTime(startsAfterDate)}
                  </span>
                  , and ends no later than{" "}
                  <span className="font-medium text-foreground">
                    {format(endsBeforeDate, "LLL dd, y")} at{" "}
                    {formatTime(endsBeforeDate)}
                  </span>
                  .
                </FieldDescription>
              )}
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            form="create-event-form"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
