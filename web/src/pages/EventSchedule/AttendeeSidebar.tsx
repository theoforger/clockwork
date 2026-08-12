import { memo, useLayoutEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { AttendeeResponse } from "@/api/events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import {
  BubbleChatIcon,
  CheckmarkSquare02Icon,
  Copy01Icon,
  MinusSignSquareIcon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { EMOJIS } from "./constants"

export interface AttendeeSidebarProps {
  eventName: string
  eventDescription?: string | null
  attendees: AttendeeResponse[]
  // Which attendees' slots currently show up on the grid — everyone not in
  // this set is filtered out. Default (nothing toggled off) is everyone.
  selectedAttendeeIds: Set<string>
  onToggleAttendee: (id: string) => void
  // Narrows which rows the list *shows*; independent of selection.
  search: string
  onSearchChange: (value: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  isAllSelected: boolean
  isNoneSelected: boolean
  // Whether there's a time slot selection to clear (not attendee selection).
  hasSelection: boolean
  onClearSelection: () => void
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
  selectedAttendeeIds,
  onToggleAttendee,
  search,
  onSearchChange,
  onSelectAll,
  onSelectNone,
  isAllSelected,
  isNoneSelected,
  hasSelection,
  onClearSelection,
  onSubmitAvailability,
  highlightedAttendeeIds,
  submittedAttendee,
  onDeleteSubmission,
  onStartNewEvent,
}: AttendeeSidebarProps) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  // Whether the clamped description actually overflows 2 lines — i.e.
  // whether a "Read more" toggle is even needed. Measured only off
  // `eventDescription` itself, not `isDescriptionExpanded`: re-running this
  // on every expand/collapse would re-measure the now-unclamped (fully
  // visible, non-overflowing) element and make the button disappear the
  // moment it's clicked.
  const [isDescriptionClamped, setIsDescriptionClamped] = useState(false)
  useLayoutEffect(() => {
    const el = descriptionRef.current
    setIsDescriptionClamped(!!el && el.scrollHeight > el.clientHeight)
  }, [eventDescription])

  // Once this browser has a submission on record, the form displays and
  // locks to *that* data rather than whatever's in the (untouched, since
  // the inputs are disabled) local state above.
  const isLocked = !!submittedAttendee
  const displayName = isLocked ? submittedAttendee.name : name
  const displayEmoji = isLocked ? submittedAttendee.emoji : emoji
  const displayComment = isLocked ? (submittedAttendee.comment ?? "") : comment

  // Re-searching is wasted work on every hover-driven re-render (this
  // component re-renders whenever highlightedAttendeeIds changes), since
  // attendees/search themselves haven't changed on those renders.
  const searchedAttendees = useMemo(
    () =>
      attendees.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      ),
    [attendees, search]
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
    <div
      className={cn("space-y-2 rounded-lg", isLocked && "cursor-not-allowed")}
    >
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
      <Textarea
        placeholder="Comment (Optional)"
        // max-h-36 = 5 lines (1.5rem line-height) + the textarea's own
        // vertical padding — field-sizing-content grows it up to that,
        // then it scrolls instead of growing further.
        className="max-h-36 resize-none overflow-y-auto"
        value={displayComment ?? ""}
        onChange={(e) => setComment(e.target.value)}
        disabled={isLocked}
      />
    </div>
  )

  const formFields = (
    <div className="shrink-0 space-y-2">
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
    // min-h-0 overrides the automatic (content-based) minimum size flex
    // items get by default — without it, this aside's own min-content
    // height (header + form + full attendee list + footer, unclamped)
    // would win over the stretch-to-h-screen height it gets from being a
    // row-flex item in EventSchedule's container, so it'd grow taller than
    // the viewport instead of actually shrinking and letting the attendee
    // list section below scroll internally.
    <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col gap-4 border-r bg-card p-4 shadow-sm">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-xl font-bold">{eventName}</h2>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="default"
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
                  Make sure you&apos;ve saved this event&apos;s URL somewhere
                  first — once you leave, this page won&apos;t bring you back
                  to it. You&apos;ll need the link to return.
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
          <div>
            <p
              ref={descriptionRef}
              className={cn(
                "text-sm whitespace-pre-line text-muted-foreground",
                !isDescriptionExpanded && "line-clamp-2"
              )}
            >
              {eventDescription}
            </p>
            {isDescriptionClamped && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => setIsDescriptionExpanded((v) => !v)}
              >
                {isDescriptionExpanded ? "Show less" : "Read more"}
              </Button>
            )}
          </div>
        )}
      </div>

      {formFields}

      <Separator className="shrink-0" />

      {/* The only part of this sidebar that shrinks when vertical space
          runs short — everything else above/below stays at its natural
          size, and this scrolls internally instead. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search attendees..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label="Select all"
                disabled={isAllSelected}
                onClick={onSelectAll}
              >
                <HugeiconsIcon icon={CheckmarkSquare02Icon} size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Select all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label="Select none"
                disabled={isNoneSelected}
                onClick={onSelectNone}
              >
                <HugeiconsIcon icon={MinusSignSquareIcon} size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Select none</TooltipContent>
          </Tooltip>
        </div>
        {/* min-h-0: same automatic-minimum-size override as the aside
            itself below — ScrollArea's Root is just a block-level flex
            item, so without this its content (the full attendee list)
            would win over flex-1 and keep it from ever shrinking down to
            scrollable size. */}
        <ScrollArea className="-mr-4 min-h-0 flex-1">
          <div className="space-y-2 pr-4">
            {searchedAttendees.map((a) => {
              const isSelected = selectedAttendeeIds.has(a.id)
              return (
                <HoverCard key={a.id} openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    {/* A <label> forwards clicks anywhere in it to the
                        nested Checkbox's underlying <button> (a labelable
                        element), so the whole row toggles without any
                        hand-rolled click/keyboard handling here — the
                        Checkbox already gets Enter/Space for free. */}
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors duration-150 hover:bg-accent",
                        !isSelected && "opacity-50",
                        highlightedAttendeeIds.has(a.id) &&
                          "border-primary bg-primary/10"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleAttendee(a.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm">
                          {a.emoji}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {a.name}
                      </span>
                      {a.comment && (
                        <HugeiconsIcon
                          icon={BubbleChatIcon}
                          size={14}
                          className="shrink-0 text-muted-foreground"
                        />
                      )}
                    </label>
                  </HoverCardTrigger>
                  {a.comment && (
                    <HoverCardContent side="right">
                      <p className="text-sm whitespace-pre-line text-muted-foreground">
                        {a.comment}
                      </p>
                    </HoverCardContent>
                  )}
                </HoverCard>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      <button
        type="button"
        onClick={onClearSelection}
        disabled={!hasSelection}
        className="flex w-full shrink-0 items-center justify-between gap-2 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <span>Clear selection</span>
        <Kbd>Esc</Kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <Input readOnly value={window.location.href} className="h-9 text-xs" />
        <Button
          size="icon"
          variant="outline"
          className="shrink-0"
          onClick={copyLink}
        >
          <HugeiconsIcon icon={Copy01Icon} size={16} />
        </Button>
      </div>
    </aside>
  )
})
