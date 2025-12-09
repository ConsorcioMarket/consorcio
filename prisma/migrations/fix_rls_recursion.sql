-- Fix infinite recursion in profiles_pf policies

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles_pf;

-- The "Users can view own profile" policy is sufficient for now
-- Admin access can be handled via service role key or a separate approach

-- Alternatively, we can use auth.jwt() to check role without querying the table
-- But for simplicity, we'll just allow users to manage their own profiles
