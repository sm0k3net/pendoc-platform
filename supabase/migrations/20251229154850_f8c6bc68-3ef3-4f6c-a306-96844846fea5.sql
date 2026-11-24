-- Create note-images bucket for storing embedded images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for public image access
CREATE POLICY "Public access for note images"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-images');

-- Policy for users to upload their own images
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);