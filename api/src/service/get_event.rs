use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use clockwork_dto::get_event::{self, Attendee, TimeSelection};

use crate::db::{attendees, events, time_selections};

pub async fn handler(
    State(pool): State<sqlx::SqlitePool>,
    Path(event_id): Path<String>,
) -> Result<Json<get_event::Response>, StatusCode> {
    let event = events::read_event(&pool, event_id.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let attendee_rows = attendees::read_attendees_by_event(&pool, event_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut attendee_responses = Vec::with_capacity(attendee_rows.len());
    for attendee in attendee_rows {
        let selections =
            time_selections::read_time_selections_by_attendee(&pool, attendee.id.clone())
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let selection_responses = selections
            .into_iter()
            .map(|s| TimeSelection {
                id: s.id,
                start_time: s.start_time,
                end_time: s.end_time,
                comment: s.comment,
            })
            .collect();

        attendee_responses.push(Attendee {
            id: attendee.id,
            name: attendee.name,
            emoji: attendee.emoji,
            time_selections: selection_responses,
        });
    }

    Ok(Json(get_event::Response {
        id: event.id,
        name: event.name,
        description: event.description,
        starts_after: event.starts_after,
        ends_before: event.ends_before,
        created_at: event.created_at,
        attendees: attendee_responses,
    }))
}
