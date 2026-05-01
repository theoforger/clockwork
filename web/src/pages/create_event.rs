use clockwork_dto::create_event;
use leptos::prelude::*;
use leptos_router::hooks::use_navigate;

use crate::api;

#[component]
pub fn CreateEventPage() -> impl IntoView {
    let name = RwSignal::new(String::new());
    let description = RwSignal::new(String::new());
    let starts_after = RwSignal::new(String::new());
    let ends_before = RwSignal::new(String::new());
    let error = RwSignal::new(Option::<String>::None);
    let loading = RwSignal::new(false);

    let navigate = use_navigate();

    let on_submit = move |ev: leptos::ev::SubmitEvent| {
        ev.prevent_default();

        let req = create_event::Request {
            name: name.get(),
            description: {
                let d = description.get();
                if d.is_empty() { None } else { Some(d) }
            },
            starts_after: starts_after
                .get()
                .parse()
                .ok(),
            ends_before: ends_before
                .get()
                .parse()
                .ok(),
        };

        loading.set(true);
        error.set(None);

        let navigate = navigate.clone();
        leptos::task::spawn_local(async move {
            match api::create_event(&req).await {
                Ok(resp) => {
                    navigate(&format!("/{}", resp.id), Default::default());
                }
                Err(e) => {
                    error.set(Some(e));
                    loading.set(false);
                }
            }
        });
    };

    view! {
        <div class="page create-event">
            <h1>"Create Event"</h1>
            <form on:submit=on_submit>
                <label>
                    "Name"
                    <input
                        type="text"
                        required
                        placeholder="e.g. Team Sync"
                        prop:value=name
                        on:input=move |ev| name.set(event_target_value(&ev))
                    />
                </label>

                <label>
                    "Description"
                    <textarea
                        placeholder="Optional description"
                        prop:value=description
                        on:input=move |ev| description.set(event_target_value(&ev))
                    />
                </label>

                <label>
                    "Earliest slot start"
                    <input
                        type="datetime-local"
                        prop:value=starts_after
                        on:input=move |ev| starts_after.set(event_target_value(&ev))
                    />
                </label>

                <label>
                    "Latest slot end"
                    <input
                        type="datetime-local"
                        prop:value=ends_before
                        on:input=move |ev| ends_before.set(event_target_value(&ev))
                    />
                </label>

                {move || error.get().map(|e| view! { <p class="error">{e}</p> })}

                <button type="submit" disabled=loading>
                    {move || if loading.get() { "Creating…" } else { "Create Event" }}
                </button>
            </form>
        </div>
    }
}
