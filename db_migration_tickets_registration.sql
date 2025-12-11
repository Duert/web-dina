-- Add registration_id to tickets table
-- This allows linking a ticket (sold/blocked) to a specific group registration

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_registration_id ON tickets(registration_id);
