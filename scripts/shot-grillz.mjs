import { chromium } from 'playwright';
import fs from 'fs';

const outDir = 'screenshots/grillz';
fs.mkdirSync(outDir, { recursive: true });
const tag = process.argv[2] || 'attempt';
const style = process.argv[3] || 'plain'; // plain | window | deepcut

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.log('PAGE', e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CON', msg.text());
});

await page.goto('http://localhost:3000/build', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);

const clear = page.getByRole('button', { name: /Clear all/i });
if (await clear.count()) {
  await clear.first().click();
  await page.waitForTimeout(400);
}

const top6 = page.getByRole('button', { name: /Top 6/i });
if (await top6.count()) {
  await top6.first().click();
  await page.waitForTimeout(800);
}

const styleBtn =
  style === 'window'
    ? page.getByRole('button', { name: /Window/i })
    : style === 'deepcut'
      ? page.getByRole('button', { name: /Deep cut/i })
      : page.getByRole('button', { name: /Plain/i });

if (await styleBtn.count()) {
  await styleBtn.first().click();
  await page.waitForTimeout(600);
}

// Confirm estimate text reflects style (sanity)
const body = await page.locator('body').innerText();
const hint = body.match(/Window|Deep cut|Plain/g)?.slice(0, 8);
console.log('style hints', hint, 'requested', style);

await page.waitForTimeout(2800);
const box = await page.locator('canvas').first().boundingBox();
const path = `${outDir}/${tag}-${style}.png`;
if (box) {
  await page.screenshot({ path, clip: box });
} else {
  await page.screenshot({ path, fullPage: false });
}
await browser.close();
console.log('wrote', path);
