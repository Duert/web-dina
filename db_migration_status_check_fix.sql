-- Update status check constraint to include 'submitted_modifiable'

ALTER TABLE registrations 
DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE registrations 
ADD CONSTRAINT registrations_status_check 
CHECK (status IN ('draft', 'submitted', 'submitted_modifiable'));
