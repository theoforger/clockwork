use axum::{Json, extract::State, http::StatusCode};
use clockwork_dto::create_event;

use crate::db::events;

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Json(req): Json<create_event::Request>,
) -> Result<(StatusCode, Json<create_event::Response>), StatusCode> {
    let id = events::create_event(
        &pool,
        req.name,
        req.description,
        req.starts_after,
        req.ends_before,
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(create_event::Response { id })))
}
