mod api;
mod pages;

use leptos::prelude::*;
use leptos_router::{
    components::{Route, Router, Routes},
    path,
};
use pages::{create_event::CreateEventPage, event_view::EventViewPage};

#[component]
fn App() -> impl IntoView {
    view! {
        <Router>
            <Routes fallback=|| view! { <p>"Page not found."</p> }>
                <Route path=path!("/") view=CreateEventPage />
                <Route path=path!("/:event_id") view=EventViewPage />
            </Routes>
        </Router>
    }
}

fn main() {
    leptos::mount::mount_to_body(App);
}
