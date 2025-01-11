/*
  # Final Database Schema

  1. Tables
    - profiles: User profile information
    - creations: User-generated content
    - votes: Voting system
  2. Storage
    - creations bucket for storing images
  3. Policies
    - RLS policies for all tables
    - Storage policies for creations bucket
*/

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS creations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create tables with correct structure
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  votes_count integer DEFAULT 0
);

CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id uuid REFERENCES creations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(creation_id, user_id)
);

-- Add username to creations
ALTER TABLE creations ADD COLUMN username text GENERATED ALWAYS AS (
  (SELECT username FROM profiles WHERE user_id = creations.user_id)
) STORED;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies with unique names
CREATE POLICY "profiles_read_policy" ON profiles
  FOR SELECT TO public USING (true);

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "creations_read_policy" ON creations
  FOR SELECT TO public USING (true);

CREATE POLICY "creations_insert_policy" ON creations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creations_update_policy" ON creations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "votes_read_policy" ON votes
  FOR SELECT TO public USING (true);

CREATE POLICY "votes_insert_policy" ON votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_delete_policy" ON votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create vote counting function
CREATE OR REPLACE FUNCTION update_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE creations
    SET votes_count = votes_count + 1
    WHERE id = NEW.creation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE creations
    SET votes_count = votes_count - 1
    WHERE id = OLD.creation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create vote counting triggers
CREATE TRIGGER votes_insert_trigger
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_votes_count();

CREATE TRIGGER votes_delete_trigger
  AFTER DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_votes_count();

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('creations', 'creations', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Create storage policies
CREATE POLICY "creations_storage_read_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'creations');

CREATE POLICY "creations_storage_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'creations');

CREATE POLICY "creations_storage_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'creations')
WITH CHECK (bucket_id = 'creations');

CREATE POLICY "creations_storage_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'creations');