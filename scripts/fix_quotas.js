const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    // Ajustar Parejas
    const { data: pData } = await supabase.from('category_quotas').select('available_spots').eq('category_name', 'Parejas').single();
    if (pData && pData.available_spots > 0) {
        await supabase.from('category_quotas').update({ available_spots: pData.available_spots - 1 }).eq('category_name', 'Parejas');
    }

    // Ajustar Juvenil
    const { data: jData } = await supabase.from('category_quotas').select('available_spots').eq('category_name', 'Juvenil').single();
    if (jData && jData.available_spots > 0) {
        await supabase.from('category_quotas').update({ available_spots: jData.available_spots - 1 }).eq('category_name', 'Juvenil');
    }

    console.log("Ajuste completado.");
}

fix();
