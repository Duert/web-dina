import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const { data: tickets, error } = await supabaseAdmin.from("tickets").select("*").limit(5);
    console.log("Error:", error);
    console.log("Tickets:", tickets);
}
main();
