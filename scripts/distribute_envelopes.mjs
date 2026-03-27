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

const colorMap = {
    'block1': '🟢 Verdes',
    'block2': '🟣 Moradas',
    'block3': '🔵 Azules',
    'block4': '🩷 Rosas'
};

const getCategoryBlock = (category) => {
    let sess = sessions.find(s => s.categories.includes(category));
    return sess ? sess.id : null;
};

const getRegistrationType = (category) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('solista')) return 3; // Solistas (Lowest priority)
    if (catLower.includes('pareja')) return 2; // Parejas
    return 1; // Grupos (Highest priority)
};

const getTypeName = (type) => {
    if (type === 1) return 'GRUPOS';
    if (type === 2) return 'PAREJAS';
    if (type === 3) return 'SOLISTAS';
    return 'OTROS';
};


function capitalizeName(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}


async function main() {
    let profiles = [];
    let { data: pData } = await supabase.from('profiles').select('*');
    if (pData) profiles = pData;

    let registrations = [];
    let { data: rData } = await supabase.from('registrations')
        .select(`id, user_id, group_name, category, status, registration_participants(name, surnames), registration_responsibles(name, surnames)`);
    if(rData) registrations = rData;

    let output = "# Distribución Exhaustiva de Sobres por Escuela\n\n";
    output += "Instrucciones de llenado de sobres:\n";
    output += "- Tienes 1 sobre para cada actuación.\n";
    output += "- El orden de prioridad para depositar pulseras es: primero Grupos, luego Parejas y finalmente Solistas.\n";
    output += "- Si se le descuenta una pulsera a alguien, se especifica debajo exactamente el nombre de la persona y de qué grupo la ha obtenido ya.\n\n";
    
    profiles.sort((a,b) => (a.school_name || "Z").localeCompare(b.school_name || "Z"));

    for(const profile of profiles) {
        let schoolRegs = registrations.filter(r => r.user_id === profile.id);
        const validRegs = schoolRegs.filter(r => r.status !== 'draft');
        
        if(validRegs.length === 0) continue; 

        // Sort by type (Groups -> Couples -> Solos) then alphabetically
        validRegs.sort((a, b) => {
            const ta = getRegistrationType(a.category);
            const tb = getRegistrationType(b.category);
            if (ta !== tb) return ta - tb;
            return (a.group_name || "").localeCompare(b.group_name || "");
        });

        // Use Maps to store the group name that gave the wristband
        const assignedDancers = { block1: new Map(), block2: new Map(), block3: new Map(), block4: new Map() };
        const assignedResponsibles = new Map();
        
        output += `## 🏫 ${profile.school_name || profile.name || 'Escuela sin nombre'}\n`;

        let currentType = 0;

        validRegs.forEach(reg => {
            const type = getRegistrationType(reg.category);
            if (type !== currentType) {
                currentType = type;
                output += `\n### ➡️ ${getTypeName(currentType)}\n`;
            }

            const blockId = getCategoryBlock(reg.category);
            if(!blockId) return;

            let providedDancers = 0;
            let providedResponsibles = 0;
            
            let skippedDancersNames = [];
            let skippedResponsiblesNames = [];

            const totalDancersInReg = (reg.registration_participants || []).length;
            const totalRespsInReg = (reg.registration_responsibles || []).length;

            (reg.registration_participants || []).forEach(p => {
                const key = `${p.name?.trim().toLowerCase()}-${p.surnames?.trim().toLowerCase()}`;
                const displayName = capitalizeName(`${p.name} ${p.surnames}`);
                if(key && key !== '-') {
                    if (!assignedDancers[blockId].has(key)) {
                        assignedDancers[blockId].set(key, reg.group_name);
                        providedDancers++;
                    } else {
                        skippedDancersNames.push(`- 💃 *${displayName}* (pulsera ya en **${assignedDancers[blockId].get(key)}**)`);
                    }
                }
            });
            
            (reg.registration_responsibles || []).forEach(r => {
                 const key = `${r.name?.trim().toLowerCase()}-${r.surnames?.trim().toLowerCase()}`;
                 const displayName = capitalizeName(`${r.name} ${r.surnames}`);
                 if(key && key !== '-') {
                     if (!assignedResponsibles.has(key)) {
                         assignedResponsibles.set(key, reg.group_name);
                         providedResponsibles++;
                     } else {
                         skippedResponsiblesNames.push(`- 📋 *${displayName}* (pulsera ya en **${assignedResponsibles.get(key)}**)`);
                     }
                 }
            });

            // Format line
            let line = `**${reg.group_name}** (${reg.category}): `;
            
            let badges = [];
            
            if (totalDancersInReg > 0) {
                if (providedDancers > 0) badges.push(`${providedDancers} ${colorMap[blockId]}`);
                if (providedDancers === 0) badges.push(`0 ${colorMap[blockId].split(' ')[1]}`);
            }

            if (totalRespsInReg > 0) {
                if (providedResponsibles > 0) badges.push(`${providedResponsibles} ⚪ Blancas (Resp.)`);
                if (providedResponsibles === 0) badges.push(`0 Blancas (Resp.)`);
            }

            if (badges.length === 0) badges.push("Sin inscritos válidos");
            
            output += "- " + line + badges.join(', ') + "\n";
            
            if (skippedDancersNames.length > 0 || skippedResponsiblesNames.length > 0) {
                // output += "  *Detalles de duplicados:*\n";
                skippedDancersNames.forEach(sd => output += `  ${sd}\n`);
                skippedResponsiblesNames.forEach(sr => output += `  ${sr}\n`);
            }
        });
        output += "\n---\n";
    }

    fs.writeFileSync('/Users/domingojosesanchezdominguez/.gemini/antigravity/brain/3ee27fdf-4e2d-457f-8b9c-8806ba350461/sobres_exhaustivo.md', output);
    console.log("SUCCESS EXHAUSTIVE ENVELOPE DISTRIBUTION");
}

main();
