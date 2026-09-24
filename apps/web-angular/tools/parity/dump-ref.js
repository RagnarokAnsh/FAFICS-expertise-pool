// Render the React/recharts reference charts headlessly and dump their DOM.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const data = require('./chart-data');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const widths = (process.argv[2] || '560').split(',');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const out = {};
  for (const w of widths) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000 });
    await page.evaluateOnNewDocument((d) => { window.CHART_DATA = d; }, data);
    const url = 'file:///' + path.join(__dirname, 'charts-ref.html').replace(/\\/g, '/') + `?w=${w}&anim=0`;
    await page.goto(url, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 800));
    out[w] = await page.evaluate(() => {
      const res = {};
      for (const box of document.querySelectorAll('.box')) res[box.id] = box.innerHTML;
      return res;
    });
    fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
    for (const id of Object.keys(out[w])) {
      const el = await page.$('#' + id);
      await el.screenshot({ path: path.join(__dirname, 'shots', `ref-${id}-${w}.png`) });
    }
    await page.close();
  }
  fs.writeFileSync(path.join(__dirname, 'ref-dom.json'), JSON.stringify(out, null, 2));
  await browser.close();
  console.log('done', Object.keys(out));
})().catch((e) => { console.error(e); process.exit(1); });
