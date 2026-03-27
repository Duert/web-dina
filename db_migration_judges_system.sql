-- Enable UUID extension if not enabled (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add order_index to registrations for custom sorting
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 999;

-- 2. Create table for Judge Configuration (Active criteria per judge)
CREATE TABLE IF NOT EXISTS public.judges_criteria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    judge_id INTEGER NOT NULL CHECK (judge_id BETWEEN 1 AND 4),
    criteria_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(judge_id, criteria_name)
);

-- Enable RLS
ALTER TABLE public.judges_criteria ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access for everyone (Judges need to read config)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.judges_criteria;
CREATE POLICY "Enable read access for all users" ON public.judges_criteria
    FOR SELECT USING (true);


-- 3. Create table for Scores
CREATE TABLE IF NOT EXISTS public.scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    judge_id INTEGER NOT NULL CHECK (judge_id BETWEEN 1 AND 4),
    judge_name TEXT NOT NULL,
    criteria_name TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
    block TEXT, 
    category TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(registration_id, judge_id, criteria_name)
);

-- Enable RLS
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Policy: Allow full access for everyone (Judges need to insert/update scores)
-- Note: In a stricter environment, we would use authentication
DROP POLICY IF EXISTS "Enable all access for all users" ON public.scores;
CREATE POLICY "Enable all access for all users" ON public.scores
    FOR ALL USING (true) WITH CHECK (true);


-- 4. Initial Seed for Criteria (Active for all judges by default)
INSERT INTO public.judges_criteria (judge_id, criteria_name, is_active)
SELECT j, c, true
FROM 
    generate_series(1, 4) as j,
    unnest(ARRAY[
        'Musicalidad', 
        'Técnica', 
        'Actitud', 
        'Innovación', 
        'Sincronía', 
        'Ejecución de la coreografía', 
        'Utilización del espacio', 
        'Imagen y vestuario', 
        'Variedad de estilos', 
        'Impresión Global'
    ]) as c
ON CONFLICT (judge_id, criteria_name) DO NOTHING;
