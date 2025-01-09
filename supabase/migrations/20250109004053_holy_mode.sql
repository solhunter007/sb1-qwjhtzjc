/*
  # Create base images table and storage

  1. New Tables
    - `base_images`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)

  2. Storage
    - Create base_images bucket
    - Set up storage policies

  3. Security
    - Enable RLS
    - Add policies for public read access
    - Add policies for authenticated users to manage base images
*/

-- Create base_images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('base_images', 'base_images', true)
ON CONFLICT (id) DO NOTHING;

-- Create base_images table
CREATE TABLE IF NOT EXISTS base_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE base_images ENABLE ROW LEVEL SECURITY;

-- Create policies for base_images table
CREATE POLICY "Base images public read access"
  ON base_images FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Base images authenticated insert"
  ON base_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Base images authenticated update"
  ON base_images FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Base images authenticated delete"
  ON base_images FOR DELETE
  TO authenticated
  USING (true);

-- Create storage policies for base_images bucket
CREATE POLICY "Base images storage read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'base_images');

CREATE POLICY "Base images storage insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'base_images');

CREATE POLICY "Base images storage update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'base_images')
  WITH CHECK (bucket_id = 'base_images');

CREATE POLICY "Base images storage delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'base_images');