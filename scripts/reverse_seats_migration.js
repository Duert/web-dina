const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
    console.log("Fetching tickets...");
    const { data: tickets, error } = await supabase.from('tickets').select('*');

    if (error) {
        console.error("Error fetching tickets:", error);
        return;
    }

    console.log(`Found ${tickets.length} tickets to process.`);

    // Strategy: Delete All & Re-Insert to avoid Unique/FK Constraints

    // 1. Prepare New Data
    const newTickets = tickets.map(t => {
        // ID format: R{row}-{number}
        const parts = t.seat_id.substring(1).split('-');
        const row = parseInt(parts[0]);
        const num = parseInt(parts[1]);

        let totalSeatsInRow = 0;
        if (row >= 1 && row <= 17) totalSeatsInRow = 20;
        else if (row >= 18 && row <= 21) totalSeatsInRow = 24;
        else if (row >= 22 && row <= 25) totalSeatsInRow = 16;

        const newNum = totalSeatsInRow - num + 1;
        const newSeatId = `R${row}-${newNum}`;

        return {
            ...t,
            seat_id: newSeatId
        };
    });

    console.log("Prepared new ticket data.");

    // 2. Backup to JSON file (safety)
    const fs = require('fs');
    fs.writeFileSync('tickets_backup_before_migration.json', JSON.stringify(tickets, null, 2));
    console.log("Backup written to tickets_backup_before_migration.json");

    // 3. Delete All Tickets
    console.log("Deleting all tickets...");
    const { error: deleteError } = await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    // Note: delete().neq('id', '...') is a hack to delete all if no filter is allowed without one.
    // Or check if delete() without filter works.

    if (deleteError) {
        console.error("Error deleting tickets:", deleteError);
        return;
    }

    // 4. Insert New Tickets
    console.log("Inserting migrated tickets...");
    const BATCH_SIZE = 100; // Assuming BATCH_SIZE is defined elsewhere or needs to be here
    for (let i = 0; i < newTickets.length; i += BATCH_SIZE) {
        const batch = newTickets.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('tickets').insert(batch);
        if (error) console.error(`Insert Batch ${i} Error:`, error);
        else console.log(`Inserted batch ${i}`);
    }

    console.log("Migration Complete.");
}

runMigration();
