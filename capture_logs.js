const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => logs.push(`[pageerror] ${error.message}`));
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 5000 });
  } catch (e) {
    logs.push(`[navigation error] ${e.message}`);
  }
  
  await page.waitForTimeout(2000); // Wait for React to render/crash
  
  fs.writeFileSync('browser_logs.txt', logs.join('\n'));
  await page.screenshot({ path: 'browser_screenshot.png' });
  
  await browser.close();
  console.log('Done capturing logs. Wrote browser_logs.txt');
})();
