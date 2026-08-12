use chrono::NaiveDateTime;
use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
pub struct TimeSlot {
    pub id: String,
    pub attendee_id: String,
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
}

pub async fn create_time_slot<'e, E>(
    executor: E,
    attendee_id: String,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
) -> Result<String, sqlx::Error>
where
    E: sqlx::SqliteExecutor<'e>,
{
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
    .execute(executor)
    .await?;

    Ok(time_slot_id)
}

pub async fn delete_time_slots_by_attendee<'e, E>(
    executor: E,
    attendee_id: String,
) -> Result<(), sqlx::Error>
where
    E: sqlx::SqliteExecutor<'e>,
{
    query!(
        r#"
        DELETE FROM time_slots
        WHERE attendee_id = $1
        "#,
        attendee_id
    )
    .execute(executor)
    .await?;

    Ok(())
}

pub async fn read_time_slots_by_event(
    pool: &sqlx::SqlitePool,
    event_id: String,
) -> Result<Vec<TimeSlot>, sqlx::Error> {
    let time_slots = query!(
        r#"
        SELECT time_slots.id, time_slots.attendee_id, time_slots.start_time, time_slots.end_time
        FROM time_slots
        INNER JOIN attendees ON attendees.id = time_slots.attendee_id
        WHERE attendees.event_id = $1
        ORDER BY time_slots.attendee_id, time_slots.start_time ASC
        "#,
        event_id
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
