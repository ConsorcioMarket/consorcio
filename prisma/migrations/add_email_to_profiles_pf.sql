-- Add email column to profiles_pf table
-- This column stores the user's email for easy access without joining auth.users

ALTER TABLE profiles_pf ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

-- Update existing profiles with email from auth.users
UPDATE profiles_pf
SET email = auth.users.email
FROM auth.users
WHERE profiles_pf.id = auth.users.id::text
AND (profiles_pf.email IS NULL OR profiles_pf.email = '');
