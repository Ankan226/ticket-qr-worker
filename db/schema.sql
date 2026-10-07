PRAGMA foreign_keys = ON;

CREATE TABLE staff (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
  role        TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'floor_staff')),
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE events (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
  venue       TEXT NOT NULL,
  starts_at   TEXT NOT NULL,
  ends_at     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'active', 'closed')),
  created_by  TEXT NOT NULL REFERENCES staff(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_at > starts_at)
);

CREATE TABLE tickets (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL REFERENCES events(id),
  holder_name   TEXT NOT NULL CHECK (length(trim(holder_name)) > 0),
  holder_email  TEXT NOT NULL,
  ticket_code   TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'issued'
                CHECK (status IN ('issued', 'checked_in', 'cancelled')),
  created_by    TEXT NOT NULL REFERENCES staff(id),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE qr_jobs (
  id               TEXT PRIMARY KEY,
  ticket_id        TEXT NOT NULL REFERENCES tickets(id),
  status           TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  attempts         INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts     INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  last_error       TEXT,
  idempotency_key  TEXT NOT NULL UNIQUE,
  requested_by     TEXT NOT NULL REFERENCES staff(id),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  started_at       TEXT,
  finished_at      TEXT
);

CREATE TABLE qr_codes (
  id            TEXT PRIMARY KEY,
  ticket_id     TEXT NOT NULL REFERENCES tickets(id),
  job_id        TEXT NOT NULL UNIQUE REFERENCES qr_jobs(id),
  payload       TEXT NOT NULL,
  signature     TEXT NOT NULL,
  image_format  TEXT NOT NULL DEFAULT 'png' CHECK (image_format IN ('png', 'svg')),
  image_data    TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at    TEXT
);

CREATE UNIQUE INDEX ux_qr_codes_active_per_ticket
  ON qr_codes(ticket_id) WHERE revoked_at IS NULL;

CREATE TABLE scan_logs (
  id          TEXT PRIMARY KEY,
  qr_code_id  TEXT NOT NULL REFERENCES qr_codes(id),
  scanned_by  TEXT NOT NULL REFERENCES staff(id),
  result      TEXT NOT NULL
              CHECK (result IN ('valid', 'already_used', 'revoked', 'invalid_signature', 'cancelled')),
  scanned_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE analytics_events (
  id           TEXT PRIMARY KEY,
  staff_id     TEXT REFERENCES staff(id),
  event_name   TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX ix_tickets_event      ON tickets(event_id);
CREATE INDEX ix_tickets_holder     ON tickets(holder_name);
CREATE INDEX ix_qr_jobs_status     ON qr_jobs(status, created_at);
CREATE INDEX ix_qr_jobs_ticket     ON qr_jobs(ticket_id);
CREATE INDEX ix_scan_logs_qr       ON scan_logs(qr_code_id, scanned_at);
CREATE INDEX ix_analytics_name     ON analytics_events(event_name, created_at);