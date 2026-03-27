const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateLists() {
    console.log("Fetching registrations...");
    
    // Fetch all submitted registrations
    const { data: registrations, error } = await supabase
        .from('registrations')
        .select('group_name, category, created_at, status')
        .neq('status', 'draft')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching registrations:", error);
        return;
    }

    console.log(`Found ${registrations.length} non-draft registrations.\n`);

    // Group by category
    const grouped = registrations.reduce((acc, reg) => {
        if (!acc[reg.category]) {
            acc[reg.category] = [];
        }
        acc[reg.category].push(reg.group_name);
        return acc;
    }, {});

    // Sort categories alphabetically
    const categories = Object.keys(grouped).sort();

    let finalOutput = "";

    categories.forEach(category => {
        finalOutput += `### CATEGORÍA: ${category}\n`;
        grouped[category].forEach((group, index) => {
            finalOutput += `${group}\n`;
        });
        finalOutput += `\n-------------------\n\n`;
    });

    console.log(finalOutput);
}

generateLists();
