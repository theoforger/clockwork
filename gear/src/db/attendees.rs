use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
pub struct Attendee {
    pub id: String,            // UUID for the attendee
    pub event_id: String,      // Foreign key referencing events
    pub name: String,          // Attendee's name
    pub emoji: Option<String>, // Optional emoji for profile picture
}

pub async fn create_attendee(
    pool: &sqlx::SqlitePool,
    event_id: String,
    name: String,
    emoji: Option<String>,
) -> Result<String, sqlx::Error> {
    let attendee_id = Uuid::new_v4().to_string();

    query!(
        r#"
        INSERT INTO attendees (id, event_id, name, emoji)
        VALUES ($1, $2, $3, $4)
        "#,
        attendee_id,
        event_id,
        name,
        emoji
    )
    .execute(pool)
    .await?;

    Ok(attendee_id)
}

pub async fn read_attendee(
    pool: &sqlx::SqlitePool,
    id: String,
) -> Result<Option<Attendee>, sqlx::Error> {
    let attendee = query!(
        r#"
        SELECT id, event_id, name, emoji
        FROM attendees
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await?
    .map(|row| Attendee {
        id: row.id,
        event_id: row.event_id,
        name: row.name,
        emoji: row.emoji,
    });

    Ok(attendee)
}

pub async fn read_attendees_by_event(
    pool: &sqlx::SqlitePool,
    event_id: String,
) -> Result<Vec<Attendee>, sqlx::Error> {
    let attendees = query!(
        r#"
        SELECT id, event_id, name, emoji
        FROM attendees
        WHERE event_id = $1
        "#,
        event_id
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| Attendee {
        id: row.id,
        event_id: row.event_id,
        name: row.name,
        emoji: row.emoji,
    })
    .collect();

    Ok(attendees)
}

pub async fn update_attendee(
    pool: &sqlx::SqlitePool,
    id: String,
    name: String,
    emoji: Option<String>,
) -> Result<bool, sqlx::Error> {
    let rows_affected = query!(
        r#"
        UPDATE attendees
        SET name = $1, emoji = $2
        WHERE id = $3
        "#,
        name,
        emoji,
        id
    )
    .execute(pool)
    .await?
    .rows_affected();

    Ok(rows_affected > 0)
}

pub async fn delete_attendee(
    pool: &sqlx::SqlitePool,
    id: String,
) -> Result<bool, sqlx::Error> {
    let rows_affected = query!(
        r#"
        DELETE FROM attendees
        WHERE id = $1
        "#,
        id
    )
    .execute(pool)
    .await?
    .rows_affected();

    Ok(rows_affected > 0)
}
