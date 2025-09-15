-- Add UT Austin and organizations to existing schema

-- Insert UT Austin as primary school
INSERT INTO schools (name, domain, location, type) VALUES
  ('University of Texas at Austin', 'utexas.edu', 'Austin, TX', 'university')
ON CONFLICT (name) DO NOTHING;

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
  )
ON CONFLICT (school_id, name) DO NOTHING;