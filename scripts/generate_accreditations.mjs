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
        .select(`id, user_id, category, status, is_confirmed, registration_participants(name, surnames), registration_responsibles(name, surnames)`);
    if(rData) registrations = rData;

    let output = "Aquí tienes el desglose exacto de cuántas pulseras debes preparar por cada escuela, separadas por los colores que me has indicado:\n\n";
    
    profiles.sort((a,b) => (a.school_name || "Z").localeCompare(b.school_name || "Z"));

    for(const profile of profiles) {
        const schoolRegs = registrations.filter(r => r.user_id === profile.id);
        const validRegs = schoolRegs.filter(r => r.status !== 'draft');
        
        if(validRegs.length === 0) continue; 

        const dSet = { block1: new Set(), block2: new Set(), block3: new Set(), block4: new Set() };
        const globalResponsibles = new Set();
        
        validRegs.forEach(reg => {
            const blockId = getCategoryBlock(reg.category);
            if(blockId && dSet[blockId]) {
                (reg.registration_participants || []).forEach(p => {
                    const key = `${p.name?.trim().toLowerCase()}-${p.surnames?.trim().toLowerCase()}`;
                    if(key && key !== '-') dSet[blockId].add(key);
                });
            }
            
            // Responsables are global per school
            (reg.registration_responsibles || []).forEach(r => {
                 const key = `${r.name?.trim().toLowerCase()}-${r.surnames?.trim().toLowerCase()}`;
                 if(key && key !== '-') globalResponsibles.add(key);
            });
        });

        const b1 = dSet.block1.size;
        const b2 = dSet.block2.size;
        const b3 = dSet.block3.size;
        const b4 = dSet.block4.size;
        const resp = globalResponsibles.size;

        if(b1 + b2 + b3 + b4 + resp > 0) {
            output += `### ${profile.school_name || profile.name || 'Escuela sin nombre'}\n`;
            if (b1 > 0) output += `- 🟢 **${b1}** pulseras Verdes (Bailarines Bloque 1)\n`;
            if (b2 > 0) output += `- 🟣 **${b2}** pulseras Moradas (Bailarines Bloque 2)\n`;
            if (b3 > 0) output += `- 🔵 **${b3}** pulseras Azules (Bailarines Bloque 3)\n`;
            if (b4 > 0) output += `- 🩷 **${b4}** pulseras Rosas (Bailarines Bloque 4)\n`;
            if (resp > 0) output += `- ⚪ **${resp}** pulseras Blancas (Responsables)\n`;
            output += "\n";
        }
    }

    fs.writeFileSync('/Users/domingojosesanchezdominguez/.gemini/antigravity/brain/3ee27fdf-4e2d-457f-8b9c-8806ba350461/acreditaciones_colores.md', output);
    console.log("SUCCESS NEW COLOR FORMAT");
}

main();
