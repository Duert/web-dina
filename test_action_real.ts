import { getAvailabilityStatsAction } from './src/app/actions';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

globalThis.createClient = async () => createClient(supabaseUrl, supabaseKey);

// mock next/cache
require('module').Module._cache[require.resolve('next/cache')] = {
  id: 'next/cache',
  filename: 'next/cache',
  loaded: true,
  exports: { unstable_noStore: () => {} }
};

// stub for getAvailabilityStatsAction to hit our dummy createClient 
import * as actions from './src/app/actions';

async function run() {
    try {
        const stats = await actions.getAvailabilityStatsAction();
        console.log("FINAL RETURNED OBJECT:", JSON.stringify(stats, null, 2));
    } catch(e) {
        console.error(e);
    }
}
run();
