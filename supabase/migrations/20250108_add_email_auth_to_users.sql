-- Add auth_provider column to track authentication method
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'apple';

-- Create index on email for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on auth_id for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Make email unique if not already
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_email' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
    END IF;
END $$;

-- Update comments to clarify the purpose of these columns
COMMENT ON COLUMN users.email IS 'User email address for magic link authentication';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: apple or email';
COMMENT ON COLUMN users.auth_id IS 'Reference to Supabase auth.users table';

-- Make apple_id nullable since email auth users won't have it
ALTER TABLE users ALTER COLUMN apple_id DROP NOT NULL;