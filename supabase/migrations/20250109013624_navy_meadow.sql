/*
  # Create settings table and storage bucket

  1. New Tables
    - `settings`
      - `key` (text, primary key)
      - `value` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Storage
    - Create settings bucket for header images
    - Add storage policies for settings bucket

  3. Security
    - Enable RLS on settings table
    - Add policies for authenticated users
*/

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Settings public read access"
  ON settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Settings authenticated users insert"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Settings authenticated users update"
  ON settings FOR UPDATE
  TO authenticated
  USING (true);

-- Create settings bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings', 'settings', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for settings bucket
CREATE POLICY "Settings bucket public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'settings');

CREATE POLICY "Settings bucket authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'settings');

CREATE POLICY "Settings bucket authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'settings')
  WITH CHECK (bucket_id = 'settings');

CREATE POLICY "Settings bucket authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'settings');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();