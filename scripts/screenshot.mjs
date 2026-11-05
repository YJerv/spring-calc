/**
 * Phone-sized screenshots of the wizard, including the results screen.
 * Usage (from project root, with the app already served on PORT):
 *   node scripts/screenshot.mjs
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "screenshots");
const port = process.env.PORT || "8765";
const url = `http://127.0.0.1:${port}/`;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "en-GB",
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
});

const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

async function shot(name) {
  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, fullPage: true });
  console.log("wrote", dest);
}

await page.waitForSelector("#btnExample");
await page.click("#btnExample");
await page.waitForTimeout(200);
await shot("01-loads.png");

await page.click("#btnNext");
await page.waitForSelector("#pocket");
await page.waitForTimeout(200);
await shot("02-geometry.png");

await page.click("#btnNext");
await page.waitForSelector("#heatmapTable");
await page.waitForTimeout(300);
await page.evaluate(() => {
  const scroller = document.getElementById("heatmapScroll");
  const cell = scroller && scroller.querySelector('.hm-cell[data-wire="2"]');
  const row = scroller && scroller.querySelector(".heatmap tr.best");
  const target = cell || row;
  if (scroller && target) {
    const focusBox = target.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    scroller.scrollTop += (focusBox.top + focusBox.bottom) / 2 - (view.top + view.bottom) / 2;
    scroller.scrollLeft += (focusBox.left + focusBox.right) / 2 - (view.left + view.right) / 2;
  }
});
await page.waitForTimeout(200);
await page.addStyleTag({
  content: ".app-header, .progress, .step-nav { visibility: hidden !important; }"
});
const heatmapPanel = page.locator("#heatmapPanel");
await heatmapPanel.screenshot({ path: path.join(outDir, "07-heatmap.png") });
console.log("wrote", path.join(outDir, "07-heatmap.png"));
await page.evaluate(() => {
  document.querySelectorAll("style").forEach((s) => {
    if (s.textContent && s.textContent.indexOf(".app-header, .progress, .step-nav") !== -1) s.remove();
  });
});

await page.waitForSelector(".wire-card");
const wire = page.locator('.wire-card[data-d="2"]');
if (await wire.count()) {
  await wire.click();
} else {
  await page.locator(".wire-card").first().click();
}
await page.waitForTimeout(250);
await shot("03-wires.png");

await page.click("#btnNext");
await page.waitForSelector("#Dslider");
await page.click("#btnOptimise");
await page.waitForTimeout(300);
await shot("04-optimise.png");

await page.click("#btnNext");
await page.waitForSelector("#particulars tbody tr");
await page.waitForTimeout(400);
await shot("05-results.png");

await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({
  path: path.join(outDir, "05-results-viewport.png"),
  fullPage: false
});
console.log("wrote", path.join(outDir, "05-results-viewport.png"));

async function shotEl(sel, name) {
  const dest = path.join(outDir, name);
  await page.addStyleTag({
    content: ".app-header, .progress, .step-nav { display: none !important; } main { padding-bottom: 24px; }"
  });
  const loc = page.locator(sel).first();
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await loc.screenshot({ path: dest });
  console.log("wrote", dest);
}

await shotEl("#graphSvg", "05a-graph.png");
await shotEl("#graphSvg", "08-graph-v12.png");
await shotEl("#graphSvg", "09-graph-v13.png");
await shotEl("#graphLegend", "05b-graph-key.png");
await shotEl("#particulars", "05c-particulars.png");
await shotEl("#springSvg", "06-diagram.png");

await browser.close();
