use axum::{extract::{Path, State}, http::StatusCode};

use crate::db::{attendees, time_slots};

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Path((event_id, attendee_id)): Path<(String, String)>,
) -> Result<StatusCode, StatusCode> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    time_slots::delete_time_slots_by_attendee(&mut *tx, attendee_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let deleted = attendees::delete_attendee_by_event(&mut *tx, event_id, attendee_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !deleted {
        // Rolling back is not strictly necessary (the time slot delete is a
        // no-op if the attendee never existed), but it keeps the intent
        // explicit rather than relying on that being true forever.
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
