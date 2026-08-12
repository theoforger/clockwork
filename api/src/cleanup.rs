//! Background sweep that deletes events (and their attendees/time slots)
//! once they're past their `ends_before` time.

use std::time::Duration;

use chrono::Utc;
use sqlx::SqlitePool;

use crate::db::events;

/// How often the sweep runs. Overridable via `EVENT_CLEANUP_INTERVAL_SECS`
/// (handy for testing without waiting an hour); defaults to once an hour.
fn interval() -> Duration {
    let secs = std::env::var("EVENT_CLEANUP_INTERVAL_SECS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3600);

    Duration::from_secs(secs)
}

/// Spawns the sweep as a detached background task and returns immediately.
/// `tokio::time::interval` fires its first tick right away, so an initial
/// sweep runs on startup rather than waiting a full period.
///
/// Fire-and-forget by design: a failed sweep is logged and retried on the
/// next tick rather than taking the server down — an expired event sitting
/// around a little longer isn't worth crashing over.
pub fn spawn(pool: SqlitePool) {
    let period = interval();

    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(period);

        loop {
            ticker.tick().await;

            match events::delete_expired_events(&pool, Utc::now().naive_utc()).await {
                Ok(0) => {}
                Ok(count) => println!("Cleaned up {count} expired event(s)"),
                Err(err) => eprintln!("Failed to clean up expired events: {err}"),
            }
        }
    });
}
