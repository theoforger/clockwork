use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::db::{attendees, events, time_slots};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlotResponse {
    pub id: String,
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendeeResponse {
    pub id: String,
    pub name: String,
    pub emoji: Option<String>,
    pub comment: Option<String>,
    pub created_at: NaiveDateTime,
    pub time_slots: Vec<TimeSlotResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub starts_after: Option<NaiveDateTime>,
    pub ends_before: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub attendees: Vec<AttendeeResponse>,
}

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Path(event_id): Path<String>,
) -> Result<Json<Response>, StatusCode> {
    let event = events::read_event(&pool, event_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let attendee_rows = attendees::read_attendees_by_event(&pool, event_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut attendee_responses = Vec::with_capacity(attendee_rows.len());
    for attendee in attendee_rows {
        let slots = time_slots::read_time_slots_by_attendee(&pool, attendee.id.clone())
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let slot_responses = slots
            .into_iter()
            .map(|s| TimeSlotResponse {
                id: s.id,
                start_time: s.start_time,
                end_time: s.end_time,
            })
            .collect();

        attendee_responses.push(AttendeeResponse {
            id: attendee.id,
            name: attendee.name,
            emoji: attendee.emoji,
            comment: attendee.comment,
            created_at: attendee.created_at,
            time_slots: slot_responses,
        });
    }

    Ok(Json(Response {
        id: event.id,
        name: event.name,
        description: event.description,
        starts_after: event.starts_after,
        ends_before: event.ends_before,
        created_at: event.created_at,
        attendees: attendee_responses,
    }))
}
