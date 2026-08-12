mod cleanup;
mod db;
mod dto;
mod service;
mod validation;

use axum::{
    Router,
    http::{HeaderName, HeaderValue, Method, header::CONTENT_TYPE},
    routing::{delete, get, post},
};
use dotenvy::dotenv;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;
use tower_http::cors::CorsLayer;

use service::TOKEN_HEADER;

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

    cleanup::spawn(pool.clone());

    // Attendees pass their submission token in this header to prove
    // ownership when editing/deleting — it's non-standard, so it needs to
    // be explicitly allowed or CORS preflight will strip it.
    let token_header = HeaderName::from_static(TOKEN_HEADER);

    let app = Router::new()
        .route("/events", post(service::create_event::handler))
        .route("/events/{event_id}", get(service::get_event::handler))
        .route(
            "/events/{event_id}/time-slots",
            post(service::submit_time_slots::handler),
        )
        .route(
            "/events/{event_id}/attendees/{attendee_id}",
            delete(service::delete_attendee::handler).put(service::update_attendee::handler),
        )
        .with_state(pool)
        .layer(match env::var("ALLOW_ORIGIN") {
            Ok(origin) => {
                let value: HeaderValue = origin
                    .parse()
                    .expect("ALLOW_ORIGIN is not a valid header value");
                CorsLayer::new()
                    .allow_origin(value)
                    .allow_headers([CONTENT_TYPE, token_header])
                    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            }
            Err(_) => CorsLayer::new()
                .allow_headers([CONTENT_TYPE, token_header])
                .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE]),
        });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind port 3000");

    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.expect("Server error");
}
