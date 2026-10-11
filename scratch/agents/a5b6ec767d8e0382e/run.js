const counts = {};
const ctx = new Proxy({}, { get: (_, k) => (k === 'fillStyle' || k === 'font' || k === 'globalCompositeOperation') ? '' : ((...a) => { counts[k] = (counts[k] || 0) + 1; }), set: () => true });
global.document = { getElementById: () => ({ width: 390, height: 844, getContext: () => ctx }) };
require('./mock.js');
console.log('ok', counts);
