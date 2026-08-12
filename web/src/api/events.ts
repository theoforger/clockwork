import { apiClient } from "./client"

export interface CreateEventRequest {
  name: string
  description?: string | null
  starts_after?: string | null
  ends_before?: string | null
}

export interface CreateEventResponse {
  id: string
}

export interface TimeSlotRequest {
  start_time: string
  end_time: string
}

export interface SubmitTimeSlotsRequest {
  name: string
  emoji: string
  comment?: string | null
  time_slots: TimeSlotRequest[]
}

export interface TimeSlotResponse {
  id: string
  start_time: string
  end_time: string
}

export interface SubmitTimeSlotsResponse {
  attendee_id: string
  // Returned once, here — required to edit or delete this submission
  // later (see updateAttendee/deleteAttendee), and never included in
  // getEvent. Callers are responsible for holding onto it.
  token: string
  time_slots: TimeSlotResponse[]
}

export interface UpdateAttendeeRequest {
  name: string
  emoji: string
  comment?: string | null
  time_slots: TimeSlotRequest[]
}

export interface UpdateAttendeeResponse {
  attendee_id: string
  time_slots: TimeSlotResponse[]
}

export interface AttendeeResponse {
  id: string
  name: string
  emoji: string
  comment?: string | null
  created_at: string
  time_slots: TimeSlotResponse[]
}

export interface GetEventResponse {
  id: string
  name: string
  description?: string | null
  starts_after?: string | null
  ends_before?: string | null
  created_at: string
  attendees: AttendeeResponse[]
}

export async function createEvent(
  payload: CreateEventRequest
): Promise<CreateEventResponse> {
  return apiClient<CreateEventResponse>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getEvent(eventId: string): Promise<GetEventResponse> {
  return apiClient<GetEventResponse>(`/events/${eventId}`, {
    method: "GET",
  })
}

export async function submitTimeSlots(
  eventId: string,
  payload: SubmitTimeSlotsRequest
): Promise<SubmitTimeSlotsResponse> {
  return apiClient<SubmitTimeSlotsResponse>(`/events/${eventId}/time-slots`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAttendee(
  eventId: string,
  attendeeId: string,
  token: string,
  payload: UpdateAttendeeRequest
): Promise<UpdateAttendeeResponse> {
  return apiClient<UpdateAttendeeResponse>(
    `/events/${eventId}/attendees/${attendeeId}`,
    {
      method: "PUT",
      headers: { "X-Submission-Token": token },
      body: JSON.stringify(payload),
    }
  )
}

export async function deleteAttendee(
  eventId: string,
  attendeeId: string,
  token: string
): Promise<void> {
  await apiClient<void>(`/events/${eventId}/attendees/${attendeeId}`, {
    method: "DELETE",
    headers: { "X-Submission-Token": token },
  })
}
