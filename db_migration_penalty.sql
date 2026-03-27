-- Agrega la columna 'penalty' a la tabla 'registrations'
-- Valor por defecto 0
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS penalty FLOAT DEFAULT 0;
