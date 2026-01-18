-- 124_sync_job_title.sql

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    auth_uid, 
    full_name, 
    email, 
    role_id, 
    verified, 
    phone, 
    avatar_url,
    job_title
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    NEW.email,
    'registered',
    (NEW.email_confirmed_at IS NOT NULL),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'job_title', 'registered')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
