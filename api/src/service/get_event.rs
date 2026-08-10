use std::collections::HashMap;

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::db::{attendees, events, time_slots};
use crate::dto::TimeSlotResponse;

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

    let attendee_rows = attendees::read_attendees_by_event(&pool, event_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let slot_rows = time_slots::read_time_slots_by_event(&pool, event_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut slots_by_attendee: HashMap<String, Vec<TimeSlotResponse>> = HashMap::new();
    for slot in slot_rows {
        slots_by_attendee
            .entry(slot.attendee_id)
            .or_default()
            .push(TimeSlotResponse {
                id: slot.id,
                start_time: slot.start_time,
                end_time: slot.end_time,
            });
    }

    let attendee_responses = attendee_rows
        .into_iter()
        .map(|attendee| AttendeeResponse {
            time_slots: slots_by_attendee.remove(&attendee.id).unwrap_or_default(),
            id: attendee.id,
            name: attendee.name,
            emoji: attendee.emoji,
            comment: attendee.comment,
            created_at: attendee.created_at,
        })
        .collect();

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
