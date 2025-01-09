/*
  # Create overlays table

  1. New Tables
    - `overlays`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `overlays` table
    - Add policies for:
      - Authenticated users can read all overlays
      - Admin users can create/update/delete overlays
*/

-- Create overlays table
CREATE TABLE IF NOT EXISTS overlays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE overlays ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read overlays"
  ON overlays
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert overlays"
  ON overlays
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can update overlays"
  ON overlays
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can delete overlays"
  ON overlays
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');