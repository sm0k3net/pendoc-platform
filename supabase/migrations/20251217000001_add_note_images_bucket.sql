-- Create a public storage bucket for note images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-images', 
  'note-images', 
  true,
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload images to their own folder
CREATE POLICY "Users can upload note images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'note-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view note images (public bucket)
CREATE POLICY "Anyone can view note images" ON storage.objects
FOR SELECT USING (bucket_id = 'note-images');

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own note images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'note-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
