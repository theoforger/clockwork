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

export interface TimeSlot {
  start_time: string
  end_time: string
  comment?: string | null
}

export interface CreateTimeSelectionRequest {
  attendee_name: string
  attendee_emoji?: string | null
  time_slots: TimeSlot[]
}

export interface CreatedTimeSelection extends TimeSlot {
  id: string
}

export interface CreateTimeSelectionResponse {
  attendee_id: string
  time_selections: CreatedTimeSelection[]
}

export type TimeSelectionResponse = CreatedTimeSelection

export interface AttendeeResponse {
  id: string
  name: string
  emoji?: string | null
  time_selections: TimeSelectionResponse[]
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

export async function createTimeSelection(
  eventId: string,
  payload: CreateTimeSelectionRequest
): Promise<CreateTimeSelectionResponse> {
  return apiClient<CreateTimeSelectionResponse>(
    `/events/${eventId}/time-selections`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}
