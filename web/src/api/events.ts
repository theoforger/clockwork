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
  emoji?: string | null
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
  time_slots: TimeSlotResponse[]
}

export interface AttendeeResponse {
  id: string
  name: string
  emoji?: string | null
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
  return apiClient<SubmitTimeSlotsResponse>(
    `/events/${eventId}/time-slots`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}
