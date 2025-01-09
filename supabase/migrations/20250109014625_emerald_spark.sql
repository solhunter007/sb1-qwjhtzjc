/*
  # Create settings table and policies

  1. New Tables
    - `settings`
      - `key` (text, primary key)
      - `value` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on settings table
    - Add policies for public read and authenticated write access
    - Add trigger for updating timestamps
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

-- Create policies with unique names
CREATE POLICY "settings_read_policy"
  ON settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "settings_insert_policy"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "settings_update_policy"
  ON settings FOR UPDATE
  TO authenticated
  USING (true);

-- Create settings bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings', 'settings', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies with unique names
CREATE POLICY "settings_storage_read_policy"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'settings');

CREATE POLICY "settings_storage_insert_policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'settings');

CREATE POLICY "settings_storage_update_policy"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'settings')
  WITH CHECK (bucket_id = 'settings');

CREATE POLICY "settings_storage_delete_policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'settings');

-- Create trigger to update updated_at timestamp with unique name
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'settings_update_timestamp_trigger') THEN
    CREATE TRIGGER settings_update_timestamp_trigger
      BEFORE UPDATE ON settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert initial header image setting with empty value
INSERT INTO settings (key, value)
VALUES ('header_image', '')
ON CONFLICT (key) DO NOTHING;