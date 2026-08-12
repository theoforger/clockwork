/**
 * Whether a keyboard event's target is somewhere the user could be typing
 * (a text input, textarea, or contenteditable element) — global keyboard
 * shortcuts should no-op in that case rather than hijacking the keystroke.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName.toLowerCase()
  return tag === "input" || tag === "textarea"
}
