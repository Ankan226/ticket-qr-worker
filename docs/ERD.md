# Entity Relationship Diagram

```mermaid
erDiagram
    STAFF ||--o{ EVENTS : creates
    STAFF ||--o{ TICKETS : issues
    STAFF ||--o{ QR_JOBS : requests
    STAFF ||--o{ SCAN_LOGS : performs
    STAFF ||--o{ ANALYTICS_EVENTS : triggers
    EVENTS ||--o{ TICKETS : contains
    TICKETS ||--o{ QR_JOBS : "has jobs"
    TICKETS ||--o{ QR_CODES : owns
    QR_JOBS ||--o| QR_CODES : produces
    QR_CODES ||--o{ SCAN_LOGS : "is scanned in"

    STAFF {
        text id PK
        text email UK
        text full_name
        text role
        int is_active
    }
    EVENTS {
        text id PK
        text name
        text venue
        text starts_at
        text ends_at
        text status
        text created_by FK
    }
    TICKETS {
        text id PK
        text event_id FK
        text holder_name
        text holder_email
        text ticket_code UK
        text status
    }
    QR_JOBS {
        text id PK
        text ticket_id FK
        text status
        int attempts
        text idempotency_key UK
    }
    QR_CODES {
        text id PK
        text ticket_id FK
        text job_id FK
        text payload
        text signature
        text revoked_at
    }
    SCAN_LOGS {
        text id PK
        text qr_code_id FK
        text scanned_by FK
        text result
    }
    ANALYTICS_EVENTS {
        text id PK
        text staff_id FK
        text event_name
    }
```

## Design decisions

- **Idempotency key on `qr_jobs`**: a spotty connection can retry a request safely without creating duplicate jobs.
- **Partial unique index on `qr_codes`**: only one active QR per ticket, while revoked ones stay for audit.
- **`scan_logs` is append-only**: every gate scan is recorded, valid or not.
- **CHECK constraints**: bad data is rejected by the database itself, as a second line of defence behind API validation.