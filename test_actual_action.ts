import { getAvailabilityStatsAction } from './src/app/actions';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    console.log("Running getAvailabilityStatsAction...");
    const result = await getAvailabilityStatsAction();
    if (result.success) {
        console.log(JSON.stringify(result.data, null, 2));
    } else {
        console.error("Error:", result.message);
    }
}
run();
