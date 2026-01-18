-- 125_update_job_title_constraint.sql

-- Drop the old constraint
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_job_title_check;

-- Add new constraint with 'met' added
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_job_title_check 
CHECK (job_title IN ('pilot', 'mech', 'atc', 'ground', 'staff', 'registered', 'met'));
