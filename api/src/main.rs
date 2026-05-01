mod db;
mod service;

use axum::{
    Router,
    routing::{get, post},
};
use dotenvy::dotenv;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = SqlitePoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let app = Router::new()
        .route("/events", post(service::create_event::handler))
        .route("/events/{event_id}", get(service::get_event::handler))
        .route(
            "/events/{event_id}/time-selections",
            post(service::create_time_selection::handler),
        )
        .with_state(pool);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind port 3000");

    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.expect("Server error");
}
