import { createServer } from '/home/user/motes-of-work/node_modules/vite/dist/node/index.js';
const s = await createServer({ root: '/home/user/motes-of-work', cacheDir: process.argv[2] + '/vcache', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
const r = await s.ssrLoadModule('/src/mechanisms/bike/rider.ts');
const k = r.riderSkeleton();
const f = (v) => v.map((x) => x.toFixed(3)).join(',');
console.log('hip', f(k.hip), 'shoulder', f(k.shoulder), 'chest', f(k.chest[0]), f(k.chest[1]));
for (const i of [0, 1]) console.log('side', i, 'shoulder', f(k.shoulders[i]), 'elbow', f(k.elbows[i]), 'wrist', f(k.wrists[i]), 'grip', f(k.grips[i]));
await s.close();
