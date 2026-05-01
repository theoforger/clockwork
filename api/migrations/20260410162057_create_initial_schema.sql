-- Create the events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,                             -- UUID for the event
    name TEXT NOT NULL,                              -- Name of the event
    description TEXT,                                -- Optional description
    starts_after DATETIME,                           -- Optional start time limit for the event
    ends_before DATETIME,                             -- Optional end time limit for the event
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP    -- Automatically set creation time
);

-- Create the attendees table
CREATE TABLE IF NOT EXISTS attendees (
    id TEXT PRIMARY KEY,                             -- UUID for the attendee
    event_id TEXT,                                   -- Foreign key referencing events
    name TEXT NOT NULL,                              -- Attendee's name
    emoji TEXT,                                      -- Optional emoji for profile picture
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Create the time_selections table
CREATE TABLE IF NOT EXISTS time_selections (
    id TEXT PRIMARY KEY,                              -- UUID for the time selection
    attendee_id TEXT,                                 -- Foreign key referencing attendees
    start_time DATETIME NOT NULL,                     -- Start time of the selected time range
    end_time DATETIME NOT NULL,                       -- End time of the selected time range
    comment TEXT,                                     -- Optional comment for this time selection
    FOREIGN KEY (attendee_id) REFERENCES attendees(id)
);
