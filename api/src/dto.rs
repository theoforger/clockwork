//! Shared request/response types used across multiple service handlers.

use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlotRequest {
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlotResponse {
    pub id: String,
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
}
