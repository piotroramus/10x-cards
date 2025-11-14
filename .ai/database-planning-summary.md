<conversation_summary>
<decisions>
1. Use Supabase Auth (`auth.users`) directly for user management without creating a separate `user_profiles` table. All user-related data (cards, analytics) will reference `auth.users.id` directly via foreign keys.

2. Implement one-to-many relationship between users and cards (user has many cards), with soft deletes using a `deletedAt` timestamp column instead of hard deletes to support analytics and potential recovery, while filtering deleted cards in queries using RLS policies.

3. Use a single `analytics_events` table with an `event_type` enum column (generate, accept, reject, manual_create, practice_done) to simplify queries, enable consistent retention policies, and support future event types. Include indexes on `event_type`, `user_id`, and `created_at` for efficient filtering and 90-day retention cleanup.

4. Use `TEXT` data type for both `front` and `back` fields in the cards table to avoid truncation issues, and enforce character limits (front ≤ 200, back ≤ 500) via CHECK constraints at the database level as a final validation layer, in addition to application-level validation.

5. For MVP, only record `practice_done` events in analytics with minimal context (card count, correct count). Avoid a separate `practice_sessions` table to keep the schema simple. If future features require session history, add it later.

6. Create a composite index on `(user_id, created_at DESC)` for efficient retrieval of a user's cards in chronological order, and a separate index on `user_id` for filtering. For practice shuffling, consider using PostgreSQL's `TABLESAMPLE` or application-level shuffling after fetching, as database-level random ordering can be expensive at scale.

7. Use a `CHECK` constraint to ensure `origin` is either 'ai' or 'manual' (non-nullable), and use an enum type or CHECK constraint for data integrity. This prevents invalid values and makes queries more efficient than free-text strings.

8. For MVP, avoid partitioning unless analytics volume is expected to be very high. Instead, implement a scheduled job (via Supabase Edge Function or pg_cron) to delete events older than 90 days. If retention becomes a performance issue, consider partitioning by `created_at` using PostgreSQL's native partitioning.

9. Implement RLS policies on both `cards` and `analytics_events` tables using `auth.uid() = user_id` for SELECT, INSERT, UPDATE, and DELETE operations. Enable RLS on both tables and ensure the `user_id` column is set via triggers or application logic to prevent unauthorized access.

10. Defer adding `collection_id` column to the cards table until collections are implemented. Adding it now would require handling NULL values or default values, complicate RLS policies, and add unnecessary complexity. When collections are added post-MVP, migrate existing cards to a default collection via a database migration.
</decisions>

<matched_recommendations>
1. User management: Use Supabase Auth (`auth.users`) directly without additional profile tables, keeping the schema simple and leveraging built-in authentication features.

2. Cards relationship: One-to-many with soft deletes via `deletedAt` timestamp for analytics and recovery support.

3. Analytics architecture: Single `analytics_events` table with `event_type` enum and strategic indexes for performance and retention.

4. Data types and validation: `TEXT` fields with CHECK constraints for character limits as database-level validation.

5. Practice tracking: Analytics-only approach for MVP, avoiding separate sessions table to maintain simplicity.

6. Indexing strategy: Composite index on `(user_id, created_at DESC)` plus application-level shuffling for practice mode.

7. Origin field: Non-nullable CHECK constraint with enum-like values ('ai' or 'manual') for data integrity.

8. Retention management: Scheduled job approach for 90-day cleanup, deferring partitioning until needed.

9. Security model: RLS policies on all user-facing tables using `auth.uid() = user_id` pattern for multi-tenant isolation.

10. Schema evolution: Defer `collection_id` until feature is implemented to avoid premature complexity.
</matched_recommendations>

<database_planning_summary>

## Main Requirements for Database Schema

The database schema must support a flashcard application (Lang Memo) with the following core requirements:

### Core Entities
- **Users**: Authentication handled by Supabase Auth (`auth.users`) directly, no additional profile tables needed
- **Cards**: Flashcard entities with `front` (≤200 chars), `back` (≤500 chars), `origin` (ai|manual), timestamps, and soft delete support
- **Analytics Events**: Single table tracking all event types (generate, accept, reject, manual_create, practice_done) with 90-day retention

### Data Integrity Requirements
- Character limits enforced at database level via CHECK constraints (front ≤ 200, back ≤ 500)
- `origin` field must be non-nullable with CHECK constraint ensuring only 'ai' or 'manual' values
- All user-related data must be associated with authenticated users via `user_id` foreign keys
- Soft deletes implemented for cards to support analytics and potential recovery

### Security Requirements
- Row Level Security (RLS) enabled on all user-facing tables
- RLS policies enforce `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE operations
- `user_id` must be set via triggers or application logic to prevent unauthorized access
- Multi-tenant data isolation at the database level

### Performance Requirements
- Composite index on `cards(user_id, created_at DESC)` for efficient chronological retrieval
- Index on `user_id` for filtering operations
- Indexes on `analytics_events(event_type, user_id, created_at)` for efficient filtering and retention cleanup
- Application-level shuffling for practice mode to avoid expensive database-level random ordering

## Key Entities and Their Relationships

### Entity Relationship Model

1. **auth.users** (Supabase managed)
   - Primary key: `id` (UUID)
   - Managed by Supabase Auth system
   - Used directly by all user-related tables via foreign keys

2. **cards** (public schema)
   - Primary key: `id` (UUID)
   - Foreign key: `user_id` → `auth.users.id`
   - Fields: `front` (TEXT, ≤200), `back` (TEXT, ≤500), `origin` (CHECK: 'ai'|'manual'), `createdAt`, `updatedAt`, `deletedAt` (nullable, for soft deletes)
   - Relationship: Many-to-one with users (one user has many cards)
   - Indexes: `(user_id, created_at DESC)`, `(user_id)`

3. **analytics_events** (public schema)
   - Primary key: `id` (UUID)
   - Foreign key: `user_id` → `auth.users.id`
   - Fields: `event_type` (enum: generate, accept, reject, manual_create, practice_done), `timestamp`, `user_id`, `origin` (nullable, where applicable), `context` (JSONB, lightweight)
   - Relationship: Many-to-one with users (one user has many events)
   - Indexes: `(event_type)`, `(user_id)`, `(created_at)`
   - Retention: 90 days (managed via scheduled job)

### Relationship Summary
- Users → Cards: One-to-many (user has many cards)
- Users → Analytics Events: One-to-many (user has many events)

## Important Security and Scalability Concerns

### Security Concerns

1. **Row Level Security (RLS)**
   - Must be enabled on `cards` and `analytics_events` tables
   - All policies must use `auth.uid() = user_id` pattern
   - Policies required for: SELECT, INSERT, UPDATE, DELETE operations
   - Prevents cross-user data access and unauthorized modifications

2. **Data Validation**
   - Database-level CHECK constraints serve as final validation layer
   - Prevents data corruption even if application validation is bypassed
   - Character limits enforced at schema level (front ≤ 200, back ≤ 500)

3. **User ID Assignment**
   - `user_id` must be set via database triggers or application logic
   - Prevents users from creating records for other users
   - Critical for RLS policy effectiveness

### Scalability Concerns

1. **Analytics Retention**
   - 90-day retention policy requires scheduled cleanup job
   - Initial approach: Supabase Edge Function or pg_cron scheduled job
   - Future consideration: Partitioning by `created_at` if volume becomes high
   - Indexes on `created_at` support efficient deletion queries

2. **Practice Mode Performance**
   - Database-level random ordering can be expensive at scale
   - Recommended: Application-level shuffling after fetching user's cards
   - Alternative: PostgreSQL `TABLESAMPLE` for large datasets
   - Composite index `(user_id, created_at DESC)` supports efficient card retrieval

3. **Indexing Strategy**
   - Composite index on `(user_id, created_at DESC)` optimizes chronological card listing
   - Separate `user_id` index supports filtering operations
   - Analytics indexes on `event_type`, `user_id`, and `created_at` support efficient queries and cleanup

4. **Schema Evolution**
   - Deferring `collection_id` until collections feature is implemented
   - Avoids premature complexity and NULL handling
   - Migration strategy planned for post-MVP collection support

5. **Soft Deletes**
   - `deletedAt` timestamp enables analytics and recovery
   - RLS policies must filter out deleted cards in SELECT queries
   - No hard deletes to maintain data integrity for analytics

## MVP Constraints and Simplifications

1. **No Collections Support**: Single default collection; `collection_id` deferred
2. **No Practice Sessions Table**: Only `practice_done` events in analytics
3. **No Partitioning**: Scheduled job approach for retention, partitioning deferred
4. **Simple Analytics**: Minimal context in events (card count, correct count)
5. **English-Only**: No internationalization considerations in schema

</database_planning_summary>

<unresolved_issues>
1. **Scheduled Job Implementation**: The specific mechanism for implementing the 90-day retention cleanup (Supabase Edge Function vs. pg_cron) needs to be determined during implementation based on Supabase project configuration and preferences.

2. **Trigger vs. Application Logic for user_id**: Whether to use database triggers or application logic to set `user_id` on insert needs to be finalized during implementation, considering maintainability and performance trade-offs.

3. **Analytics Context Schema**: The exact structure of the `context` JSONB field in `analytics_events` needs to be defined during implementation, particularly for `practice_done` events (card count, correct count format).

4. **Soft Delete Query Patterns**: The specific RLS policy implementation for filtering soft-deleted cards needs to be finalized to ensure consistent behavior across all queries while maintaining performance.

5. **Index Maintenance**: Monitoring strategy for index performance as data volume grows should be established, particularly for the analytics_events table with high write volume.

</unresolved_issues>
</conversation_summary>

