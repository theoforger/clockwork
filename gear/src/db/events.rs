use chrono::NaiveDateTime;
use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
struct Event {
    pub id: String,                          // UUID for the event
    pub name: String,                        // Name of the event
    pub description: Option<String>,         // Optional description
    pub starts_after: Option<NaiveDateTime>, // Optional start time limit
    pub ends_before: Option<NaiveDateTime>,  // Optional end time limit
    pub created_at: NaiveDateTime,           // Time when the event is created
}

async fn create_event(
    pool: &sqlx::SqlitePool,
    name: String,
    description: Option<String>,
    starts_after: Option<NaiveDateTime>,
    ends_before: Option<NaiveDateTime>,
) -> Result<String, sqlx::Error> {
    let event_id = Uuid::new_v4().to_string();

    query!(
        r#"
        INSERT INTO events (id, name, description, starts_after, ends_before)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        event_id,
        name,
        description,
        starts_after,
        ends_before
    )
    .execute(pool)
    .await?;

    Ok(event_id)
}
