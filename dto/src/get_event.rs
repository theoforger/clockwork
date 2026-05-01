use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSelection {
    pub id: String,
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attendee {
    pub id: String,
    pub name: String,
    pub emoji: Option<String>,
    pub time_selections: Vec<TimeSelection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub starts_after: Option<NaiveDateTime>,
    pub ends_before: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub attendees: Vec<Attendee>,
}
