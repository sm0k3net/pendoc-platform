-- Create API tokens table for user authentication
CREATE TABLE public.api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tokens"
ON public.api_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tokens"
ON public.api_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
ON public.api_tokens
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
ON public.api_tokens
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for fast token lookups
CREATE INDEX idx_api_tokens_token ON public.api_tokens(token);
CREATE INDEX idx_api_tokens_user_id ON public.api_tokens(user_id);