import { API_BASE_URL } from "../env"

export interface TimeSlotPayload {
  start_time: string
  end_time: string
}

export interface TimeSlotResult extends TimeSlotPayload {
  id: string
}

export interface CreateEventPayload {
  name: string
  description?: string | null
  starts_after?: string | null
  ends_before?: string | null
}

export interface CreateEventResult {
  id: string
}

export interface SubmitTimeSlotsPayload {
  name: string
  emoji: string
  comment?: string | null
  time_slots: TimeSlotPayload[]
}

export interface SubmitTimeSlotsResult {
  attendee_id: string
  token: string
  time_slots: TimeSlotResult[]
}

export interface UpdateAttendeeResult {
  attendee_id: string
  time_slots: TimeSlotResult[]
}

export interface AttendeeResult {
  id: string
  name: string
  emoji: string
  comment: string | null
  created_at: string
  time_slots: TimeSlotResult[]
}

export interface GetEventResult {
  id: string
  name: string
  description: string | null
  starts_after: string | null
  ends_before: string | null
  created_at: string
  attendees: AttendeeResult[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })

  if (!response.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${path} -> ${response.status}: ${await response.text()}`
    )
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

/**
 * Direct HTTP client for the Clockwork API. Used to seed or inspect state
 * in tests without driving the UI for setup that isn't itself under test —
 * API-first setup, UI-first assertions.
 */
export class ApiClient {
  createEvent(payload: CreateEventPayload): Promise<CreateEventResult> {
    return request("/events", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  getEvent(eventId: string): Promise<GetEventResult> {
    return request(`/events/${eventId}`)
  }

  submitTimeSlots(
    eventId: string,
    payload: SubmitTimeSlotsPayload
  ): Promise<SubmitTimeSlotsResult> {
    return request(`/events/${eventId}/time-slots`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  updateAttendee(
    eventId: string,
    attendeeId: string,
    token: string,
    payload: SubmitTimeSlotsPayload
  ): Promise<UpdateAttendeeResult> {
    return request(`/events/${eventId}/attendees/${attendeeId}`, {
      method: "PUT",
      headers: { "X-Submission-Token": token },
      body: JSON.stringify(payload),
    })
  }

  deleteAttendee(
    eventId: string,
    attendeeId: string,
    token: string
  ): Promise<void> {
    return request(`/events/${eventId}/attendees/${attendeeId}`, {
      method: "DELETE",
      headers: { "X-Submission-Token": token },
    })
  }
}
