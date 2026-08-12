use chrono::NaiveDateTime;

use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
pub struct Attendee {
    pub id: String,                // UUID for the attendee
    pub event_id: String,          // Foreign key referencing events
    pub name: String,              // Attendee's name
    pub emoji: String,             // Emoji for profile picture
    pub comment: Option<String>,   // Optional comment for this time slot
    pub created_at: NaiveDateTime, // Time when the attendee made the submission
}

pub async fn create_attendee<'e, E>(
    executor: E,
    event_id: String,
    name: String,
    emoji: String,
    comment: Option<String>,
) -> Result<String, sqlx::Error>
where
    E: sqlx::SqliteExecutor<'e>,
{
    let attendee_id = Uuid::new_v4().to_string();

    query!(
        r#"
        INSERT INTO attendees (id, event_id, name, emoji, comment)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        attendee_id,
        event_id,
        name,
        emoji,
        comment
    )
    .execute(executor)
    .await?;

    Ok(attendee_id)
}

/// Deletes an attendee, scoped to the given event so a caller can't delete
/// an attendee belonging to a different event by guessing/reusing an id.
/// Returns whether a row was actually deleted.
pub async fn delete_attendee_by_event<'e, E>(
    executor: E,
    event_id: String,
    attendee_id: String,
) -> Result<bool, sqlx::Error>
where
    E: sqlx::SqliteExecutor<'e>,
{
    let result = query!(
        r#"
        DELETE FROM attendees
        WHERE id = $1 AND event_id = $2
        "#,
        attendee_id,
        event_id
    )
    .execute(executor)
    .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn read_attendees_by_event(
    pool: &sqlx::SqlitePool,
    event_id: String,
) -> Result<Vec<Attendee>, sqlx::Error> {
    let attendees = query!(
        r#"
        SELECT id, event_id, name, emoji, comment, created_at
        FROM attendees
        WHERE event_id = $1
        "#,
        event_id
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| Attendee {
        id: row.id.expect("attendee id is never null"),
        event_id: row.event_id.expect("event_id is never null"),
        name: row.name,
        emoji: row.emoji,
        comment: row.comment,
        created_at: row.created_at.expect("created_at is never null"),
    })
    .collect();

    Ok(attendees)
}

