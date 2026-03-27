import fetch from 'node-fetch';
import fs from 'fs';

async function testUrl(url) {
    try {
        const res = await fetch(url);
        console.log("Status:", res.status);
        console.log("Content-Type:", res.headers.get('content-type'));
        if (res.ok) {
            const buffer = await res.buffer();
            console.log("Size in bytes:", buffer.length);
            // check if HTML error page
            if (buffer.toString('utf-8').includes('<html')) {
                console.log("It's an HTML page! Not an image.");
                console.log(buffer.toString('utf-8').substring(0, 200));
            } else {
                console.log("First bytes:", buffer.toString('hex').substring(0, 20));
            }
        }
    } catch (err) {
        console.error("Error fetching:", err);
    }
}

testUrl("https://ftfdblgisxzsffqbxrkx.supabase.co/storage/v1/object/public/uploads/participants/auth/0.6487639416204719.JPEG");
testUrl("https://ftfdblgisxzsffqbxrkx.supabase.co/storage/v1/object/public/uploads/participants/auth/0.32226060192079165.jpeg");
