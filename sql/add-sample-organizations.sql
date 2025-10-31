-- Add sample organizations for University of Texas at Austin
INSERT INTO organizations (id, name, school_id, website_url, description, org_type, popularity_score) VALUES
(gen_random_uuid(), 'Longhorn Racing', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://longhornracing.org', 'Formula SAE racing team at UT Austin', 'engineering', 95),
(gen_random_uuid(), 'Texas Product Engineering Organization (TPEO)', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://tpeo.org', 'Product management and engineering organization', 'professional', 88),
(gen_random_uuid(), 'Freetail Hackers', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://freetailhackers.com', 'Computer science and hackathon organization', 'technology', 92),
(gen_random_uuid(), 'Texas Entrepreneurs', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://texasentrepreneurs.org', 'Entrepreneurship and startup community', 'business', 85),
(gen_random_uuid(), 'Texas Student Union', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://union.utexas.edu', 'Student government and activities', 'student_government', 90),
(gen_random_uuid(), 'Quidditch Club', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://utquidditch.org', 'Harry Potter inspired sport club', 'sports', 75),
(gen_random_uuid(), 'Design Creative', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://designcreative.org', 'Design and creative arts organization', 'creative', 80),
(gen_random_uuid(), 'Orange Jackets', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://orangejackets.org', 'Spirit and service organization', 'service', 88),
(gen_random_uuid(), 'Texas Debate', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://texasdebate.org', 'Competitive debate and speech', 'academic', 82),
(gen_random_uuid(), 'Robotics Club', 'd0709d1b-2b0d-4eb9-83ee-ebcef586d7e0', 'https://robotics.utexas.edu', 'Robotics engineering and competition', 'engineering', 87);