use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Serialize,Deserialize};
use chrono::NaiveDateTime;

use crate::db::{attendees, time_selections};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlot {
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
    pub attendee_name: String,
    pub attendee_emoji: Option<String>,
    pub time_slots: Vec<TimeSlot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatedTimeSelection {
    pub id: String,
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub attendee_id: String,
    pub time_selections: Vec<CreatedTimeSelection>,
}

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Path(event_id): Path<String>,
    Json(req): Json<Request>,
) -> Result<(StatusCode, Json<Response>), StatusCode> {
    if req.time_slots.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    let attendee_id =
        attendees::create_attendee(&pool, event_id, req.attendee_name, req.attendee_emoji)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut created = Vec::with_capacity(req.time_slots.len());
    for slot in req.time_slots {
        let id = time_selections::create_time_selection(
            &pool,
            attendee_id.clone(),
            slot.start_time,
            slot.end_time,
            slot.comment.clone(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        created.push(CreatedTimeSelection {
            id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            comment: slot.comment,
        });
    }

    Ok((
        StatusCode::CREATED,
        Json(Response {
            attendee_id,
            time_selections: created,
        }),
    ))
}
