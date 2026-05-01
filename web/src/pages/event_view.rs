use clockwork_dto::create_time_selection::{self, TimeSlot};
use clockwork_dto::get_event;
use leptos::prelude::*;
use leptos_router::hooks::use_params_map;

use crate::api;

// ── Time-selection submission form ────────────────────────────────────────────

#[derive(Clone)]
struct SlotDraft {
    start_time: RwSignal<String>,
    end_time: RwSignal<String>,
    comment: RwSignal<String>,
}

impl SlotDraft {
    fn new() -> Self {
        Self {
            start_time: RwSignal::new(String::new()),
            end_time: RwSignal::new(String::new()),
            comment: RwSignal::new(String::new()),
        }
    }
}

#[component]
fn SubmitForm(event_id: String, on_submitted: Callback<()>) -> impl IntoView {
    let attendee_name = RwSignal::new(String::new());
    let attendee_emoji = RwSignal::new(String::new());
    let slots: RwSignal<Vec<SlotDraft>> = RwSignal::new(vec![SlotDraft::new()]);
    let error = RwSignal::new(Option::<String>::None);
    let loading = RwSignal::new(false);

    let add_slot = move |_| slots.update(|v| v.push(SlotDraft::new()));

    let remove_slot = move |idx: usize| {
        slots.update(|v| {
            if v.len() > 1 {
                v.remove(idx);
            }
        });
    };

    let on_submit = {
        let event_id = event_id.clone();
        move |ev: leptos::ev::SubmitEvent| {
            ev.prevent_default();

            let time_slots = slots
                .get()
                .iter()
                .filter_map(|s| {
                    let start = s.start_time.get().replace('T', " ");
                    let end = s.end_time.get().replace('T', " ");
                    let comment = {
                        let c = s.comment.get();
                        if c.is_empty() { None } else { Some(c) }
                    };
                    Some(TimeSlot {
                        start_time: start.parse().ok()?,
                        end_time: end.parse().ok()?,
                        comment,
                    })
                })
                .collect::<Vec<_>>();

            if time_slots.is_empty() {
                error.set(Some("Please fill in at least one valid time slot.".into()));
                return;
            }

            let req = create_time_selection::Request {
                attendee_name: attendee_name.get(),
                attendee_emoji: {
                    let e = attendee_emoji.get();
                    if e.is_empty() { None } else { Some(e) }
                },
                time_slots,
            };

            loading.set(true);
            error.set(None);

            let event_id = event_id.clone();
            leptos::task::spawn_local(async move {
                match api::create_time_selection(&event_id, &req).await {
                    Ok(_) => {
                        on_submitted.run(());
                    }
                    Err(e) => {
                        error.set(Some(e));
                        loading.set(false);
                    }
                }
            });
        }
    };

    view! {
        <section class="submit-form">
            <h2>"Submit your availability"</h2>
            <form on:submit=on_submit>
                <div class="attendee-info">
                    <label>
                        "Your name"
                        <input
                            type="text"
                            required
                            placeholder="Alice"
                            prop:value=attendee_name
                            on:input=move |ev| attendee_name.set(event_target_value(&ev))
                        />
                    </label>
                    <label>
                        "Emoji (optional)"
                        <input
                            type="text"
                            placeholder="🦊"
                            maxlength="2"
                            prop:value=attendee_emoji
                            on:input=move |ev| attendee_emoji.set(event_target_value(&ev))
                        />
                    </label>
                </div>

                <div class="slots">
                    <h3>"Time slots"</h3>
                    {move || {
                        slots
                            .get()
                            .into_iter()
                            .enumerate()
                            .map(|(i, slot)| {
                                view! {
                                    <div class="slot">
                                        <label>
                                            "From"
                                            <input
                                                type="datetime-local"
                                                required
                                                prop:value=slot.start_time
                                                on:input=move |ev| {
                                                    slot.start_time.set(event_target_value(&ev))
                                                }
                                            />
                                        </label>
                                        <label>
                                            "To"
                                            <input
                                                type="datetime-local"
                                                required
                                                prop:value=slot.end_time
                                                on:input=move |ev| {
                                                    slot.end_time.set(event_target_value(&ev))
                                                }
                                            />
                                        </label>
                                        <label>
                                            "Comment"
                                            <input
                                                type="text"
                                                placeholder="Optional note"
                                                prop:value=slot.comment
                                                on:input=move |ev| {
                                                    slot.comment.set(event_target_value(&ev))
                                                }
                                            />
                                        </label>
                                        {move || {
                                            (slots.get().len() > 1)
                                                .then(|| {
                                                    view! {
                                                        <button
                                                            type="button"
                                                            class="remove-slot"
                                                            on:click=move |_| remove_slot(i)
                                                        >
                                                            "Remove"
                                                        </button>
                                                    }
                                                })
                                        }}
                                    </div>
                                }
                            })
                            .collect_view()
                    }}
                    <button type="button" class="add-slot" on:click=add_slot>
                        "+ Add time slot"
                    </button>
                </div>

                {move || error.get().map(|e| view! { <p class="error">{e}</p> })}

                <button type="submit" disabled=loading>
                    {move || if loading.get() { "Submitting…" } else { "Submit availability" }}
                </button>
            </form>
        </section>
    }
}

// ── Attendee list ─────────────────────────────────────────────────────────────

#[component]
fn AttendeeList(attendees: Vec<get_event::Attendee>) -> impl IntoView {
    view! {
        <section class="attendees">
            <h2>"Submissions"</h2>
            {if attendees.is_empty() {
                view! { <p class="empty">"No submissions yet."</p> }.into_any()
            } else {
                attendees
                    .into_iter()
                    .map(|a| {
                        let display_name = match &a.emoji {
                            Some(e) => format!("{} {}", e, a.name),
                            None => a.name.clone(),
                        };
                        view! {
                            <div class="attendee">
                                <h3>{display_name}</h3>
                                <ul>
                                    {a.time_selections
                                        .into_iter()
                                        .map(|s| {
                                            view! {
                                                <li>
                                                    <span class="time">
                                                        {format!(
                                                            "{} — {}",
                                                            s.start_time,
                                                            s.end_time,
                                                        )}
                                                    </span>
                                                    {s.comment.map(|c| {
                                                        view! { <span class="comment">": "{c}</span> }
                                                    })}
                                                </li>
                                            }
                                        })
                                        .collect_view()}
                                </ul>
                            </div>
                        }
                    })
                    .collect_view()
                    .into_any()
            }}
        </section>
    }
}

// ── Page ─────────────────────────────────────────────────────────────────────

#[component]
pub fn EventViewPage() -> impl IntoView {
    let params = use_params_map();
    let event_id = move || params.read().get("event_id").unwrap_or_default();

    let event_data: LocalResource<Result<get_event::Response, String>> =
        LocalResource::new(move || {
            let id = event_id();
            async move { api::get_event(&id).await }
        });

    // Incrementing this triggers a refetch after a successful submission.
    let refresh = RwSignal::new(0u32);

    let on_submitted = Callback::new(move |_| {
        refresh.update(|n| *n += 1);
        event_data.refetch();
    });

    view! {
        <div class="page event-view">
            {move || {
                match event_data.read().as_ref().map(|r| r.clone()) {
                    None => view! { <p class="loading">"Loading…"</p> }.into_any(),
                    Some(Err(e)) => view! { <p class="error">{e}</p> }.into_any(),
                    Some(Ok(event)) => {
                        let share_url = format!(
                            "{}://{}{}",
                            web_sys::window()
                                .unwrap()
                                .location()
                                .protocol()
                                .unwrap_or_default(),
                            web_sys::window()
                                .unwrap()
                                .location()
                                .host()
                                .unwrap_or_default(),
                            web_sys::window()
                                .unwrap()
                                .location()
                                .pathname()
                                .unwrap_or_default(),
                        );
                        let event_id_for_form = event_id();
                        view! {
                            <div>
                                <header class="event-header">
                                    <h1>{event.name.clone()}</h1>
                                    {event
                                        .description
                                        .map(|d| view! { <p class="description">{d}</p> })}
                                    <div class="share">
                                        <span>"Share: "</span>
                                        <code>{share_url}</code>
                                    </div>
                                </header>

                                <AttendeeList attendees=event.attendees />

                                <SubmitForm
                                    event_id=event_id_for_form
                                    on_submitted=on_submitted
                                />
                            </div>
                        }
                        .into_any()
                    }
                }
            }}
        </div>
    }
}
