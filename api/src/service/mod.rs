pub mod create_event;
pub mod delete_attendee;
pub mod submit_time_slots;
pub mod get_event;
pub mod update_attendee;

/// Header carrying an attendee's submission token — required to edit or
/// delete a submission (see `attendees::create_attendee`).
pub const TOKEN_HEADER: &str = "x-submission-token";
