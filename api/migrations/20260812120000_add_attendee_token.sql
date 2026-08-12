-- Per-attendee secret, generated at submission time and returned to the
-- submitter exactly once (never included in GET /events/{id}, where the
-- attendee id itself is public). Required to edit or delete a submission,
-- so ownership is enforced by the server instead of just hidden in the UI.
ALTER TABLE attendees ADD COLUMN token TEXT;
