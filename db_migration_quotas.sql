-- Create category_quotas table
CREATE TABLE IF NOT EXISTS public.category_quotas (
    category_name text PRIMARY KEY,
    available_spots integer NOT NULL DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_quotas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Category quotas are viewable by everyone"
    ON public.category_quotas FOR SELECT
    USING (true);

-- Admin full access policy (assuming auth roles or service role for updates)
CREATE POLICY "Service role has full access to category_quotas"
    ON public.category_quotas FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert initial records for all categories with 0 spots
INSERT INTO public.category_quotas (category_name, available_spots) VALUES
    ('Baby', 0),
    ('Infantil', 0),
    ('Infantil Mini-parejas', 0),
    ('Mini-Solistas Infantil', 0),
    ('Junior', 0),
    ('Junior Mini-parejas', 0),
    ('Mini-Solistas Junior', 0),
    ('Juvenil', 0),
    ('Juvenil Parejas', 0),
    ('Solistas Juvenil', 0),
    ('Absoluta', 0),
    ('Parejas', 0),
    ('Solistas Absoluta', 0),
    ('Premium', 0)
ON CONFLICT (category_name) DO NOTHING;

-- Function to safely consume a quota spot if available
CREATE OR REPLACE FUNCTION consume_category_quota(p_category_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available integer;
BEGIN
    -- Only lock the specific category row, skip locked rows (though we want to wait, actually let's just lock for update)
    SELECT available_spots INTO v_available
    FROM public.category_quotas
    WHERE category_name = p_category_name
    FOR UPDATE;

    IF v_available > 0 THEN
        UPDATE public.category_quotas
        SET available_spots = available_spots - 1,
            updated_at = now()
        WHERE category_name = p_category_name;
        
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$;
