use chrono::NaiveDateTime;
use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
pub struct Event {
    pub id: String,                          // UUID for the event
    pub name: String,                        // Name of the event
    pub description: Option<String>,         // Optional description
    pub starts_after: Option<NaiveDateTime>, // Optional start time limit
    pub ends_before: Option<NaiveDateTime>,  // Optional end time limit
    pub created_at: NaiveDateTime,           // Time when the event is created
}

pub async fn create_event(
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

pub async fn read_event(
    pool: &sqlx::SqlitePool,
    id: String,
) -> Result<Option<Event>, sqlx::Error> {
    let event = query!(
        r#"
        SELECT id, name, description, starts_after, ends_before, created_at
        FROM events
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await?
    .map(|row| Event {
        id: row.id,
        name: row.name,
        description: row.description,
        starts_after: row.starts_after,
        ends_before: row.ends_before,
        created_at: row.created_at,
    });

    Ok(event)
}

pub async fn read_all_events(pool: &sqlx::SqlitePool) -> Result<Vec<Event>, sqlx::Error> {
    let events = query!(
        r#"
        SELECT id, name, description, starts_after, ends_before, created_at
        FROM events
        ORDER BY created_at ASC
        "#
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| Event {
        id: row.id,
        name: row.name,
        description: row.description,
        starts_after: row.starts_after,
        ends_before: row.ends_before,
        created_at: row.created_at,
    })
    .collect();

    Ok(events)
}

pub async fn update_event(
    pool: &sqlx::SqlitePool,
    id: String,
    name: String,
    description: Option<String>,
    starts_after: Option<NaiveDateTime>,
    ends_before: Option<NaiveDateTime>,
) -> Result<bool, sqlx::Error> {
    let rows_affected = query!(
        r#"
        UPDATE events
        SET name = $1, description = $2, starts_after = $3, ends_before = $4
        WHERE id = $5
        "#,
        name,
        description,
        starts_after,
        ends_before,
        id
    )
    .execute(pool)
    .await?
    .rows_affected();

    Ok(rows_affected > 0)
}

pub async fn delete_event(
    pool: &sqlx::SqlitePool,
    id: String,
) -> Result<bool, sqlx::Error> {
    let rows_affected = query!(
        r#"
        DELETE FROM events
        WHERE id = $1
        "#,
        id
    )
    .execute(pool)
    .await?
    .rows_affected();

    Ok(rows_affected > 0)
}
