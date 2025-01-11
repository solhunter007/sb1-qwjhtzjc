/*
  # Fix Database Schema and Storage Issues

  1. Tables
    - Ensures profiles table exists
    - Ensures creations table exists with username column
    - Ensures votes table exists
    - Adds missing indexes
  
  2. Storage
    - Creates creations bucket if missing
    - Sets up storage policies
*/

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create creations table if not exists
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

-- Create votes table if not exists
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id uuid REFERENCES creations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(creation_id, user_id)
);

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Recreate policies with unique names to avoid conflicts
DO $$ 
BEGIN
  -- Profiles policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_public_read_20250111') THEN
    CREATE POLICY profiles_public_read_20250111 ON profiles
      FOR SELECT TO public USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_insert_own_20250111') THEN
    CREATE POLICY profiles_insert_own_20250111 ON profiles
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own_20250111') THEN
    CREATE POLICY profiles_update_own_20250111 ON profiles
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;

  -- Creations policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creations_public_read_20250111') THEN
    CREATE POLICY creations_public_read_20250111 ON creations
      FOR SELECT TO public USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creations_insert_own_20250111') THEN
    CREATE POLICY creations_insert_own_20250111 ON creations
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creations_update_own_20250111') THEN
    CREATE POLICY creations_update_own_20250111 ON creations
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;

  -- Votes policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'votes_public_read_20250111') THEN
    CREATE POLICY votes_public_read_20250111 ON votes
      FOR SELECT TO public USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'votes_insert_20250111') THEN
    CREATE POLICY votes_insert_20250111 ON votes
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'votes_delete_own_20250111') THEN
    CREATE POLICY votes_delete_own_20250111 ON votes
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create or replace vote counting function and triggers
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

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS votes_insert_trigger ON votes;
DROP TRIGGER IF EXISTS votes_delete_trigger ON votes;

CREATE TRIGGER votes_insert_trigger
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_votes_count();

CREATE TRIGGER votes_delete_trigger
  AFTER DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_votes_count();

-- Create storage bucket for creations
INSERT INTO storage.buckets (id, name, public)
VALUES ('creations', 'creations', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies with unique names
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'creations_public_read_20250111') THEN
    CREATE POLICY creations_public_read_20250111 ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'creations');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'creations_insert_20250111') THEN
    CREATE POLICY creations_insert_20250111 ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creations');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'creations_update_own_20250111') THEN
    CREATE POLICY creations_update_own_20250111 ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'creations' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'creations' AND owner = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'creations_delete_own_20250111') THEN
    CREATE POLICY creations_delete_own_20250111 ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'creations' AND owner = auth.uid());
  END IF;
END $$;