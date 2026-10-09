import { chromium } from 'playwright';
import fs from 'fs';

const outDir = 'screenshots/grillz2';
fs.mkdirSync(outDir, { recursive: true });
const tag = process.argv[2] || 'a1';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.log('PAGE', e.message));

async function shotCanvas(path) {
  await page.waitForTimeout(500);
  // Outer relative wrapper includes page-level top-fade overlays
  const canvas = page.locator('canvas').first();
  const wrap = canvas.locator('xpath=ancestor::div[contains(@class,"relative")][1]');
  if (await wrap.count()) {
    await wrap.screenshot({ path });
    console.log('wrote', path);
    return;
  }
  const box = await page.locator('canvas').first().boundingBox();
  const vp = page.viewportSize();
  if (box && vp && box.width > 20 && box.height > 20) {
    const clip = {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(box.width, vp.width - Math.max(0, box.x)),
      height: Math.min(box.height, vp.height - Math.max(0, box.y)),
    };
    if (clip.width > 20 && clip.height > 20) {
      await page.screenshot({ path, clip });
      console.log('wrote', path);
      return;
    }
  }
  await page.screenshot({ path, fullPage: false });
  console.log('wrote', path, '(full)');
}

async function prepBuild(style) {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:3000/build', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  const clear = page.getByRole('button', { name: /Clear all/i });
  if (await clear.count()) await clear.first().click();
  await page.waitForTimeout(400);
  if (style === 'u5') {
    const u5 = page.getByRole('button', { name: /Tooth U5/i });
    if (await u5.count()) await u5.first().click();
    await page.waitForTimeout(400);
    const plain = page.getByRole('button', { name: /Plain/i });
    if (await plain.count()) await plain.first().click();
  } else {
    const top6 = page.getByRole('button', { name: /Top 6/i });
    if (await top6.count()) await top6.first().click();
    await page.waitForTimeout(600);
    const styleBtn =
      style === 'window'
        ? page.getByRole('button', { name: /Window/i })
        : style === 'deepcut'
          ? page.getByRole('button', { name: /Deep cut/i })
          : page.getByRole('button', { name: /Plain/i });
    if (await styleBtn.count()) await styleBtn.first().click();
  }
  await page.waitForTimeout(2800);
}

// U5 alone
await prepBuild('u5');
await shotCanvas(`${outDir}/${tag}-u5.png`);

// Top 6 styles
for (const style of ['plain', 'window', 'deepcut']) {
  await prepBuild(style);
  await shotCanvas(`${outDir}/${tag}-top6-${style}.png`);
}

// Homepage hero desktop + mobile
await page.setViewportSize({ width: 1400, height: 900 });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4500);
await shotCanvas(`${outDir}/${tag}-home-desktop.png`);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4500);
await shotCanvas(`${outDir}/${tag}-home-mobile.png`);

// Build mobile framing check
await page.goto('http://localhost:3000/build', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3500);
const clear = page.getByRole('button', { name: /Clear all/i });
if (await clear.count()) await clear.first().click();
await page.waitForTimeout(300);
const top6 = page.getByRole('button', { name: /Top 6/i });
if (await top6.count()) await top6.first().click();
await page.waitForTimeout(2000);
await page.locator('canvas').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(2000);
await shotCanvas(`${outDir}/${tag}-build-mobile.png`);

await browser.close();
console.log('done', tag);
