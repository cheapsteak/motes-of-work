import { essayNetwork, NET_SHOTS, crackCentre } from '/home/user/motes-of-work/src/timeline/netShots';
import { nodeIndex } from '/home/user/motes-of-work/src/network/generate';
const net = essayNetwork();
for (const id of ['C1','C5','R0','R1']) {
  const n = net.nodes[nodeIndex(net, id)];
  console.log(id, {layer:n.layer, unit:n.unit, cubes:n.boxes.length, centre:n.centre.map(v=>+v.toFixed(2)), yaw:+(n.yaw??0).toFixed(3), radius:+n.radius.toFixed(2), height:n.height, motes:n.motes, person:n.personMotes, crackBox:n.crackBox, glow:+n.glow.toFixed(4)});
  const b = n.boxes[n.crackBox];
  console.log('  crack box', {centre:b.centre.map(v=>+v.toFixed(3)), size:b.size.map(v=>+v.toFixed(3)), yaw:+b.yaw.toFixed(3), course:b.course});
  console.log('  boxes', n.boxes.map(b=>`c${b.course} x${b.centre[0].toFixed(2)} z${b.centre[2].toFixed(2)} L${b.size[0].toFixed(2)}`).join(' | '));
}
const c1 = net.nodes[nodeIndex(net,'C1')];
for (const n of net.nodes) { const d=Math.hypot(n.centre[0]-c1.centre[0], n.centre[2]-c1.centre[2]); if (n.id!=='C1' && n.layer==='code' && d<5) console.log('near C1:', n.id, d.toFixed(2), 'born', n.born, 'dir', [(n.centre[0]-c1.centre[0]).toFixed(2),(n.centre[2]-c1.centre[2]).toFixed(2)]); }
console.log('N8', NET_SHOTS.N8, crackCentre('C1'));
