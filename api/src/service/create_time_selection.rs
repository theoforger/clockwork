use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use clockwork_dto::create_time_selection::{self, CreatedTimeSelection};

use crate::db::{attendees, time_selections};

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Path(event_id): Path<String>,
    Json(req): Json<create_time_selection::Request>,
) -> Result<(StatusCode, Json<create_time_selection::Response>), StatusCode> {
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
        Json(create_time_selection::Response {
            attendee_id,
            time_selections: created,
        }),
    ))
}
