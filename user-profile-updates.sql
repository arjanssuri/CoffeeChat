-- Update schools table to include logo URLs
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update UT Austin with logo
UPDATE schools
SET logo_url = '/images/utaustin.png'
WHERE name = 'University of Texas at Austin';

-- Create or update profiles table to ensure it has all necessary fields
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  school_id UUID REFERENCES schools(id),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  graduation_year INTEGER,
  major TEXT,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add profile_completed column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON profiles
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON profiles
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON profiles
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Function to get user profile with school info
CREATE OR REPLACE FUNCTION get_user_profile_with_school(user_uuid UUID)
RETURNS TABLE (
    profile_id UUID,
    user_id UUID,
    school_id UUID,
    school_name TEXT,
    school_logo_url TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    graduation_year INTEGER,
    major TEXT,
    profile_completed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        p.school_id,
        s.name,
        s.logo_url,
        p.first_name,
        p.last_name,
        p.email,
        p.graduation_year,
        p.major,
        p.profile_completed
    FROM profiles p
    LEFT JOIN schools s ON p.school_id = s.id
    WHERE p.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;