-- Drop existing restrictive policies on projects
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON public.projects;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Users can manage their own projects" 
ON public.projects 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view shared projects" 
ON public.projects 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM shares s
  WHERE s.resource_type = 'project'
    AND s.resource_id = projects.id
    AND s.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
));

-- Fix clients table
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage their own clients" 
ON public.clients 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);