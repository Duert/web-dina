import fetch from 'node-fetch';

async function test() {
    console.log('Fetching local page to ensure it is alive...');
    try {
        const res = await fetch('http://localhost:3000');
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Has AvailabilitySection SSR:', text.includes('animate-spin'));

        // We cannot easily invoke the server action without picking up the exact Action ID
        // But if the server responds instantly, it's not deadlocked globally.
    } catch (e) {
        console.log('Fetch error:', e);
    }
}
test();
