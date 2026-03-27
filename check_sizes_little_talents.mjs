import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: parts } = await supabase
        .from('registration_participants')
        .select('*')
        .eq('registration_id', 'a14a04be-52d8-4eb1-97f3-e1abd195b0b4');

    for (const p of parts) {
        console.log(`Checking URLs for ${p.name}:`);
        const allUrls = [
            ...(p.authorization_urls || []),
            ...(p.dni_urls || []),
            ...(p.authorized_dni_urls || [])
        ];

        for (const url of allUrls) {
            try {
                const res = await fetch(url);
                const buffer = await res.buffer();
                console.log(`  URL: ${url.split('/').pop()} - Size: ${buffer.length} bytes`);
                if (buffer.length === 0) {
                    console.log('    --> CORRUPTED (0 bytes)');
                }
            } catch (err) {
                console.log(`  URL: ${url.split('/').pop()} - ERROR: ${err.message}`);
            }
        }
    }
}
check();
