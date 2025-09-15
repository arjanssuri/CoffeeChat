-- Disable RLS on org_scrape_requests table
ALTER TABLE org_scrape_requests DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on organizations table if needed
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;