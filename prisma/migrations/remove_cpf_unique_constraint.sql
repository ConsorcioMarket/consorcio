-- Remove unique constraint on cpf column
-- CPF can now be null and doesn't need to be unique
-- Validation can be handled at the application level

-- Drop the unique constraint
ALTER TABLE profiles_pf DROP CONSTRAINT IF EXISTS profiles_pf_cpf_key;

-- Make cpf column nullable
ALTER TABLE profiles_pf ALTER COLUMN cpf DROP NOT NULL;

-- Update any empty string cpf values to null
UPDATE profiles_pf SET cpf = NULL WHERE cpf = '';
