-- Fix 1: handle_new_user trigger reads 'full_name' but RegisterForm sends 'display_name'
-- Fix 3: Auto-create a default persona row on signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  INSERT INTO public.users (auth_id, display_name, email)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.email
    ),
    new.email
  )
  RETURNING id INTO new_user_id;

  -- Auto-create a default persona so personalization works immediately
  INSERT INTO public.personas (user_id, version)
  VALUES (new_user_id, 1);

  RETURN new;
END;
$$;
