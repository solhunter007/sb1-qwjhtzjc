/*
  # Update overlay table policies

  1. Security Changes
    - Allow public read access to overlays
    - Allow admin users to manage overlays without user_id restriction
    - Remove user_id requirement from overlays table
*/

-- First make user_id nullable since we want to allow admin operations
ALTER TABLE overlays ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read overlays" ON overlays;
DROP POLICY IF EXISTS "Admin users can insert overlays" ON overlays;
DROP POLICY IF EXISTS "Admin users can update overlays" ON overlays;
DROP POLICY IF EXISTS "Admin users can delete overlays" ON overlays;

-- Create new policies
CREATE POLICY "Public read access"
  ON overlays FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin users can insert overlays"
  ON overlays FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can update overlays"
  ON overlays FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can delete overlays"
  ON overlays FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');