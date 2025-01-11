/*
  # Fix Database Tables

  1. Changes
    - Ensure all required tables exist
    - Add proper indexes
    - Set up RLS policies
    - Fix storage policies

  2. Tables Created/Modified
    - profiles
    - creations
    - votes

  3. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS creations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create creations table
CREATE TABLE creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  votes_count integer DEFAULT 0
);

-- Create votes table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creations_user_id ON creations(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_creation_id ON votes(creation_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for profiles"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public read access for creations"
  ON creations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create creations"
  ON creations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creations"
  ON creations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public read access for votes"
  ON votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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
CREATE POLICY "Public read access for creations storage"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'creations');

CREATE POLICY "Users can upload creations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'creations');

CREATE POLICY "Users can update own creations storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'creations' AND owner = auth.uid());

CREATE POLICY "Users can delete own creations storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'creations' AND owner = auth.uid());