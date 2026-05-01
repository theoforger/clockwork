use chrono::NaiveDateTime;
use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
pub struct TimeSelection {
    pub id: String,                // UUID for the time selection
    pub attendee_id: String,       // Foreign key referencing attendees
    pub start_time: NaiveDateTime, // Start time of the selected time range
    pub end_time: NaiveDateTime,   // End time of the selected time range
    pub comment: Option<String>,   // Optional comment for this time selection
}

pub async fn create_time_selection(
    pool: &sqlx::SqlitePool,
    attendee_id: String,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
    comment: Option<String>,
) -> Result<String, sqlx::Error> {
    let time_selection_id = Uuid::new_v4().to_string();

    query!(
        r#"
        INSERT INTO time_selections (id, attendee_id, start_time, end_time, comment)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        time_selection_id,
        attendee_id,
        start_time,
        end_time,
        comment
    )
    .execute(pool)
    .await?;

    Ok(time_selection_id)
}
