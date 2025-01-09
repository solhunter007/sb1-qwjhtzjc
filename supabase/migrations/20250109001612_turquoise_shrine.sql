/*
  # Create storage bucket for overlays

  1. Storage
    - Create public bucket named 'overlays' for storing overlay images
    - Enable public access to allow image serving
*/

-- Create the storage bucket for overlays
INSERT INTO storage.buckets (id, name, public)
VALUES ('overlays', 'overlays', true);

-- Allow public access to the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'overlays');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'overlays');

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'overlays' AND owner = auth.uid())
WITH CHECK (bucket_id = 'overlays' AND owner = auth.uid());

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'overlays' AND owner = auth.uid());