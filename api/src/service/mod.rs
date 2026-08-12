pub mod create_event;
pub mod delete_attendee;
pub mod get_event;
pub mod submit_time_slots;
pub mod update_attendee;

use axum::http::StatusCode;
use sqlx::{Sqlite, Transaction};

use crate::db::time_slots;
use crate::dto::{TimeSlotRequest, TimeSlotResponse};

/// Header carrying an attendee's submission token — required to edit or
/// delete a submission (see `attendees::create_attendee`).
pub const TOKEN_HEADER: &str = "x-submission-token";

/// Inserts `slots` for `attendee_id` within `tx` and returns the created
/// rows — shared by `submit_time_slots` and `update_attendee`, which both
/// persist a fresh set of time slots for an attendee.
async fn create_time_slots(
    tx: &mut Transaction<'_, Sqlite>,
    attendee_id: &str,
    slots: Vec<TimeSlotRequest>,
) -> Result<Vec<TimeSlotResponse>, StatusCode> {
    let mut created = Vec::with_capacity(slots.len());
    for slot in slots {
        let id = time_slots::create_time_slot(
            &mut **tx,
            attendee_id.to_string(),
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

    Ok(created)
}
