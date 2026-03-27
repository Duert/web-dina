
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDebugInfo() {
    console.log("Checking storage for user e50d4c1a-2bad-426e-925a-070a559d8e3f...");

    // Check storage objects for this user (if RLS allows listing, or just list root)
    // Note: service role bypasses RLS, so we can see all.
    // We'll search in 'uploads' bucket.

    try {
        const { data: files, error: storageError } = await supabase
            .storage
            .from('uploads')
            .list('payments', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (storageError) console.error("Storage error (payments):", storageError);
        else {
            console.log("Recent files in 'payments':");
            // We can't easily filter by user_id here without metadata, but we can look for *recent* files 
            // and see if the filename pattern matches (we use random names though).
            // But maybe we can list by created_at.
            files.slice(0, 10).forEach(f => {
                console.log(` - ${f.name} (${f.created_at}) - Size: ${f.metadata?.size}`);
            });
        }

        // Music
        const { data: musicFiles, error: musicError } = await supabase
            .storage
            .from('uploads')
            .list('music', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (musicError) console.error("Storage error (music):", musicError);
        else {
            console.log("Recent files in 'music':");
            musicFiles.slice(0, 10).forEach(f => {
                console.log(` - ${f.name} (${f.created_at})`);
            });
        }

    } catch (e) {
        console.error("Exception checking storage:", e);
    }
}

checkDebugInfo();
