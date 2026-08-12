use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

use crate::db::{attendees, events, time_slots};
use crate::dto::{TimeSlotRequest, TimeSlotResponse};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendeeRequest {
    pub name: String,
    pub emoji: String,
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

    events::read_event(&pool, event_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let attendee_id =
        attendees::create_attendee(&mut *tx, event_id, req.name, req.emoji, req.comment)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut created = Vec::with_capacity(req.time_slots.len());
    for slot in req.time_slots {
        let id = time_slots::create_time_slot(
            &mut *tx,
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

    tx.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((
        StatusCode::CREATED,
        Json(Response {
            attendee_id,
            time_slots: created,
        }),
    ))
}
