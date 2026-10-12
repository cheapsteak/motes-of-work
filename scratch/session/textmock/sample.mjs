import pw from "../../../node_modules/playwright/index.js";
const b = await pw.chromium.launch(); const p = await b.newPage();
for (const f of ['desktop-0.08.png','desktop-0.42.png']) {
  await p.goto(`file://<scratchpad>/mobile/${f}`);
  const r = await p.evaluate(async () => {
    const img = document.querySelector('img'); await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const avg = (x, y, w, h) => { const d = g.getImageData(x, y, w, h).data; let s = [0,0,0]; for (let i = 0; i < d.length; i += 4) { s[0]+=d[i]; s[1]+=d[i+1]; s[2]+=d[i+2]; } const n = d.length/4; return s.map(v => Math.round(v/n)); };
    return { aboveTL: avg(70,150,40,40), aboveTR: avg(500,150,40,40), belowL: avg(70,620,40,40), belowR: avg(500,620,40,40), leftMid: avg(10,380,40,40), rightMid: avg(580,380,20,40), insidePanel: avg(300,400,40,40), farStars: avg(300,700,40,40) };
  });
  console.log(f, JSON.stringify(r));
}
await b.close();
