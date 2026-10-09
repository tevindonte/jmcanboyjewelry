import { chromium } from 'playwright';
import fs from 'fs';

const outDir = 'screenshots/silver-mat';
fs.mkdirSync(outDir, { recursive: true });
const tag = process.argv[2] || 'a1';
const which = process.argv[3] || 'all'; // build | home | all

const browser = await chromium.launch({ headless: true });

async function shotBuild(page, suffix) {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:3000/build', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const clear = page.getByRole('button', { name: /Clear all/i });
  if (await clear.count()) await clear.first().click();
  await page.waitForTimeout(300);
  const top6 = page.getByRole('button', { name: /Top 6/i });
  if (await top6.count()) await top6.first().click();
  await page.waitForTimeout(2800);
  await shotCanvas(page, `${outDir}/${tag}-build-desktop.png`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/build', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  const clear2 = page.getByRole('button', { name: /Clear all/i });
  if (await clear2.count()) await clear2.first().click();
  await page.waitForTimeout(300);
  const top6m = page.getByRole('button', { name: /Top 6/i });
  if (await top6m.count()) await top6m.first().click();
  await page.waitForTimeout(2000);
  await page.locator('canvas').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  await shotCanvas(page, `${outDir}/${tag}-build-mobile.png`);
}

async function shotCanvas(page, path) {
  const box = await page.locator('canvas').first().boundingBox();
  const vp = page.viewportSize();
  if (box && vp && box.width > 10 && box.height > 10 && box.y < vp.height) {
    const clip = {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(box.width, vp.width - Math.max(0, box.x)),
      height: Math.min(box.height, vp.height - Math.max(0, box.y)),
    };
    if (clip.width > 10 && clip.height > 10) {
      await page.screenshot({ path, clip });
      console.log('wrote', path);
      return;
    }
  }
  await page.screenshot({ path, fullPage: false });
  console.log('wrote', path, '(full)');
}

async function shotHome(page) {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4500);
  await shotCanvas(page, `${outDir}/${tag}-home-desktop.png`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4500);
  await shotCanvas(page, `${outDir}/${tag}-home-mobile.png`);
}

const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE', e.message));

if (which === 'build' || which === 'all') await shotBuild(page);
if (which === 'home' || which === 'all') await shotHome(page);

await browser.close();
