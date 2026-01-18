-- Migration: 002_add_job_title_to_user_profiles.sql

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS job_title text CHECK (job_title IN ('pilot', 'mech', 'atc', 'ground', 'staff', 'registered')) DEFAULT 'registered';

-- Update RLS if necessary (usually not needed for just adding a column if policies are simple select/update)
-- But we might want to ensure users can verify/change their job title? 
-- For now, let's allow them to update it via the existing update_own_profile policy.
