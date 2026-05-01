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

pub async fn read_time_selection(
    pool: &sqlx::SqlitePool,
    id: String,
) -> Result<Option<TimeSelection>, sqlx::Error> {
    let time_selection = query!(
        r#"
        SELECT id, attendee_id, start_time, end_time, comment
        FROM time_selections
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await?
    .map(|row| TimeSelection {
        id: row.id.expect("time_selection id is never null"),
        attendee_id: row.attendee_id.expect("attendee_id is never null"),
        start_time: row.start_time,
        end_time: row.end_time,
        comment: row.comment,
    });

    Ok(time_selection)
}

pub async fn read_time_selections_by_attendee(
    pool: &sqlx::SqlitePool,
    attendee_id: String,
) -> Result<Vec<TimeSelection>, sqlx::Error> {
    let time_selections = query!(
        r#"
        SELECT id, attendee_id, start_time, end_time, comment
        FROM time_selections
        WHERE attendee_id = $1
        ORDER BY start_time ASC
        "#,
        attendee_id
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| TimeSelection {
        id: row.id.expect("time_selection id is never null"),
        attendee_id: row.attendee_id.expect("attendee_id is never null"),
        start_time: row.start_time,
        end_time: row.end_time,
        comment: row.comment,
    })
    .collect();

    Ok(time_selections)
}

pub async fn update_time_selection(
    pool: &sqlx::SqlitePool,
    id: String,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
    comment: Option<String>,
) -> Result<bool, sqlx::Error> {
    let rows_affected = query!(
        r#"
        UPDATE time_selections
        SET start_time = $1, end_time = $2, comment = $3
        WHERE id = $4
        "#,
        start_time,
        end_time,
        comment,
        id
    )
    .execute(pool)
    .await?
    .rows_affected();

    Ok(rows_affected > 0)
}

pub async fn delete_time_selection(
    pool: &sqlx::SqlitePool,
    id: String,
) -> Result<bool, sqlx::Error> {
    let rows_affected = query!(
        r#"
        DELETE FROM time_selections
        WHERE id = $1
        "#,
        id
    )
    .execute(pool)
    .await?
    .rows_affected();

    Ok(rows_affected > 0)
}
