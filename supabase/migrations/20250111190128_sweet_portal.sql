/*
  # Fix Storage Permissions

  1. Storage
    - Ensures creations bucket exists with proper configuration
    - Updates storage policies to allow uploads
    - Adds missing permissions
*/

-- Ensure the creations bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('creations', 'creations', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "creations_public_read_20250111" ON storage.objects;
DROP POLICY IF EXISTS "creations_insert_20250111" ON storage.objects;
DROP POLICY IF EXISTS "creations_update_own_20250111" ON storage.objects;
DROP POLICY IF EXISTS "creations_delete_own_20250111" ON storage.objects;

-- Create simplified storage policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'creations');

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'creations');

CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'creations')
WITH CHECK (bucket_id = 'creations');

CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'creations');