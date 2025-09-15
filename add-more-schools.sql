-- Add more schools to the database for better testing
INSERT INTO schools (name, domain, location, type, logo_url) VALUES
  ('Stanford University', 'stanford.edu', 'Stanford, CA', 'university', '/images/stanford.png'),
  ('University of California, Berkeley', 'berkeley.edu', 'Berkeley, CA', 'university', '/images/berkeley.png'),
  ('Harvard University', 'harvard.edu', 'Cambridge, MA', 'university', '/images/harvard.png'),
  ('Massachusetts Institute of Technology', 'mit.edu', 'Cambridge, MA', 'university', '/images/mit.png'),
  ('Yale University', 'yale.edu', 'New Haven, CT', 'university', '/images/yale.png'),
  ('Princeton University', 'princeton.edu', 'Princeton, NJ', 'university', '/images/princeton.png'),
  ('University of Pennsylvania', 'upenn.edu', 'Philadelphia, PA', 'university', '/images/upenn.png'),
  ('Columbia University', 'columbia.edu', 'New York, NY', 'university', '/images/columbia.png'),
  ('University of Chicago', 'uchicago.edu', 'Chicago, IL', 'university', '/images/uchicago.png'),
  ('Northwestern University', 'northwestern.edu', 'Evanston, IL', 'university', '/images/northwestern.png'),
  ('California Institute of Technology', 'caltech.edu', 'Pasadena, CA', 'university', '/images/caltech.png'),
  ('Duke University', 'duke.edu', 'Durham, NC', 'university', '/images/duke.png'),
  ('Dartmouth College', 'dartmouth.edu', 'Hanover, NH', 'university', '/images/dartmouth.png'),
  ('Brown University', 'brown.edu', 'Providence, RI', 'university', '/images/brown.png'),
  ('Cornell University', 'cornell.edu', 'Ithaca, NY', 'university', '/images/cornell.png'),
  ('Rice University', 'rice.edu', 'Houston, TX', 'university', '/images/rice.png'),
  ('Vanderbilt University', 'vanderbilt.edu', 'Nashville, TN', 'university', '/images/vanderbilt.png'),
  ('Washington University in St. Louis', 'wustl.edu', 'St. Louis, MO', 'university', '/images/wustl.png'),
  ('Emory University', 'emory.edu', 'Atlanta, GA', 'university', '/images/emory.png'),
  ('University of Notre Dame', 'nd.edu', 'Notre Dame, IN', 'university', '/images/notredame.png')
ON CONFLICT (name) DO NOTHING;