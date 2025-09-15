-- Fix UT Austin logo URL to work with Next.js public directory
UPDATE schools
SET logo_url = '/utaustin.png'
WHERE name = 'University of Texas at Austin' AND logo_url = '/public/utaustin.png';