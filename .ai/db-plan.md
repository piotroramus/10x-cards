# Database Schema - Lang Memo

## Overview

This document defines the PostgreSQL database schema for Lang Memo, a flashcard application built on Supabase. The schema supports AI-generated and manually created flashcards, user authentication via Supabase Auth, and analytics tracking with 90-day retention.

## Design Principles

- **Multi-tenant isolation**: All user data is isolated using Row Level Security (RLS) policies
- **Soft deletes**: Cards use soft deletes (`deleted_at`) to support analytics and potential recovery
- **Data integrity**: Database-level constraints enforce character limits and data validation
- **Performance**: Strategic indexes optimize common query patterns
- **Simplicity**: MVP-focused schema without premature complexity (no collections, no practice sessions table)

## Tables

### 1. cards

Stores flashcard entities created by users. Supports both AI-generated and manually created cards with soft delete functionality.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique identifier for the card |
| `user_id` | `UUID` | NOT NULL, FOREIGN KEY → `auth.users.id` | Owner of the card (references Supabase Auth user) |
| `front` | `TEXT` | NOT NULL, CHECK `char_length(front) <= 200` | Front side of the flashcard (max 200 characters) |
| `back` | `TEXT` | NOT NULL, CHECK `char_length(back) <= 500` | Back side of the flashcard (max 500 characters) |
| `origin` | `TEXT` | NOT NULL, CHECK `origin IN ('ai', 'manual')` | Source of the card: 'ai' for AI-generated, 'manual' for user-created |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Timestamp when the card was created |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Timestamp when the card was last updated |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft delete timestamp (NULL = active, non-NULL = deleted) |

**Relationships:**
- Many-to-one with `auth.users` (one user has many cards)

**Indexes:**
- `idx_cards_user_id_created_at` on `(user_id, created_at DESC)` - Optimizes chronological retrieval of user's cards
- `idx_cards_user_id` on `(user_id)` - Optimizes filtering by user
- `idx_cards_deleted_at` on `(deleted_at)` - Optimizes soft delete filtering (optional, for large datasets)

**Triggers:**
- `trigger_set_updated_at` - Automatically updates `updated_at` on row modification

### 2. analytics_events

Tracks all analytics events for measuring KPIs and user behavior. Supports multiple event types with lightweight JSONB context.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique identifier for the event |
| `user_id` | `UUID` | NOT NULL, FOREIGN KEY → `auth.users.id` | User who triggered the event |
| `event_type` | `TEXT` | NOT NULL, CHECK `event_type IN ('generate', 'accept', 'reject', 'manual_create', 'practice_done')` | Type of event being tracked |
| `origin` | `TEXT` | NULL, CHECK `origin IN ('ai', 'manual')` OR `origin IS NULL` | Origin of the card/action ('ai' or 'manual'), NULL for non-card events |
| `context` | `JSONB` | NULL | Lightweight context data (e.g., `{"card_count": 5, "correct_count": 4}` for practice_done) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Timestamp when the event occurred |

**Relationships:**
- Many-to-one with `auth.users` (one user has many events)

**Indexes:**
- `idx_analytics_events_event_type` on `(event_type)` - Optimizes filtering by event type
- `idx_analytics_events_user_id` on `(user_id)` - Optimizes filtering by user
- `idx_analytics_events_created_at` on `(created_at)` - Optimizes retention cleanup queries (90-day deletion)
- `idx_analytics_events_user_event` on `(user_id, event_type)` - Optimizes user-specific event queries (optional, for high-volume scenarios)

**Retention Policy:**
- Events older than 90 days should be deleted via scheduled job (Supabase Edge Function or pg_cron)
- Index on `created_at` supports efficient cleanup queries

## Relationships

### Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    ├── cards (one-to-many)
    │   └── user_id → auth.users.id
    │
    └── analytics_events (one-to-many)
        └── user_id → auth.users.id
```

### Relationship Details

1. **Users → Cards**: One-to-many
   - One user can have many cards
   - Foreign key: `cards.user_id` → `auth.users.id`
   - Cascade behavior: Consider CASCADE DELETE for hard deletes (if implemented post-MVP)

2. **Users → Analytics Events**: One-to-many
   - One user can have many analytics events
   - Foreign key: `analytics_events.user_id` → `auth.users.id`
   - Cascade behavior: Consider CASCADE DELETE for user deletion (if implemented post-MVP)

## Indexes

### Performance Indexes

1. **cards table:**
   - `idx_cards_user_id_created_at` on `(user_id, created_at DESC)`
     - Purpose: Efficient chronological retrieval of user's cards
     - Query pattern: `SELECT * FROM cards WHERE user_id = ? ORDER BY created_at DESC`
   
   - `idx_cards_user_id` on `(user_id)`
     - Purpose: General filtering by user
     - Query pattern: `SELECT * FROM cards WHERE user_id = ? AND deleted_at IS NULL`

   - `idx_cards_deleted_at` on `(deleted_at)` (optional)
     - Purpose: Optimize soft delete filtering for large datasets
     - Query pattern: `SELECT * FROM cards WHERE user_id = ? AND deleted_at IS NULL`

2. **analytics_events table:**
   - `idx_analytics_events_event_type` on `(event_type)`
     - Purpose: Filter events by type for analytics queries
     - Query pattern: `SELECT * FROM analytics_events WHERE event_type = ?`
   
   - `idx_analytics_events_user_id` on `(user_id)`
     - Purpose: Filter events by user
     - Query pattern: `SELECT * FROM analytics_events WHERE user_id = ?`
   
   - `idx_analytics_events_created_at` on `(created_at)`
     - Purpose: Support 90-day retention cleanup queries
     - Query pattern: `DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days'`
   
   - `idx_analytics_events_user_event` on `(user_id, event_type)` (optional)
     - Purpose: Optimize user-specific event type queries
     - Query pattern: `SELECT * FROM analytics_events WHERE user_id = ? AND event_type = ?`

## Row Level Security (RLS) Policies

RLS is enabled on all user-facing tables to ensure multi-tenant data isolation. All policies use the `auth.uid() = user_id` pattern to restrict access to authenticated users' own data.

### cards table policies

**Policy: `cards_select_own`**
- Operation: SELECT
- Definition: `auth.uid() = user_id AND deleted_at IS NULL`
- Purpose: Users can only view their own active (non-deleted) cards

**Policy: `cards_insert_own`**
- Operation: INSERT
- Definition: `auth.uid() = user_id`
- Purpose: Users can only create cards for themselves (prevents setting other users' IDs)

**Policy: `cards_update_own`**
- Operation: UPDATE
- Definition: `auth.uid() = user_id AND deleted_at IS NULL`
- Purpose: Users can only update their own active cards

**Policy: `cards_delete_own`**
- Operation: DELETE (soft delete via UPDATE)
- Definition: `auth.uid() = user_id AND deleted_at IS NULL`
- Purpose: Users can only soft-delete their own active cards (via UPDATE to set `deleted_at`)

**Note:** Hard DELETE operations are not used. Soft deletes are implemented by updating `deleted_at`. If hard DELETE is needed for cleanup, a separate policy can be added.

### analytics_events table policies

**Policy: `analytics_events_select_own`**
- Operation: SELECT
- Definition: `auth.uid() = user_id`
- Purpose: Users can only view their own analytics events

**Policy: `analytics_events_insert_own`**
- Operation: INSERT
- Definition: `auth.uid() = user_id`
- Purpose: Users can only create events for themselves (prevents setting other users' IDs)

**Policy: `analytics_events_update_own`**
- Operation: UPDATE
- Definition: `auth.uid() = user_id`
- Purpose: Users can only update their own events (rarely used, but included for completeness)

**Policy: `analytics_events_delete_own`**
- Operation: DELETE
- Definition: `auth.uid() = user_id`
- Purpose: Users can only delete their own events (rarely used, but included for completeness)

## Database Functions and Triggers

### Trigger: `set_updated_at`

**Function:** `update_updated_at_column()`
- Purpose: Automatically update `updated_at` timestamp on row modification
- Applied to: `cards` table
- Trigger: `BEFORE UPDATE ON cards`

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Trigger: `set_user_id_on_insert` (Optional)

**Function:** `set_user_id_from_auth()`
- Purpose: Automatically set `user_id` from `auth.uid()` on INSERT to prevent unauthorized user_id assignment
- Applied to: `cards` and `analytics_events` tables
- Trigger: `BEFORE INSERT ON cards`, `BEFORE INSERT ON analytics_events`

**Note:** This trigger is optional. If application logic ensures `user_id` is set correctly, the trigger can be omitted. However, the trigger provides an additional security layer.

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION set_user_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL OR NEW.user_id != auth.uid() THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_user_id_cards
    BEFORE INSERT ON cards
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id_from_auth();

CREATE TRIGGER trigger_set_user_id_analytics
    BEFORE INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id_from_auth();
```

## Data Validation

### CHECK Constraints

1. **cards.front**: `char_length(front) <= 200`
   - Enforces maximum 200 characters for card front
   - Database-level validation as final layer

2. **cards.back**: `char_length(back) <= 500`
   - Enforces maximum 500 characters for card back
   - Database-level validation as final layer

3. **cards.origin**: `origin IN ('ai', 'manual')`
   - Ensures only valid origin values
   - Non-nullable to maintain data integrity

4. **analytics_events.event_type**: `event_type IN ('generate', 'accept', 'reject', 'manual_create', 'practice_done')`
   - Ensures only valid event types
   - Supports future event types via schema migration

5. **analytics_events.origin**: `origin IN ('ai', 'manual') OR origin IS NULL`
   - Ensures valid origin values when present
   - NULL allowed for events without origin context (e.g., 'generate')

## Analytics Context Schema

The `context` JSONB field in `analytics_events` stores lightweight event-specific data. Below are the expected structures for each event type:

### Event Type Context Structures

1. **generate**
   - Structure: `{}` (empty or minimal metadata)
   - Note: No raw source text stored per privacy requirements

2. **accept**
   - Structure: `{}` or `{"card_id": "uuid"}` (optional)
   - Note: Card ID can be included if needed for analytics

3. **reject**
   - Structure: `{}` (empty)
   - Note: No additional context needed

4. **manual_create**
   - Structure: `{}` or `{"card_id": "uuid"}` (optional)
   - Note: Card ID can be included if needed for analytics

5. **practice_done**
   - Structure: `{"card_count": number, "correct_count": number}`
   - Example: `{"card_count": 10, "correct_count": 8}`
   - Note: Minimal context for MVP; can be extended post-MVP

## Soft Delete Implementation

### Query Patterns

When querying cards, always filter out soft-deleted cards:

```sql
-- Active cards only
SELECT * FROM cards 
WHERE user_id = auth.uid() 
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Include deleted cards (for admin/analytics)
SELECT * FROM cards 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Soft Delete Operation

Soft delete is implemented via UPDATE:

```sql
-- Soft delete a card
UPDATE cards 
SET deleted_at = now() 
WHERE id = ? AND user_id = auth.uid() AND deleted_at IS NULL;
```

### Recovery (if needed)

To recover a soft-deleted card:

```sql
UPDATE cards 
SET deleted_at = NULL 
WHERE id = ? AND user_id = auth.uid() AND deleted_at IS NOT NULL;
```

## Retention Policy

### Analytics Events Cleanup

Analytics events older than 90 days should be deleted via a scheduled job. Two implementation options:

1. **Supabase Edge Function** (recommended for managed Supabase)
   - Scheduled via Supabase Cron or external scheduler
   - Function deletes events older than 90 days

2. **pg_cron** (if available in Supabase instance)
   - Native PostgreSQL extension for scheduled jobs
   - Direct database-level scheduling

**Cleanup Query:**
```sql
DELETE FROM analytics_events 
WHERE created_at < NOW() - INTERVAL '90 days';
```

**Index Support:**
- Index on `created_at` ensures efficient deletion queries
- Consider running during low-traffic periods

## Future Schema Evolution

### Deferred Features (Post-MVP)

1. **Collections/Decks**
   - Add `collection_id` column to `cards` table
   - Create `collections` table with RLS policies
   - Migrate existing cards to default collection

2. **Practice Sessions**
   - Create `practice_sessions` table if detailed session history is needed
   - Link to `analytics_events` or replace `practice_done` events

3. **Spaced Repetition**
   - Add scheduling fields to `cards` table (e.g., `next_review_at`, `interval_days`, `ease_factor`)
   - Consider separate `card_schedules` table for complex algorithms

4. **Partitioning**
   - Partition `analytics_events` by `created_at` if volume becomes high
   - Use PostgreSQL native partitioning (RANGE by month/quarter)

## Migration Notes

### Initial Schema Creation

1. Create tables in order: `cards`, then `analytics_events` (no dependencies between them)
2. Create indexes after table creation for better performance
3. Enable RLS on both tables
4. Create RLS policies
5. Create triggers for `updated_at` and optional `user_id` enforcement

### Data Migration Considerations

- No initial data migration needed (fresh schema)
- When adding `collection_id` post-MVP, migrate existing cards to default collection
- When implementing hard deletes, consider data archival strategy

## Security Considerations

1. **RLS Enforcement**: All user-facing tables must have RLS enabled
2. **User ID Validation**: Triggers or application logic must ensure `user_id` matches `auth.uid()`
3. **Input Sanitization**: Application layer should sanitize user input before storage
4. **SQL Injection**: Use parameterized queries (Supabase client handles this)
5. **Privacy**: No raw source text stored in database or analytics (enforced at application layer)

## Performance Considerations

1. **Practice Mode Shuffling**: Use application-level shuffling after fetching cards (avoid expensive `ORDER BY RANDOM()`)
2. **Index Maintenance**: Monitor index usage and performance as data grows
3. **Analytics Volume**: Monitor `analytics_events` table size; implement partitioning if needed
4. **Soft Delete Queries**: Always include `deleted_at IS NULL` in WHERE clauses for active card queries
5. **Connection Pooling**: Use Supabase connection pooling for production workloads

## Additional Notes

1. **Supabase Auth Integration**: The schema relies on Supabase's `auth.users` table, which is managed by Supabase Auth. No modifications to this table are needed.

2. **UUID Generation**: Using `gen_random_uuid()` for primary keys. Ensure the `pgcrypto` extension is enabled.

3. **Timezone Handling**: Using `TIMESTAMPTZ` (timestamp with timezone) for all timestamp columns to ensure consistent timezone handling.

4. **JSONB Context**: The `context` JSONB field in `analytics_events` is intentionally flexible to support future event types without schema changes.

5. **Character Limits**: Database-level CHECK constraints serve as the final validation layer. Application-level validation should also be implemented for better user experience.

6. **No Collections in MVP**: The schema intentionally omits collection/deck management. All cards belong to a single implicit default collection. This simplifies the MVP and can be added later via migration.

