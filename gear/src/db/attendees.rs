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
