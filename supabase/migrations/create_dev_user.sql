-- Migration: Create development user for testing when DISABLE_AUTH=true
-- Purpose: Create a user in auth.users table that matches the mock user ID
-- This allows the foreign key constraint to be satisfied when auth is disabled

-- Insert a development user into auth.users
-- This user will be used when DISABLE_AUTH=true
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'dev@example.com',
    crypt('dev-password', gen_salt('bf')), -- Password is not used when auth is disabled
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Also create the user in auth.identities table (required by Supabase Auth)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    '{"sub": "00000000-0000-0000-0000-000000000000", "email": "dev@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
) ON CONFLICT DO NOTHING;


