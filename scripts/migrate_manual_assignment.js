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
    console.log('🔄 Starting migration: Add manual assignment fields...\n');

    try {
        // Check if columns already exist
        console.log('🔍 Checking current schema...');
        const { data: testTicket, error: testError } = await supabase
            .from('tickets')
            .select('*')
            .limit(1)
            .single();

        if (testTicket) {
            const hasAssignedTo = 'assigned_to' in testTicket;
            const hasIsFree = 'is_free' in testTicket;

            console.log(`  - assigned_to column: ${hasAssignedTo ? '✅ EXISTS' : '❌ MISSING'}`);
            console.log(`  - is_free column: ${hasIsFree ? '✅ EXISTS' : '❌ MISSING'}`);

            if (hasAssignedTo && hasIsFree) {
                console.log('\n✅ All columns already exist! Migration not needed.');

                // Update prices to 3€
                console.log('\n📝 Updating prices to 3€...');
                const { error: updateError } = await supabase
                    .from('tickets')
                    .update({ price: 3.0 })
                    .neq('price', 3.0);

                if (updateError) {
                    console.error('⚠️  Error updating prices:', updateError);
                } else {
                    console.log('✅ Prices updated to 3€');
                }

                return;
            }
        }

        console.log('\n⚠️  Columns need to be added via Supabase SQL Editor');
        console.log('📄 Please run the SQL from: db_migration_manual_assignment.sql');
        console.log('\nSQL to execute:');
        console.log('─'.repeat(60));
        const sqlPath = path.join(__dirname, '..', 'db_migration_manual_assignment.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log(sql);
        console.log('─'.repeat(60));

    } catch (error) {
        console.error('❌ Migration check failed:', error);
    }
}

migrate();
