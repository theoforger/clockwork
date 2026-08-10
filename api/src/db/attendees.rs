use chrono::NaiveDateTime;

use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
pub struct Attendee {
    pub id: String,                // UUID for the attendee
    pub event_id: String,          // Foreign key referencing events
    pub name: String,              // Attendee's name
    pub emoji: Option<String>,     // Optional emoji for profile picture
    pub comment: Option<String>,   // Optional comment for this time slot
    pub created_at: NaiveDateTime, // Time when the attendee made the submission
}

pub async fn create_attendee<'e, E>(
    executor: E,
    event_id: String,
    name: String,
    emoji: Option<String>,
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

