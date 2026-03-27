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

async function checkSessions() {
    console.log('🔍 Checking current sessions in database...\n');

    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .order('id');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log('📋 Current sessions:');
    sessions.forEach(s => {
        console.log(`  - ${s.id}: ${s.name} (${s.date})`);
    });

    console.log('\n🎫 Checking tickets...');
    const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('session_id, status')
        .eq('status', 'sold');

    if (ticketsError) {
        console.error('❌ Error:', ticketsError);
        return;
    }

    const ticketsBySession = {};
    tickets.forEach(t => {
        ticketsBySession[t.session_id] = (ticketsBySession[t.session_id] || 0) + 1;
    });

    console.log('\n📊 Sold tickets by session:');
    Object.entries(ticketsBySession).forEach(([sessionId, count]) => {
        console.log(`  - ${sessionId}: ${count} tickets`);
    });
}

checkSessions();
