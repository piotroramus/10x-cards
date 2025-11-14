-- migration: create initial schema for lang memo flashcard application
-- purpose: create cards and analytics_events tables with rls policies, indexes, and triggers
-- affected tables: cards, analytics_events
-- special considerations:
--   - all tables use rls for multi-tenant isolation
--   - cards table uses soft deletes (deleted_at column)
--   - analytics_events table supports 90-day retention policy
--   - triggers enforce user_id from auth context and auto-update timestamps

-- enable required extensions
-- pgcrypto is needed for gen_random_uuid() function
create extension if not exists "pgcrypto";

-- ============================================================================
-- cards table
-- ============================================================================
-- stores flashcard entities created by users
-- supports both ai-generated and manually created cards with soft delete functionality

create table cards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    front text not null check (char_length(front) <= 200),
    back text not null check (char_length(back) <= 500),
    origin text not null check (origin in ('ai', 'manual')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz null
);

-- indexes for cards table
-- index for chronological retrieval of user's cards (most common query pattern)
create index idx_cards_user_id_created_at on cards(user_id, created_at desc);

-- index for general filtering by user
create index idx_cards_user_id on cards(user_id);

-- index for soft delete filtering (optimizes queries that filter out deleted cards)
create index idx_cards_deleted_at on cards(deleted_at) where deleted_at is null;

-- enable row level security on cards table
-- rls ensures multi-tenant data isolation - users can only access their own cards
alter table cards enable row level security;

-- ============================================================================
-- analytics_events table
-- ============================================================================
-- tracks all analytics events for measuring kpis and user behavior
-- supports multiple event types with lightweight jsonb context

create table analytics_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    event_type text not null check (event_type in ('generate', 'accept', 'reject', 'manual_create', 'practice_done')),
    origin text null check (origin in ('ai', 'manual') or origin is null),
    context jsonb null,
    created_at timestamptz not null default now()
);

-- indexes for analytics_events table
-- index for filtering events by type (common analytics query pattern)
create index idx_analytics_events_event_type on analytics_events(event_type);

-- index for filtering events by user
create index idx_analytics_events_user_id on analytics_events(user_id);

-- index for retention cleanup queries (supports 90-day deletion policy)
create index idx_analytics_events_created_at on analytics_events(created_at);

-- composite index for user-specific event type queries (optimizes high-volume scenarios)
create index idx_analytics_events_user_event on analytics_events(user_id, event_type);

-- enable row level security on analytics_events table
-- rls ensures multi-tenant data isolation - users can only access their own events
alter table analytics_events enable row level security;

-- ============================================================================
-- row level security policies for cards table
-- ============================================================================
-- policies are granular: one policy per operation per role (anon and authenticated)
-- all policies ensure users can only access their own data

-- select policy for authenticated users
-- allows users to view their own active (non-deleted) cards
create policy cards_select_authenticated on cards
    for select
    to authenticated
    using (auth.uid() = user_id and deleted_at is null);

-- select policy for anon users
-- anon users cannot view cards (returns false for all rows)
create policy cards_select_anon on cards
    for select
    to anon
    using (false);

-- insert policy for authenticated users
-- allows users to create cards for themselves (prevents setting other users' ids)
create policy cards_insert_authenticated on cards
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- insert policy for anon users
-- anon users cannot create cards
create policy cards_insert_anon on cards
    for insert
    to anon
    with check (false);

-- update policy for authenticated users
-- allows users to update their own active cards
create policy cards_update_authenticated on cards
    for update
    to authenticated
    using (auth.uid() = user_id and deleted_at is null)
    with check (auth.uid() = user_id and deleted_at is null);

-- update policy for anon users
-- anon users cannot update cards
create policy cards_update_anon on cards
    for update
    to anon
    using (false)
    with check (false);

-- delete policy for authenticated users
-- allows users to hard delete their own active cards (rarely used, soft delete preferred)
-- note: soft deletes are implemented via update to set deleted_at
create policy cards_delete_authenticated on cards
    for delete
    to authenticated
    using (auth.uid() = user_id and deleted_at is null);

-- delete policy for anon users
-- anon users cannot delete cards
create policy cards_delete_anon on cards
    for delete
    to anon
    using (false);

-- ============================================================================
-- row level security policies for analytics_events table
-- ============================================================================
-- policies are granular: one policy per operation per role (anon and authenticated)
-- all policies ensure users can only access their own data

-- select policy for authenticated users
-- allows users to view their own analytics events
create policy analytics_events_select_authenticated on analytics_events
    for select
    to authenticated
    using (auth.uid() = user_id);

-- select policy for anon users
-- anon users cannot view analytics events
create policy analytics_events_select_anon on analytics_events
    for select
    to anon
    using (false);

-- insert policy for authenticated users
-- allows users to create events for themselves (prevents setting other users' ids)
create policy analytics_events_insert_authenticated on analytics_events
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- insert policy for anon users
-- anon users cannot create analytics events
create policy analytics_events_insert_anon on analytics_events
    for insert
    to anon
    with check (false);

-- update policy for authenticated users
-- allows users to update their own events (rarely used, but included for completeness)
create policy analytics_events_update_authenticated on analytics_events
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- update policy for anon users
-- anon users cannot update analytics events
create policy analytics_events_update_anon on analytics_events
    for update
    to anon
    using (false)
    with check (false);

-- delete policy for authenticated users
-- allows users to delete their own events (rarely used, but included for completeness)
create policy analytics_events_delete_authenticated on analytics_events
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- delete policy for anon users
-- anon users cannot delete analytics events
create policy analytics_events_delete_anon on analytics_events
    for delete
    to anon
    using (false);

-- ============================================================================
-- database functions
-- ============================================================================

-- function: update_updated_at_column
-- purpose: automatically update updated_at timestamp on row modification
-- used by: trigger_set_updated_at on cards table
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- function: set_user_id_from_auth
-- purpose: automatically set user_id from auth.uid() on insert to prevent unauthorized user_id assignment
-- provides additional security layer beyond rls policies
-- used by: trigger_set_user_id_cards and trigger_set_user_id_analytics
create or replace function set_user_id_from_auth()
returns trigger as $$
begin
    -- enforce that user_id matches the authenticated user's id
    -- if user_id is null or doesn't match auth.uid(), override it
    if new.user_id is null or new.user_id != auth.uid() then
        new.user_id = auth.uid();
    end if;
    return new;
end;
$$ language plpgsql;

-- ============================================================================
-- triggers
-- ============================================================================

-- trigger: trigger_set_updated_at
-- purpose: automatically update updated_at column when a card is modified
-- fires: before update on cards table
create trigger trigger_set_updated_at
    before update on cards
    for each row
    execute function update_updated_at_column();

-- trigger: trigger_set_user_id_cards
-- purpose: enforce user_id matches auth.uid() on insert for cards table
-- provides security layer to prevent unauthorized user_id assignment
-- fires: before insert on cards table
create trigger trigger_set_user_id_cards
    before insert on cards
    for each row
    execute function set_user_id_from_auth();

-- trigger: trigger_set_user_id_analytics
-- purpose: enforce user_id matches auth.uid() on insert for analytics_events table
-- provides security layer to prevent unauthorized user_id assignment
-- fires: before insert on analytics_events table
create trigger trigger_set_user_id_analytics
    before insert on analytics_events
    for each row
    execute function set_user_id_from_auth();

