import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGraph,grow,removeBranch,layout,duration,NODE_H,MAX_NODES} from '../dist/model.js';

// Protect real editing contracts: immutable undo snapshots, valid references,
// preserved siblings, and non-overlapping layout after uneven recursive growth.
test('recursive growth and removal preserve siblings, valid edges, and undo snapshots',()=>{
  const original=createGraph('blank');
  const branched=grow(original,'n0',2,1);
  const nested=grow(branched,'n1',3,2);
  const removed=removeBranch(nested,'n1');
  assert.equal(original.nodes.length,1);
  assert.equal(branched.nodes.length,3);
  assert.equal(nested.nodes.length,6);
  assert.deepEqual(removed.nodes.map(n=>n.id),['n0','n2']);
  assert.deepEqual(removed.edges.map(e=>[e.from,e.to]),[['n0','n2']]);
  assert.ok(nested.nodes.filter(n=>n.parent==='n1').every(n=>n.born>2));
  assert.ok(duration(nested)>Math.max(...nested.nodes.map(n=>n.born)));
});
test('uneven deep branches remain separated and every child is to the right of its parent',()=>{
  let g=createGraph('branches');
  g=grow(g,'n3',3,3);g=grow(g,'n7',3,4);g=grow(g,'n2',2,5);
  const positions=layout(g);
  for(const n of g.nodes) {
    const p=positions.get(n.id);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(n.parent)assert.ok(p.x>positions.get(n.parent).x);
  }
  const points=[...positions.values()];
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(points[i].x===points[j].x)assert.ok(Math.abs(points[i].y-points[j].y)>NODE_H);
});
test('editing limits reject invalid growth without changing the graph',()=>{
  let g=createGraph('blank');
  while(g.nodes.length<MAX_NODES)g=grow(g,'n0',Math.min(3,MAX_NODES-g.nodes.length),0);
  assert.throws(()=>grow(g,'n0',1,0),/up to 40/);
  assert.throws(()=>grow(g,'missing',1,0),/Select a node/);
  assert.throws(()=>grow(g,'n0',0,0),/one to three/);
  assert.throws(()=>removeBranch(g,'n0'),/starting node/);
  assert.equal(g.nodes.length,MAX_NODES);
});
