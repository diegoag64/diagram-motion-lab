import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGraph,grow,removeBranch,layout,duration,connectionGeometry,sceneBounds,NODE_H,MAX_NODES} from '../dist/model.js';

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

test('the two inputs converge at one junction and request/response attach to the container boundary',()=>{
  const g=createGraph('jev'),positions=layout(g),path=id=>connectionGeometry(g,positions,g.edges.find(e=>e.id===id)).points;
  assert.deepEqual(path('data-request').at(-1),{x:220,y:140});
  assert.deepEqual(path('questions-request').at(-1),{x:220,y:140});
  assert.deepEqual(path('request-model')[0],{x:220,y:140});
  assert.deepEqual(path('request-model').at(-1),{x:360,y:140});
  assert.deepEqual(path('model-response')[0],{x:632,y:140});
  const compact=layout(g,true),request=connectionGeometry(g,compact,g.edges.find(e=>e.id==='request-model'),true);
  assert.deepEqual(request.points[0],{x:188,y:180});
  assert.deepEqual(request.points.at(-1),{x:188,y:232});
});

test('authored graphs remain finite after growth and removal cleans empty containers',()=>{
  const original=createGraph('jev'),grown=grow(original,'n3',3,4);
  for(const vertical of [false,true]){
    const positions=layout(grown,vertical),bounds=sceneBounds(grown,positions,vertical);
    assert.ok(Object.values(bounds).every(Number.isFinite));
    for(const e of grown.edges)assert.ok(connectionGeometry(grown,positions,e,vertical).points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
    const newPositions=grown.nodes.filter(n=>!original.nodes.some(o=>o.id===n.id)).map(n=>positions.get(n.id));
    assert.equal(new Set(newPositions.map(p=>`${p.x},${p.y}`)).size,3);
  }
  const removed=removeBranch(grown,'n3');
  assert.equal(removed.groups.length,0);
  assert.ok(removed.edges.every(e=>removed.nodes.some(n=>n.id===e.from)&&removed.nodes.some(n=>n.id===e.to)));
  assert.equal(original.groups.length,1);
});
