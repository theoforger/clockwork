use chrono::NaiveDateTime;
use sqlx::query;
use uuid::Uuid;

#[derive(Debug)]
pub struct Event {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub starts_after: Option<NaiveDateTime>,
    pub ends_before: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
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

/// Deletes every event whose `ends_before` is in the past, along with all
/// of its attendees and their time slots. Events with no `ends_before` set
/// have no defined end and are never swept.
///
/// Cascades manually within one transaction rather than relying on SQLite
/// foreign-key `ON DELETE CASCADE` — same approach as
/// `delete_attendee_by_event`'s caller, kept consistent here instead of
/// introducing a second cascade strategy.
pub async fn delete_expired_events(
    pool: &sqlx::SqlitePool,
    now: NaiveDateTime,
) -> Result<u64, sqlx::Error> {
    let mut tx = pool.begin().await?;

    query!(
        r#"
        DELETE FROM time_slots
        WHERE attendee_id IN (
            SELECT attendees.id
            FROM attendees
            INNER JOIN events ON events.id = attendees.event_id
            WHERE events.ends_before IS NOT NULL AND events.ends_before < $1
        )
        "#,
        now
    )
    .execute(&mut *tx)
    .await?;

    query!(
        r#"
        DELETE FROM attendees
        WHERE event_id IN (
            SELECT id FROM events
            WHERE ends_before IS NOT NULL AND ends_before < $1
        )
        "#,
        now
    )
    .execute(&mut *tx)
    .await?;

    let result = query!(
        r#"
        DELETE FROM events
        WHERE ends_before IS NOT NULL AND ends_before < $1
        "#,
        now
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(result.rows_affected())
}

pub async fn read_event(pool: &sqlx::SqlitePool, id: String) -> Result<Option<Event>, sqlx::Error> {
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
        id: row.id.expect("event id is never null"),
        name: row.name,
        description: row.description,
        starts_after: row.starts_after,
        ends_before: row.ends_before,
        created_at: row.created_at.expect("created_at is never null"),
    });

    Ok(event)
}
