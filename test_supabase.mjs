import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const { data, error } = await supabaseAdmin
        .from('app_settings')
        .select('*');
    console.log("data:", data, "error:", error);

    const { error: updError } = await supabaseAdmin
        .from('app_settings')
        .update({ is_order_published: true })
        .eq('id', 1);
    console.log("update error:", updError);
}

check();
