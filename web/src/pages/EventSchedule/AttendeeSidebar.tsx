import { useState } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, FilterIcon } from "@hugeicons/core-free-icons"
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
}

export function AttendeeSidebar({
  eventName,
  eventDescription,
  attendees,
  showOverlapOnly,
  onShowOverlapOnlyChange,
  onSubmitAvailability,
}: AttendeeSidebarProps) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [comment, setComment] = useState("")
  const [filter, setFilter] = useState("")

  const filteredAttendees = attendees.filter((a) =>
    a.name.toLowerCase().includes(filter.toLowerCase())
  )

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard!")
  }

  const handleSubmit = async () => {
    await onSubmitAvailability(name, emoji, comment)
  }

  return (
    <aside className="flex w-80 flex-col border-r bg-card p-4 shadow-sm">
      <div className="flex h-full flex-col space-y-4">
        <div>
          <h2 className="truncate text-xl font-bold">{eventName}</h2>
          {eventDescription && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {eventDescription}
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
          <Button className="w-full" onClick={handleSubmit}>
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
}
