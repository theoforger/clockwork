mod db;
mod dto;
mod service;

use axum::{
    Router,
    http::{HeaderValue, header::CONTENT_TYPE},
    routing::{get, post},
};
use dotenvy::dotenv;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;
use tower_http::cors::CorsLayer;

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
            "/events/{event_id}/time-slots",
            post(service::submit_time_slots::handler),
        )
        .with_state(pool)
        .layer(match env::var("ALLOW_ORIGIN") {
            Ok(origin) => {
                let value: HeaderValue = origin
                    .parse()
                    .expect("ALLOW_ORIGIN is not a valid header value");
                CorsLayer::new()
                    .allow_origin(value)
                    .allow_headers([CONTENT_TYPE])
            }
            Err(_) => CorsLayer::default(),
        });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind port 3000");

    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.expect("Server error");
}
