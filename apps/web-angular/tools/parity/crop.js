// node crop.js <png> <x> <y> <w> <h> <out> [scale]  — crop (and optionally upscale) a region for close inspection
const fs = require('fs');
const { PNG } = require('pngjs');
const [src, x, y, w, h, out, scale = '1'] = process.argv.slice(2);
const img = PNG.sync.read(fs.readFileSync(src));
const s = Number(scale);
const o = new PNG({ width: +w * s, height: +h * s });
for (let j = 0; j < +h * s; j++)
  for (let i = 0; i < +w * s; i++) {
    const si = ((+y + Math.floor(j / s)) * img.width + (+x + Math.floor(i / s))) * 4;
    const di = (j * o.width + i) * 4;
    for (let k = 0; k < 4; k++) o.data[di + k] = img.data[si + k];
  }
fs.writeFileSync(out, PNG.sync.write(o));
