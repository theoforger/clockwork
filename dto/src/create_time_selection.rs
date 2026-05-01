use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TimeSelection {
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Request {
    pub attendee_name: String,
    pub attendee_emoji: Option<String>,
    pub time_slots: Vec<TimeSelection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatedTimeSelection {
    pub id: String,
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Response {
    pub attendee_id: String,
    pub time_selections: Vec<CreatedTimeSelection>,
}
