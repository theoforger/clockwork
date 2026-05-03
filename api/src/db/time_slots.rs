use chrono::NaiveDateTime;
use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
pub struct TimeSlot {
    pub id: String,                // UUID for the time slot
    pub attendee_id: String,       // Foreign key referencing attendees
    pub start_time: NaiveDateTime, // Start time of the time slot
    pub end_time: NaiveDateTime,   // End time of the time slot
}

pub async fn create_time_slot(
    pool: &sqlx::SqlitePool,
    attendee_id: String,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
) -> Result<String, sqlx::Error> {
    let time_slot_id = Uuid::new_v4().to_string();

    query!(
        r#"
        INSERT INTO time_slots (id, attendee_id, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        "#,
        time_slot_id,
        attendee_id,
        start_time,
        end_time
    )
    .execute(pool)
    .await?;

    Ok(time_slot_id)
}

pub async fn read_time_slots_by_attendee(
    pool: &sqlx::SqlitePool,
    attendee_id: String,
) -> Result<Vec<TimeSlot>, sqlx::Error> {
    let time_slots = query!(
        r#"
        SELECT id, attendee_id, start_time, end_time
        FROM time_slots
        WHERE attendee_id = $1
        ORDER BY start_time ASC
        "#,
        attendee_id
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| TimeSlot {
        id: row.id.expect("time_slot id is never null"),
        attendee_id: row.attendee_id.expect("attendee_id is never null"),
        start_time: row.start_time,
        end_time: row.end_time,
    })
    .collect();

    Ok(time_slots)
}

pub async fn delete_time_slot(pool: &sqlx::SqlitePool, id: String) -> Result<bool, sqlx::Error> {
    let rows_affected = query!(
        r#"
        DELETE FROM time_slots
        WHERE id = $1
        "#,
        id
    )
    .execute(pool)
    .await?
    .rows_affected();

    Ok(rows_affected > 0)
}
