use clockwork_dto::{create_event, create_time_selection, get_event};
use gloo_net::http::Request;

const API_BASE: &str = "http://localhost:3000";

pub async fn create_event(
    req: &create_event::Request,
) -> Result<create_event::Response, String> {
    let resp = Request::post(&format!("{API_BASE}/events"))
        .json(req)
        .map_err(|e| e.to_string())?
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.ok() {
        resp.json().await.map_err(|e| e.to_string())
    } else {
        Err(format!("Server error: {}", resp.status()))
    }
}

pub async fn get_event(event_id: &str) -> Result<get_event::Response, String> {
    let resp = Request::get(&format!("{API_BASE}/events/{event_id}"))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status() == 404 {
        return Err("Event not found".into());
    }
    if resp.ok() {
        resp.json().await.map_err(|e| e.to_string())
    } else {
        Err(format!("Server error: {}", resp.status()))
    }
}

pub async fn create_time_selection(
    event_id: &str,
    req: &create_time_selection::Request,
) -> Result<create_time_selection::Response, String> {
    let resp = Request::post(&format!("{API_BASE}/events/{event_id}/time-selections"))
        .json(req)
        .map_err(|e| e.to_string())?
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.ok() {
        resp.json().await.map_err(|e| e.to_string())
    } else {
        Err(format!("Server error: {}", resp.status()))
    }
}
