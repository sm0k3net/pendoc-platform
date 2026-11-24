-- Add environment enum
CREATE TYPE public.project_environment AS ENUM ('external', 'internal', 'both');

-- Add project model enum
CREATE TYPE public.project_model AS ENUM ('black_box', 'gray_box', 'white_box');

-- Add new columns to projects table
ALTER TABLE public.projects
ADD COLUMN environment public.project_environment DEFAULT NULL,
ADD COLUMN model_external public.project_model DEFAULT NULL,
ADD COLUMN model_internal public.project_model DEFAULT NULL,
ADD COLUMN rules_of_engagement TEXT DEFAULT NULL,
ADD COLUMN scope JSONB DEFAULT '{"fqdns": [], "urls": [], "ips": [], "mobile_apps": [], "emails": [], "phone_numbers": []}'::jsonb,
ADD COLUMN start_date DATE DEFAULT NULL,
ADD COLUMN end_date DATE DEFAULT NULL;