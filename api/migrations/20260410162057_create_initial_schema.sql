-- Create the events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,                             -- UUID for the event
    name TEXT NOT NULL,                              -- Name of the event
    description TEXT,                                -- Optional description
    starts_after DATETIME,                           -- Optional start time limit for the event
    ends_before DATETIME,                            -- Optional end time limit for the event
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP    -- Automatically set creation time
);

-- Create the attendees table
CREATE TABLE IF NOT EXISTS attendees (
    id TEXT PRIMARY KEY,                             -- UUID for the attendee
    event_id TEXT,                                   -- Foreign key referencing events
    name TEXT NOT NULL,                              -- Attendee's name
    emoji TEXT NOT NULL,                             -- Emoji for profile picture
    comment TEXT,                                    -- Optional comment from this attendee
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- Automatically set submission time of this attendee
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Create the time_slots table
CREATE TABLE IF NOT EXISTS time_slots (
    id TEXT PRIMARY KEY,                              -- UUID for the time slot
    attendee_id TEXT,                                 -- Foreign key referencing attendees
    start_time DATETIME NOT NULL,                     -- Start time of the time slot
    end_time DATETIME NOT NULL,                       -- End time of the time slot
    FOREIGN KEY (attendee_id) REFERENCES attendees(id)
);
