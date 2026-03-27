-- Migration: Add Manual Assignment Fields to Tickets
-- Adds support for blocking seats and manually assigning them with custom notes

-- Add new columns to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_to TEXT,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- Update all existing tickets to have 3€ price
UPDATE tickets SET price = 3.0 WHERE price != 3.0;

-- Add comment for documentation
COMMENT ON COLUMN tickets.assigned_to IS 'Custom text for manually assigned tickets (e.g., "Organización", "Prensa", "Jurado")';
COMMENT ON COLUMN tickets.is_free IS 'Whether this ticket is free (true) or paid 3€ (false). Affects accounting calculations.';
