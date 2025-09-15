-- Clean up organizations and prevent duplicate issues

-- Delete "Unknown Organization" entries
DELETE FROM organizations WHERE name = 'Unknown Organization';

-- Also clean up any failed scrape requests
DELETE FROM org_scrape_requests WHERE status = 'failed';
DELETE FROM org_scrape_requests WHERE status = 'processing';

-- Update existing organizations with better names if they have proper URLs
UPDATE organizations
SET name = 'Texas Convergent'
WHERE website_url = 'https://txconvergent.com' AND name != 'Texas Convergent';

UPDATE organizations
SET name = 'Longhorn Racing'
WHERE website_url = 'https://www.longhornracing.org/' AND name != 'Longhorn Racing';

UPDATE organizations
SET name = 'Texas Blockchain'
WHERE website_url = 'https://www.texasblockchain.org/' AND name != 'Texas Blockchain';

UPDATE organizations
SET name = 'Texas Finance Team'
WHERE website_url = 'https://www.texasfteam.org/' AND name != 'Texas Finance Team';

UPDATE organizations
SET name = 'Texas Stock Team'
WHERE website_url = 'https://texasstockteam.com/' AND name != 'Texas Stock Team';

UPDATE organizations
SET name = 'TUIT'
WHERE website_url = 'https://www.texasuit.com' AND name != 'TUIT';

UPDATE organizations
SET name = 'USIT'
WHERE website_url = 'https://www.texasusit.org' AND name != 'USIT';

UPDATE organizations
SET name = 'USIT QMI'
WHERE website_url = 'https://usitqmi.com/' AND name != 'USIT QMI';