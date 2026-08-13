import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
  // of a fresh one, unless isEditing is true.
  submittedAttendee: AttendeeResponse | null
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onDeleteSubmission: () => Promise<void> | void
  onStartNewEvent: () => void
}

// Everything that renders inside the sidebar, shared between the always-
// visible desktop `<aside>` (AttendeeSidebar, below) and the mobile
// slide-over (AttendeeSidebarSheet, below) — kept as one component so the
// two shells never drift out of sync, with just their outer container
// (fixed-width aside vs. a Sheet's panel) differing.
function AttendeeSidebarContent({
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
  isEditing,
  onStartEdit,
  onCancelEdit,
  onDeleteSubmission,
  onStartNewEvent,
}: AttendeeSidebarProps) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Editing starts from the existing submission's values rather than
  // whatever's left over in local state from before it existed.
  useEffect(() => {
    if (isEditing && submittedAttendee) {
      setName(submittedAttendee.name)
      setEmoji(submittedAttendee.emoji)
      setComment(submittedAttendee.comment ?? "")
    }
  }, [isEditing, submittedAttendee])

  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  // Whether the clamped description overflows 2 lines, i.e. needs a "Read
  // more" toggle. Measured off `eventDescription` only, not
  // `isDescriptionExpanded` — re-measuring on expand/collapse would read
  // the now-unclamped element and make the button disappear once clicked.
  const [isDescriptionClamped, setIsDescriptionClamped] = useState(false)
  useLayoutEffect(() => {
    const el = descriptionRef.current
    setIsDescriptionClamped(!!el && el.scrollHeight > el.clientHeight)
  }, [eventDescription])

  // Once a submission is on record, the form displays and locks to that
  // data instead of the (untouched) local state above — unless editing,
  // in which case it behaves like a fresh submission seeded from it.
  const isLocked = !!submittedAttendee && !isEditing
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
      {lockableFields}

      {isLocked && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onStartEdit}>
            Edit
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      )}

      {isEditing && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancelEdit}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      {!isLocked && !isEditing && (
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
    <>
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
                  first — once you leave, this page won&apos;t bring you back to
                  it. You&apos;ll need the link to return.
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
        {/* min-h-0: same automatic-minimum-size override as the sidebar's
            own container — ScrollArea's Root is just a block-level flex
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
    </>
  )
}

// Always-visible desktop sidebar. Memoized so it doesn't re-render on every
// throttled drag frame — none of its own props change while a drag is in
// progress.
export const AttendeeSidebar = memo(function AttendeeSidebar(
  props: AttendeeSidebarProps
) {
  return (
    // min-h-0 overrides the automatic (content-based) minimum size flex
    // items get by default — without it, this aside's own min-content
    // height (header + form + full attendee list + footer, unclamped)
    // would win over the stretch-to-h-screen height it gets from being a
    // row-flex item in EventSchedule's container, so it'd grow taller than
    // the viewport instead of actually shrinking and letting the attendee
    // list section below scroll internally.
    <aside className="hidden h-full min-h-0 w-80 shrink-0 flex-col gap-4 border-r bg-card p-4 shadow-sm md:flex">
      <AttendeeSidebarContent {...props} />
    </aside>
  )
})

export interface AttendeeSidebarSheetProps extends AttendeeSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Mobile equivalent of AttendeeSidebar: the same content, reached via a
// hamburger button (in ScheduleGrid's header) instead of always being on
// screen, since a permanent 320px-wide sidebar would leave almost nothing
// for the schedule grid on a phone.
export const AttendeeSidebarSheet = memo(function AttendeeSidebarSheet({
  open,
  onOpenChange,
  ...props
}: AttendeeSidebarSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        // pt-12 clears the Sheet's own absolutely-positioned close button
        // (top-4 right-4), which would otherwise sit right on top of the
        // "New Event" button at the start of this content's header row.
        className="flex w-3/4 flex-col gap-4 p-4 pt-12 sm:max-w-xs"
        // Radix's default open-focus behavior would land on the "New
        // Event" button — the first focusable descendant, and it's
        // wrapped in a Tooltip. Focusing it opens that tooltip, which then
        // swallows the *first* Escape press to dismiss itself instead of
        // closing the sheet. Skip the auto-focus entirely rather than
        // fight over which element should get it.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Visually hidden: the content below already shows the event name
            as a heading, so this only exists to give Radix's dialog the
            accessible title it requires. */}
        <SheetHeader className="sr-only">
          <SheetTitle>{props.eventName}</SheetTitle>
        </SheetHeader>
        <AttendeeSidebarContent {...props} />
      </SheetContent>
    </Sheet>
  )
})
