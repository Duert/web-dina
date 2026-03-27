-- Crea la tabla para almacenar el estado de las categorías (cerradas o abiertas)
CREATE TABLE IF NOT EXISTS category_status (
    category TEXT PRIMARY KEY,
    is_closed BOOLEAN DEFAULT false
);

-- Otorga permisos básicos si son necesarios
ALTER TABLE category_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to category_status"
    ON category_status FOR SELECT
    USING (true);

CREATE POLICY "Allow service role full access to category_status"
    ON category_status FOR ALL
    USING (true)
    WITH CHECK (true);
