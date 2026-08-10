import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimeCellProps {
  time: Date
  outside: boolean
  count: number
  isSelected: boolean
  totalAttendees: number
  showOverlapOnly: boolean
  onMouseDown: (time: Date) => void
  onMouseEnter: (time: Date) => void
  dragPreview: boolean
  dragType: "select" | "deselect" | null
}

export const TimeCell = React.memo(function TimeCell({
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
}: TimeCellProps) {
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
