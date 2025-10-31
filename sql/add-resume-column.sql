-- Add resume_text column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_text TEXT;

-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS get_user_profile_with_school(uuid);

-- Create the get_user_profile_with_school function to include resume_text
CREATE FUNCTION get_user_profile_with_school(user_uuid UUID)
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
    resume_text TEXT,
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
        p.resume_text,
        p.profile_completed
    FROM profiles p
    LEFT JOIN schools s ON p.school_id = s.id
    WHERE p.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;