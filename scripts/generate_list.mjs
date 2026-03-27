import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: registrations, error } = await supabase
        .from('registrations')
        .select(`
            id,
            group_name,
            category,
            order_index,
            is_confirmed,
            registration_participants ( id ),
            registration_responsibles ( id )
        `);

    if (error) {
        console.error("Error fetching data: ", error);
        return;
    }

    let output = "# Lista de Integrantes por Grupo\n\n";
    let currentCategory = "";
    
    // Filtramos solo los que tienen categoría (borradores pueden no tenerla)
    const validRegs = registrations.filter(r => r.category);

    // Sort logic to make sure categories are grouped perfectly
    const sortedRegs = validRegs.sort((a, b) => {
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        const oA = a.order_index ?? 9999;
        const oB = b.order_index ?? 9999;
        return oA - oB;
    });

    sortedRegs.forEach(r => {
        if (r.category !== currentCategory) {
            currentCategory = r.category;
            output += `\n## Categoría: ${currentCategory || 'Sin categoría'}\n\n`;
            output += `| Orden | Grupo | Bailarines | Responsables | Estado |\n`;
            output += `| :---: | :--- | :---: | :---: | :--- |\n`;
        }
        
        const dancersCount = r.registration_participants?.length || 0;
        const respCount = r.registration_responsibles?.length || 0;
        const order = r.order_index !== null ? r.order_index : '-';
        const estado = r.is_confirmed ? '✅ Conf.' : '⏳ Pend.';

        output += `| ${order} | **${r.group_name}** | ${dancersCount} | ${respCount} | ${estado} |\n`;
    });

    fs.writeFileSync('/Users/domingojosesanchezdominguez/.gemini/antigravity/brain/3ee27fdf-4e2d-457f-8b9c-8806ba350461/participantes_por_grupo.md', output);
    console.log("SUCCESS");
}

main();
