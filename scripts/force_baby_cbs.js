const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("Looking for group BABY CB'S...");

    // Find group
    const { data, error } = await supabaseAdmin
        .from('registrations')
        .select('id, group_name, school_name, category, status')
        .ilike('group_name', '%BABY CB%');

    if (error) {
        console.error("Error finding group:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("Group not found.");
        return;
    }

    console.log("Found group(s):", data);

    const targetId = data[0].id;

    console.log(`Updating group ${targetId} to Infantil and submitted...`);

    const { error: updateError } = await supabaseAdmin
        .from('registrations')
        .update({
            category: 'Infantil',
            status: 'submitted',
            updated_at: new Date().toISOString()
        })
        .eq('id', targetId);

    if (updateError) {
        console.error("Error updating group:", updateError);
    } else {
        console.log("Successfully updated the group to Infantil and marked as submitted.");
    }
}

run();
