//! Shared request validation for handlers that accept time slots.

use axum::http::StatusCode;

use crate::db::events::Event;
use crate::dto::TimeSlotRequest;

/// Rejects time slots that don't make sense on their own (end at/before
/// start) or that fall outside the event's configured
/// `starts_after`/`ends_before` window.
///
/// The frontend already keeps users from dragging out-of-range selections
/// on the grid, but that's a UI convenience running against a client the
/// server doesn't control — this is what actually enforces the boundary.
pub fn validate_time_slots(
    event: &Event,
    time_slots: &[TimeSlotRequest],
) -> Result<(), StatusCode> {
    for slot in time_slots {
        if slot.end_time <= slot.start_time {
            return Err(StatusCode::UNPROCESSABLE_ENTITY);
        }

        if let Some(starts_after) = event.starts_after
            && slot.start_time < starts_after
        {
            return Err(StatusCode::UNPROCESSABLE_ENTITY);
        }

        if let Some(ends_before) = event.ends_before
            && slot.end_time > ends_before
        {
            return Err(StatusCode::UNPROCESSABLE_ENTITY);
        }
    }

    Ok(())
}
