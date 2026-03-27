const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
    console.log('🔄 Starting migration to 4 block sessions...');

    try {
        // Delete old sessions
        console.log('📝 Deleting old sessions...');
        const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .in('id', ['morning', 'afternoon']);

        if (deleteError) {
            console.error('❌ Error deleting old sessions:', deleteError);
            throw deleteError;
        }

        // Insert 4 new block sessions
        console.log('📝 Inserting 4 block sessions...');
        const { data, error: insertError } = await supabase
            .from('sessions')
            .upsert([
                { id: 'block1', name: 'Bloque 1 (Mañana 1)', date: '2026-06-20 10:00:00+00', total_seats: 961 },
                { id: 'block2', name: 'Bloque 2 (Mañana 2)', date: '2026-06-20 12:30:00+00', total_seats: 961 },
                { id: 'block3', name: 'Bloque 3 (Tarde 1)', date: '2026-06-20 16:00:00+00', total_seats: 961 },
                { id: 'block4', name: 'Bloque 4 (Tarde 2)', date: '2026-06-20 18:30:00+00', total_seats: 961 }
            ]);

        if (insertError) {
            console.error('❌ Error inserting new sessions:', insertError);
            throw insertError;
        }

        console.log('✅ Migration completed successfully!');
        console.log('📊 Sessions created:', data);

        // Verify
        const { data: sessions, error: verifyError } = await supabase
            .from('sessions')
            .select('*')
            .order('id');

        if (verifyError) {
            console.error('❌ Error verifying sessions:', verifyError);
        } else {
            console.log('\n📋 Current sessions in database:');
            sessions.forEach(s => console.log(`  - ${s.id}: ${s.name}`));
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
