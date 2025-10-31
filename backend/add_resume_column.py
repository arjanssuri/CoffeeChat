#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from database import get_supabase_client

def add_resume_column():
    supabase = get_supabase_client()

    # Add resume_text column
    sql_add_column = """
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_text TEXT;
    """

    # Update function to include resume_text
    sql_update_function = """
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
    """

    try:
        print("Adding resume_text column to profiles table...")
        result1 = supabase.rpc('exec', {'sql': sql_add_column}).execute()
        print("✅ Column added successfully")

        print("Updating get_user_profile_with_school function...")
        result2 = supabase.rpc('exec', {'sql': sql_update_function}).execute()
        print("✅ Function updated successfully")

        print("✅ Database schema updated successfully!")

    except Exception as e:
        print(f"❌ Error updating database schema: {e}")
        print("Please run the SQL commands manually in your Supabase SQL editor:")
        print("\n--- SQL Commands ---")
        print(sql_add_column)
        print(sql_update_function)

if __name__ == "__main__":
    add_resume_column()