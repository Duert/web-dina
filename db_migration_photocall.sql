CREATE TABLE IF NOT EXISTS photocall_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_registration_photo UNIQUE (registration_id)
);

ALTER TABLE photocall_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view photocall photos" ON photocall_photos;
CREATE POLICY "Public can view photocall photos" ON photocall_photos FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Admin can insert photocall photos" ON photocall_photos;
CREATE POLICY "Admin can insert photocall photos" ON photocall_photos FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can update photocall photos" ON photocall_photos;
CREATE POLICY "Admin can update photocall photos" ON photocall_photos FOR UPDATE TO public USING (true);
DROP POLICY IF EXISTS "Admin can delete photocall photos" ON photocall_photos;
CREATE POLICY "Admin can delete photocall photos" ON photocall_photos FOR DELETE TO public USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('photocall', 'photocall', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Photocall Public View" ON storage.objects;
CREATE POLICY "Photocall Public View" ON storage.objects FOR SELECT USING (bucket_id = 'photocall');

DROP POLICY IF EXISTS "Photocall Admin Upload" ON storage.objects;
CREATE POLICY "Photocall Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photocall');

DROP POLICY IF EXISTS "Photocall Admin Delete" ON storage.objects;
CREATE POLICY "Photocall Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'photocall');

-- 5. Add toggle to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS photocall_published BOOLEAN DEFAULT false;
