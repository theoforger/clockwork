use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::db::{attendees, time_slots};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlotRequest {
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlotResponse {
    pub id: String,
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendeeRequest {
    pub name: String,
    pub emoji: Option<String>,
    pub comment: Option<String>,
    pub time_slots: Vec<TimeSlotRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub attendee_id: String,
    pub time_slots: Vec<TimeSlotResponse>,
}

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Path(event_id): Path<String>,
    Json(req): Json<AttendeeRequest>,
) -> Result<(StatusCode, Json<Response>), StatusCode> {
    if req.time_slots.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    let attendee_id = attendees::create_attendee(&pool, event_id, req.name, req.emoji, req.comment)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut created = Vec::with_capacity(req.time_slots.len());
    for slot in req.time_slots {
        let id = time_slots::create_time_slot(
            &pool,
            attendee_id.clone(),
            slot.start_time,
            slot.end_time,
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        created.push(TimeSlotResponse {
            id,
            start_time: slot.start_time,
            end_time: slot.end_time,
        });
    }

    Ok((
        StatusCode::CREATED,
        Json(Response {
            attendee_id,
            time_slots: created,
        }),
    ))
}
