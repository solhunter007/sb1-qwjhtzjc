/*
  # Final Database Schema Fix
  
  This migration ensures all required tables and policies exist without dropping anything.
  It uses IF NOT EXISTS checks to safely create missing objects.
*/

-- Create tables if they don't exist
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
  votes_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id uuid REFERENCES creations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(creation_id, user_id)
);

-- Add username column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'creations' AND column_name = 'username'
  ) THEN
    ALTER TABLE creations ADD COLUMN username text GENERATED ALWAYS AS (
      (SELECT username FROM profiles WHERE user_id = creations.user_id)
    ) STORED;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_read_policy_final') THEN
    CREATE POLICY profiles_read_policy_final ON profiles
      FOR SELECT TO public USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_insert_policy_final') THEN
    CREATE POLICY profiles_insert_policy_final ON profiles
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_policy_final') THEN
    CREATE POLICY profiles_update_policy_final ON profiles
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creations_read_policy_final') THEN
    CREATE POLICY creations_read_policy_final ON creations
      FOR SELECT TO public USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creations_insert_policy_final') THEN
    CREATE POLICY creations_insert_policy_final ON creations
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'creations_update_policy_final') THEN
    CREATE POLICY creations_update_policy_final ON creations
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'votes_read_policy_final') THEN
    CREATE POLICY votes_read_policy_final ON votes
      FOR SELECT TO public USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'votes_insert_policy_final') THEN
    CREATE POLICY votes_insert_policy_final ON votes
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'votes_delete_policy_final') THEN
    CREATE POLICY votes_delete_policy_final ON votes
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create vote counting function if it doesn't exist
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

-- Create vote counting triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'votes_insert_trigger'
  ) THEN
    CREATE TRIGGER votes_insert_trigger
      AFTER INSERT ON votes
      FOR EACH ROW
      EXECUTE FUNCTION update_votes_count();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'votes_delete_trigger'
  ) THEN
    CREATE TRIGGER votes_delete_trigger
      AFTER DELETE ON votes
      FOR EACH ROW
      EXECUTE FUNCTION update_votes_count();
  END IF;
END $$;

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('creations', 'creations', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Create storage policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'creations_storage_read_policy_final') THEN
    CREATE POLICY creations_storage_read_policy_final
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'creations');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'creations_storage_insert_policy_final') THEN
    CREATE POLICY creations_storage_insert_policy_final
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'creations');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'creations_storage_update_policy_final') THEN
    CREATE POLICY creations_storage_update_policy_final
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'creations')
    WITH CHECK (bucket_id = 'creations');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'creations_storage_delete_policy_final') THEN
    CREATE POLICY creations_storage_delete_policy_final
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'creations');
  END IF;
END $$;