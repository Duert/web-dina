import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sessions = [
    { id: 'block1', name: 'Bloque 1', categories: ['Infantil', 'Infantil Mini-parejas'] },
    { id: 'block2', name: 'Bloque 2', categories: ['Junior', 'Junior Mini-parejas', 'Mini-Solistas Junior'] },
    { id: 'block3', name: 'Bloque 3', categories: ['Juvenil', 'Juvenil Parejas'] },
    { id: 'block4', name: 'Bloque 4', categories: ['Absoluta', 'Parejas', 'Solistas Absoluta', 'Premium', 'Acompañantes'] }
];

const getCategoryBlock = (category) => {
    let sess = sessions.find(s => s.categories.includes(category));
    return sess ? sess.id : null;
};

async function main() {
    let profiles = [];
    let { data: pData } = await supabase.from('profiles').select('*');
    if (pData) profiles = pData;

    let registrations = [];
    let { data: rData } = await supabase.from('registrations')
        .select(`id, user_id, group_name, category, status`);
    if(rData) registrations = rData;

    let output = "# Resumen de Grupos por Bloque y Escuela\n\n";

    // Setup map by block -> school -> list of groups
    const blocksData = { block1: {}, block2: {}, block3: {}, block4: {} };

    // Group valid registrations
    const validRegs = registrations.filter(r => r.status !== 'draft');

    for (const reg of validRegs) {
        const blockId = getCategoryBlock(reg.category);
        if (!blockId) continue;
        
        const school = profiles.find(p => p.id === reg.user_id);
        const schoolName = school ? (school.school_name || school.name || 'Escuela sin nombre') : 'Desconocida';
        
        if (!blocksData[blockId][schoolName]) {
            blocksData[blockId][schoolName] = [];
        }
        
        blocksData[blockId][schoolName].push(reg);
    }

    const blockLabels = {
        'block1': '🟢 Bloque 1 (Verdes)',
        'block2': '🟣 Bloque 2 (Moradas)',
        'block3': '🔵 Bloque 3 (Azules)',
        'block4': '🩷 Bloque 4 (Rosas)'
    };

    const blockOrder = ['block1', 'block2', 'block3', 'block4'];

    for (const blockId of blockOrder) {
        output += `## ${blockLabels[blockId]}\n`;
        
        const schoolNames = Object.keys(blocksData[blockId]).sort((a,b) => a.localeCompare(b));
        
        if (schoolNames.length === 0) {
            output += "*(No hay grupos en este bloque)*\n\n";
            continue;
        }

        for (const sName of schoolNames) {
            output += `### 🏫 ${sName}\n`;
            
            const regs = blocksData[blockId][sName];
            // Sort by group name
            regs.sort((a,b) => (a.group_name || "").localeCompare(b.group_name || ""));
            
            for (const r of regs) {
                output += `- **${r.group_name}** (${r.category})\n`;
            }
            output += "\n";
        }
        output += "---\n\n";
    }

    fs.writeFileSync('/Users/domingojosesanchezdominguez/.gemini/antigravity/brain/3ee27fdf-4e2d-457f-8b9c-8806ba350461/resumen_por_bloque.md', output);
    console.log("SUCCESS GROUPS BY BLOCK");
}

main();
