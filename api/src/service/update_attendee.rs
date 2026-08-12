use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};
use serde::{Deserialize, Serialize};

use crate::db::{attendees, events, time_slots};
use crate::dto::{TimeSlotRequest, TimeSlotResponse};
use crate::service::TOKEN_HEADER;
use crate::validation::validate_time_slots;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
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

/// Replaces an existing submission's profile fields and time slots in one
/// request — same shape as `submit_time_slots`, but against an attendee
/// that already exists, and authorized by their submission token instead
/// of creating a new attendee.
pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Path((event_id, attendee_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(req): Json<Request>,
) -> Result<Json<Response>, StatusCode> {
    if req.time_slots.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    let token = headers
        .get(TOKEN_HEADER)
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?
        .to_string();

    let event = events::read_event(&pool, event_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    validate_time_slots(&event, &req.time_slots)?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let updated = attendees::update_attendee(
        &mut *tx,
        event_id,
        attendee_id.clone(),
        token,
        req.name,
        req.emoji,
        req.comment,
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !updated {
        // Same reasoning as delete_attendee: nonexistent attendee and bad
        // token both look like a 404 to the caller.
        tx.rollback()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        return Err(StatusCode::NOT_FOUND);
    }

    time_slots::delete_time_slots_by_attendee(&mut *tx, attendee_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let created = super::create_time_slots(&mut tx, &attendee_id, req.time_slots).await?;

    tx.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(Response {
        attendee_id,
        time_slots: created,
    }))
}
