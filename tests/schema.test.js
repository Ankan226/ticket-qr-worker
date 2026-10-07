import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";

const schemaSql = readFileSync(
  new URL("../db/schema.sql", import.meta.url),
  "utf8"
);

let SQL;
let db;

const scalar = (sql) => db.exec(sql)[0].values[0][0];

function seedBasics() {
  db.run(
    "INSERT INTO staff (id, email, full_name, role) VALUES ('s1', 'ankan@example.com', 'Ankan Pal', 'admin')"
  );
  db.run(
    `INSERT INTO events (id, name, venue, starts_at, ends_at, created_by)
     VALUES ('e1', 'Demo Event', 'Main Hall', '2026-11-01T10:00:00Z', '2026-11-01T18:00:00Z', 's1')`
  );
  db.run(
    `INSERT INTO tickets (id, event_id, holder_name, holder_email, ticket_code, created_by)
     VALUES ('t1', 'e1', 'Jane Doe', 'jane@example.com', 'TKT-0001', 's1')`
  );
}

function addJob(id, key) {
  db.run(
    "INSERT INTO qr_jobs (id, ticket_id, idempotency_key, requested_by) VALUES (?, 't1', ?, 's1')",
    [id, key]
  );
}

function addQr(id, jobId) {
  db.run(
    `INSERT INTO qr_codes (id, ticket_id, job_id, payload, signature, image_data)
     VALUES (?, 't1', ?, 'payload', 'sig', 'base64data')`,
    [id, jobId]
  );
}

beforeAll(async () => {
  SQL = await initSqlJs();
});

beforeEach(() => {
  db = new SQL.Database();
  db.exec(schemaSql);
});

describe("schema structure", () => {
  it("creates all expected tables", () => {
    const rows = db.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    )[0].values.flat();
    expect(rows).toEqual([
      "analytics_events",
      "events",
      "qr_codes",
      "qr_jobs",
      "scan_logs",
      "staff",
      "tickets",
    ]);
  });
});

describe("unhappy paths: invalid input is rejected", () => {
  it("rejects an invalid staff role", () => {
    expect(() =>
      db.run(
        "INSERT INTO staff (id, email, full_name, role) VALUES ('x', 'x@example.com', 'X', 'hacker')"
      )
    ).toThrow();
  });

  it("rejects a blank holder name", () => {
    seedBasics();
    expect(() =>
      db.run(
        `INSERT INTO tickets (id, event_id, holder_name, holder_email, ticket_code, created_by)
         VALUES ('t2', 'e1', '   ', 'a@example.com', 'TKT-0002', 's1')`
      )
    ).toThrow();
  });

  it("rejects duplicate ticket codes", () => {
    seedBasics();
    expect(() =>
      db.run(
        `INSERT INTO tickets (id, event_id, holder_name, holder_email, ticket_code, created_by)
         VALUES ('t2', 'e1', 'John', 'john@example.com', 'TKT-0001', 's1')`
      )
    ).toThrow();
  });

  it("rejects a ticket for a non-existent event (foreign key)", () => {
    seedBasics();
    expect(() =>
      db.run(
        `INSERT INTO tickets (id, event_id, holder_name, holder_email, ticket_code, created_by)
         VALUES ('t2', 'missing', 'John', 'john@example.com', 'TKT-0003', 's1')`
      )
    ).toThrow();
  });

  it("rejects an event that ends before it starts", () => {
    seedBasics();
    expect(() =>
      db.run(
        `INSERT INTO events (id, name, venue, starts_at, ends_at, created_by)
         VALUES ('e2', 'Bad', 'Hall', '2026-11-02T10:00:00Z', '2026-11-01T10:00:00Z', 's1')`
      )
    ).toThrow();
  });

  it("rejects an invalid job status", () => {
    seedBasics();
    expect(() =>
      db.run(
        `INSERT INTO qr_jobs (id, ticket_id, status, idempotency_key, requested_by)
         VALUES ('j1', 't1', 'exploded', 'k1', 's1')`
      )
    ).toThrow();
  });
});

describe("bad connectivity: retries are safe", () => {
  it("rejects a duplicate idempotency key so retries cannot double-create jobs", () => {
    seedBasics();
    addJob("j1", "same-key");
    expect(() => addJob("j2", "same-key")).toThrow();
  });
});

describe("QR code rules", () => {
  it("allows only one active QR code per ticket", () => {
    seedBasics();
    addJob("j1", "k1");
    addJob("j2", "k2");
    addQr("q1", "j1");
    expect(() => addQr("q2", "j2")).toThrow();
  });

  it("allows a new QR code after the old one is revoked", () => {
    seedBasics();
    addJob("j1", "k1");
    addJob("j2", "k2");
    addQr("q1", "j1");
    db.run("UPDATE qr_codes SET revoked_at = '2026-11-01T11:00:00Z' WHERE id = 'q1'");
    expect(() => addQr("q2", "j2")).not.toThrow();
  });
});

describe("empty states", () => {
  it("returns zero tickets for an event with no tickets (API must send an empty list)", () => {
    seedBasics();
    db.run(
      `INSERT INTO events (id, name, venue, starts_at, ends_at, created_by)
       VALUES ('e2', 'Empty Event', 'Hall', '2026-12-01T10:00:00Z', '2026-12-01T18:00:00Z', 's1')`
    );
    expect(scalar("SELECT COUNT(*) FROM tickets WHERE event_id = 'e2'")).toBe(0);
  });
});