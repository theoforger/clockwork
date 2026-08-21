import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  id: string
  label: string
  time: string
  setTime: (time: string) => void
}

export function TimePicker({ id, label, time, setTime }: TimePickerProps) {
  return (
    <Field className="w-32">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        type="time"
        id={id}
        step="60"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        required
        className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
      />
    </Field>
  )
}
