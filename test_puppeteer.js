const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', request => {
        console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    const html = await page.content();
    if (html.includes('AGOTADO') || html.includes('libres')) {
        console.log('DOM UPDATE SUCCESS: UI rendered correctly.');
    } else if (html.includes('lucide-loader-circle')) {
        console.log('DOM UPDATE FAILED: Spinner still visible.');
    } else {
        console.log('DOM UPDATE UNKNOWN.');
    }

    await browser.close();
})();
