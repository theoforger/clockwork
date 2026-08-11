import { memo, useMemo, useState } from "react"
import { toast } from "sonner"
import type { AttendeeResponse } from "@/api/events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, FilterIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { EMOJIS } from "./constants"

export interface AttendeeSidebarProps {
  eventName: string
  eventDescription?: string | null
  attendees: AttendeeResponse[]
  showOverlapOnly: boolean
  onShowOverlapOnlyChange: (value: boolean) => void
  onSubmitAvailability: (
    name: string,
    emoji: string,
    comment: string
  ) => Promise<void> | void
  highlightedAttendeeIds: Set<string>
  // Non-null once this browser has a remembered submission for this event
  // (see useSubmittedAttendee) — locks the form to that submission instead
  // of a fresh one.
  submittedAttendee: AttendeeResponse | null
  onDeleteSubmission: () => Promise<void> | void
  onStartNewEvent: () => void
}

// Memoized so it doesn't re-render on every throttled drag frame — none of
// its own props change while a drag is in progress.
export const AttendeeSidebar = memo(function AttendeeSidebar({
  eventName,
  eventDescription,
  attendees,
  showOverlapOnly,
  onShowOverlapOnlyChange,
  onSubmitAvailability,
  highlightedAttendeeIds,
  submittedAttendee,
  onDeleteSubmission,
  onStartNewEvent,
}: AttendeeSidebarProps) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [comment, setComment] = useState("")
  const [filter, setFilter] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Once this browser has a submission on record, the form displays and
  // locks to *that* data rather than whatever's in the (untouched, since
  // the inputs are disabled) local state above.
  const isLocked = !!submittedAttendee
  const displayName = isLocked ? submittedAttendee.name : name
  const displayEmoji = isLocked ? (submittedAttendee.emoji ?? "") : emoji
  const displayComment = isLocked ? (submittedAttendee.comment ?? "") : comment

  // Re-filtering is wasted work on every hover-driven re-render (this
  // component re-renders whenever highlightedAttendeeIds changes), since
  // attendees/filter themselves haven't changed on those renders.
  const filteredAttendees = useMemo(
    () =>
      attendees.filter((a) =>
        a.name.toLowerCase().includes(filter.toLowerCase())
      ),
    [attendees, filter]
  )

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard!")
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmitAvailability(name, emoji, comment)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDeleteSubmission()
    } finally {
      setIsDeleting(false)
    }
  }

  const lockableFields = (
    <div className={cn("space-y-2 rounded-lg", isLocked && "cursor-not-allowed")}>
      <Input
        placeholder="Your name"
        value={displayName}
        onChange={(e) => setName(e.target.value)}
        disabled={isLocked}
      />
      <div className="flex flex-wrap gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            disabled={isLocked}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-xl transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
              displayEmoji === e && "bg-muted ring-2 ring-primary"
            )}
            onClick={() => setEmoji(e === emoji ? "" : e)}
          >
            {e}
          </button>
        ))}
      </div>
      <Input
        placeholder="Optional comment"
        value={displayComment ?? ""}
        onChange={(e) => setComment(e.target.value)}
        disabled={isLocked}
      />
    </div>
  )

  const formFields = (
    <div className="space-y-2">
      {isLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>{lockableFields}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-56 text-center">
            Please delete your existing submission to create a new one
          </TooltipContent>
        </Tooltip>
      ) : (
        lockableFields
      )}

      {isLocked ? (
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete My Submission"}
        </Button>
      ) : (
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit My Availability"}
        </Button>
      )}
    </div>
  )

  return (
    <aside className="flex w-80 flex-col border-r bg-card p-4 shadow-sm">
      <div className="flex h-full flex-col space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-xl font-bold">{eventName}</h2>
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label="New Event"
                    >
                      <HugeiconsIcon icon={PlusSignIcon} size={16} />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">New Event</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start a new event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Make sure you&apos;ve saved this event&apos;s URL
                    somewhere first — once you leave, this page won&apos;t
                    bring you back to it. You&apos;ll need the link to return.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onStartNewEvent}>
                    I&apos;ve saved it, continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {eventDescription && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {eventDescription}
            </p>
          )}
        </div>

        {formFields}

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
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 transition-colors duration-150 hover:bg-accent",
                        highlightedAttendeeIds.has(a.id) &&
                          "border-primary bg-primary/10"
                      )}
                    >
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
              onCheckedChange={(checked) =>
                onShowOverlapOnlyChange(!!checked)
              }
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
  )
})
