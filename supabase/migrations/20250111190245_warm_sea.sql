/*
  # Fix Database Schema and Policies

  1. Tables
    - Ensures profiles, creations, and votes tables exist
    - Adds missing columns and constraints
  2. Storage
    - Ensures creations bucket exists
    - Updates storage policies
*/

-- Ensure tables exist with correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  votes_count integer DEFAULT 0,
  username text GENERATED ALWAYS AS (
    (SELECT username FROM profiles WHERE user_id = creations.user_id)
  ) STORED
);

CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id uuid REFERENCES creations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(creation_id, user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "profiles_public_read_20250111" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_20250111" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_20250111" ON profiles;
DROP POLICY IF EXISTS "creations_public_read_20250111" ON creations;
DROP POLICY IF EXISTS "creations_insert_own_20250111" ON creations;
DROP POLICY IF EXISTS "creations_update_own_20250111" ON creations;
DROP POLICY IF EXISTS "votes_public_read_20250111" ON votes;
DROP POLICY IF EXISTS "votes_insert_20250111" ON votes;
DROP POLICY IF EXISTS "votes_delete_own_20250111" ON votes;

-- Create new policies with unique names
CREATE POLICY "profiles_read_20250111_fix" ON profiles
  FOR SELECT TO public USING (true);

CREATE POLICY "profiles_insert_20250111_fix" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_20250111_fix" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "creations_read_20250111_fix" ON creations
  FOR SELECT TO public USING (true);

CREATE POLICY "creations_insert_20250111_fix" ON creations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creations_update_20250111_fix" ON creations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "votes_read_20250111_fix" ON votes
  FOR SELECT TO public USING (true);

CREATE POLICY "votes_insert_20250111_fix" ON votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_delete_20250111_fix" ON votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Ensure storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('creations', 'creations', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop any conflicting storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- Create new storage policies
CREATE POLICY "creations_read_20250111_fix"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'creations');

CREATE POLICY "creations_upload_20250111_fix"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'creations');

CREATE POLICY "creations_update_20250111_fix"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'creations')
WITH CHECK (bucket_id = 'creations');

CREATE POLICY "creations_delete_20250111_fix"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'creations');