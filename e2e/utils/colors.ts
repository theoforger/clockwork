import type { Locator } from "@playwright/test"

/**
 * The translucent blue overlay TimeCell renders while a slot is selected
 * — committed or mid-drag, unsubmitted — layered over the cell rather than
 * a class on it directly (see web/src/pages/EventSchedule/TimeCell.tsx's
 * `showSelected` overlay).
 */
export function selectedOverlay(cell: Locator): Locator {
  return cell.locator("> div.bg-info\\/40")
}

/**
 * `bg-primary` on the cell itself: at least one attendee has submitted
 * availability there. Solid and unconditional on count — unlike the blue
 * overlay above, this lives directly on the cell's own class list.
 */
export const SUBMITTED_CLASS = /bg-primary\b/
