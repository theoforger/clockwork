use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};

use crate::db::{attendees, time_slots};
use crate::service::TOKEN_HEADER;

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Path((event_id, attendee_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<StatusCode, StatusCode> {
    let token = headers
        .get(TOKEN_HEADER)
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?
        .to_string();

    let mut tx = pool
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    time_slots::delete_time_slots_by_attendee(&mut *tx, attendee_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let deleted = attendees::delete_attendee_by_event(&mut *tx, event_id, attendee_id, token)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !deleted {
        // Also rolls back the time slot delete above — the only way this
        // branch is reached is a nonexistent attendee or a token mismatch,
        // and it shouldn't matter to a caller which one (same 404 either
        // way, so a bad token can't be used to probe which attendee ids
        // exist).
        tx.rollback()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        return Err(StatusCode::NOT_FOUND);
    }

    tx.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
