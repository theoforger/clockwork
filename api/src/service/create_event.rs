use axum::{Json, extract::State, http::StatusCode};
use serde::{Serialize,Deserialize};
use chrono::NaiveDateTime;

use crate::db::events;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
    pub name: String,
    pub description: Option<String>,
    pub starts_after: Option<NaiveDateTime>,
    pub ends_before: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub id: String,
}

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Json(req): Json<Request>,
) -> Result<(StatusCode, Json<Response>), StatusCode> {
    let id = events::create_event(
        &pool,
        req.name,
        req.description,
        req.starts_after,
        req.ends_before,
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(Response { id })))
}
