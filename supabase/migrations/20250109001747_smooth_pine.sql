/*
  # Simplify overlay policies for authenticated users
  
  1. Security Changes
    - Allow any authenticated user to manage overlays
    - Keep public read access
    - Remove admin role requirement
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON overlays;
DROP POLICY IF EXISTS "Admin users can insert overlays" ON overlays;
DROP POLICY IF EXISTS "Admin users can update overlays" ON overlays;
DROP POLICY IF EXISTS "Admin users can delete overlays" ON overlays;

-- Create simplified policies
CREATE POLICY "Public read access"
  ON overlays FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert overlays"
  ON overlays FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update overlays"
  ON overlays FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete overlays"
  ON overlays FOR DELETE
  TO authenticated
  USING (true);

-- Update storage policies to allow any authenticated user
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects;

CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'overlays');

CREATE POLICY "Authenticated users can update files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'overlays')
  WITH CHECK (bucket_id = 'overlays');

CREATE POLICY "Authenticated users can delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'overlays');