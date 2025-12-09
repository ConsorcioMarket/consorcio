-- Disable the problematic trigger that was causing signup 500 errors
-- Profile creation is now handled in the frontend (AuthContext.tsx signUp function)

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Optionally drop the function (uncomment if you want to fully clean up)
-- DROP FUNCTION IF EXISTS public.handle_new_user();
