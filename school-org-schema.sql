-- Schools and Organizations Schema Extension

-- Create schools table
CREATE TABLE schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  domain TEXT, -- e.g., "stanford.edu"
  location TEXT,
  type TEXT CHECK (type IN ('university', 'college', 'community_college', 'high_school')) DEFAULT 'university',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table for user profiles
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  school_id UUID REFERENCES schools(id),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  graduation_year INTEGER,
  major TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organizations table
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('fraternity', 'sorority', 'club', 'honor_society', 'professional', 'academic', 'service', 'recreational', 'religious', 'cultural', 'other')) DEFAULT 'club',
  description TEXT,
  website_url TEXT,
  application_deadline DATE,
  application_requirements TEXT,
  contact_email TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- Create table to track which organizations users have applied to
CREATE TABLE user_org_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  application_status TEXT CHECK (application_status IN ('interested', 'applied', 'interviewed', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'interested',
  application_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Create table for org scrape requests when users submit new orgs
CREATE TABLE org_scrape_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  org_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  suggested_type TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  organization_id UUID REFERENCES organizations(id), -- Set when org is created
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_org_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_scrape_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools (public read, admin write)
CREATE POLICY "Anyone can view schools" ON schools
  FOR SELECT USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for organizations (public read for same school)
CREATE POLICY "Users can view organizations at their school" ON organizations
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_org_applications
CREATE POLICY "Users can view their own org applications" ON user_org_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own org applications" ON user_org_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own org applications" ON user_org_applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own org applications" ON user_org_applications
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for org_scrape_requests
CREATE POLICY "Users can view their own scrape requests" ON org_scrape_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scrape requests" ON org_scrape_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_org_applications_updated_at BEFORE UPDATE ON user_org_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_scrape_requests_updated_at BEFORE UPDATE ON org_scrape_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert UT Austin as primary school
INSERT INTO schools (name, domain, location, type) VALUES
  ('University of Texas at Austin', 'utexas.edu', 'Austin, TX', 'university');

-- Insert UT Austin organizations
INSERT INTO organizations (school_id, name, type, description, website_url, is_verified) VALUES
  (
    (SELECT id FROM schools WHERE name = 'University of Texas at Austin'),
    'Longhorn Racing',
    'academic',
    'Formula SAE racing team at UT Austin',
    'https://www.longhornracing.org/',
    true
  ),
  (
    (SELECT id FROM schools WHERE name = 'University of Texas at Austin'),
    'USIT QMI',
    'professional',
    'Quantitative Management & Investment club under USIT',
    'https://usitqmi.com/',
    true
  ),
  (
    (SELECT id FROM schools WHERE name = 'University of Texas at Austin'),
    'USIT',
    'professional',
    'Undergraduate Students in Information Technology',
    'https://www.texasusit.org',
    true
  ),
  (
    (SELECT id FROM schools WHERE name = 'University of Texas at Austin'),
    'TUIT',
    'professional',
    'Texas Undergraduate Investment Team',
    'https://www.texasuit.com',
    true
  ),
  (
    (SELECT id FROM schools WHERE name = 'University of Texas at Austin'),
    'Convergent',
    'professional',
    'Texas Convergent - Technology and Innovation organization',
    'https://txconvergent.com',
    true
  ),
  (
    (SELECT id FROM schools WHERE name = 'University of Texas at Austin'),
    'Blockchain at Texas',
    'professional',
    'Texas Blockchain organization',
    'https://www.texasblockchain.org/',
    true
  ),
  (
    (SELECT id FROM schools WHERE name = 'University of Texas at Austin'),
    'Texas Finance Team',
    'professional',
    'Undergraduate finance and investment organization',
    'https://www.texasfteam.org/',
    true
  ),
  (
    (SELECT id FROM schools WHERE name = 'University of Texas at Austin'),
    'Texas Stock Team',
    'professional',
    'Student-run stock analysis and investment club',
    'https://texasstockteam.com/',
    true
  );

-- Function to get popular organizations at a school (for analytics)
CREATE OR REPLACE FUNCTION get_popular_organizations(school_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  org_type TEXT,
  application_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.type,
    COUNT(uoa.id) as application_count
  FROM organizations o
  LEFT JOIN user_org_applications uoa ON o.id = uoa.organization_id
  WHERE o.school_id = school_uuid
  GROUP BY o.id, o.name, o.type
  ORDER BY application_count DESC, o.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can see organization applications
CREATE OR REPLACE FUNCTION can_view_org_applications(org_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_school_id UUID;
  org_school_id UUID;
BEGIN
  -- Get user's school
  SELECT school_id INTO user_school_id
  FROM profiles
  WHERE user_id = auth.uid();

  -- Get organization's school
  SELECT school_id INTO org_school_id
  FROM organizations
  WHERE id = org_uuid;

  -- Return true if same school
  RETURN user_school_id = org_school_id;
END;
$$ LANGUAGE plpgsql;