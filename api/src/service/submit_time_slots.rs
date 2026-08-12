use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

use crate::db::{attendees, events};
use crate::dto::{TimeSlotRequest, TimeSlotResponse};
use crate::validation::validate_time_slots;

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
    // The submitter's only chance to see this — required to edit or
    // delete this submission later, and never returned by GET /events/{id}.
    pub token: String,
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

    let event = events::read_event(&pool, event_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    validate_time_slots(&event, &req.time_slots)?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (attendee_id, token) =
        attendees::create_attendee(&mut *tx, event_id, req.name, req.emoji, req.comment)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let created = super::create_time_slots(&mut tx, &attendee_id, req.time_slots).await?;

    tx.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((
        StatusCode::CREATED,
        Json(Response {
            attendee_id,
            token,
            time_slots: created,
        }),
    ))
}
