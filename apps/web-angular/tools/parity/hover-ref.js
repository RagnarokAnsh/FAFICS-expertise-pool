// Hover the reference charts and dump tooltip + cursor markup.
const puppeteer = require('puppeteer-core');
const path = require('path');
const data = require('./chart-data');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 3000 });
  await page.evaluateOnNewDocument((d) => { window.CHART_DATA = d; }, data);
  await page.goto('file:///' + path.join(__dirname, 'charts-ref.html').replace(/\\/g, '/') + '?w=560&anim=0', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 600));

  async function hover(id, dx, dy) {
    const box = await (await page.$('#' + id)).boundingBox();
    await page.mouse.move(box.x + dx, box.y + dy);
    await new Promise((r) => setTimeout(r, 700));
    return page.evaluate((id) => {
      const root = document.getElementById(id);
      const tip = root.querySelector('.recharts-tooltip-wrapper');
      const cursor = root.querySelector('.recharts-tooltip-cursor');
      const active = root.querySelector('.recharts-active-shape, .recharts-active-bar');
      return {
        tip: tip ? tip.outerHTML : null,
        cursor: cursor ? cursor.outerHTML : null,
        active: active ? active.outerHTML.slice(0, 400) : null,
      };
    }, id);
  }

  console.log('PIE', JSON.stringify(await hover('status', 330, 60), null, 1));
  console.log('GRADE', JSON.stringify(await hover('grade', 130, 150), null, 1));
  console.log('EXPERTISE', JSON.stringify(await hover('expertise', 300, 25), null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
