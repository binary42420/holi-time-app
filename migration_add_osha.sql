-- Migration to add OSHA_10_Certifications field to users table
-- Run this SQL command on your database

ALTER TABLE users ADD COLUMN "OSHA_10_Certifications" BOOLEAN NOT NULL DEFAULT false;

-- Optional: Update some existing users to have OSHA certification for testing
-- UPDATE users SET "OSHA_10_Certifications" = true WHERE crew_chief_eligible = true;-- Migration to add OSHA_10_Certifications field to users table
-- Run this SQL command on your database

ALTER TABLE users ADD COLUMN "OSHA_10_Certifications" BOOLEAN NOT NULL DEFAULT false;

-- Optional: Update some existing users to have OSHA certification for testing
-- UPDATE users SET "OSHA_10_Certifications" = true WHERE crew_chief_eligible = true;