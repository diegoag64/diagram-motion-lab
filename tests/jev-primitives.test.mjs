import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGraph,addBlock,grow,removeBranch,layout,connectionGeometry} from '../dist/model.js';
import {summarize,distribution,blockVisual,boxPixels,validVisual,updateVisual,addRoutes,connectBlocks} from '../dist/jev-primitives.js';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} differs from ${expected}`);

// These examples are independent numeric contracts from the TypeSafe confidence
// docs, not expected values obtained from the implementation under test.
test('Choice and Score preserve their distinct documented probability semantics',()=>{
  const choice={...blockVisual('choice'),options:[{label:'a',weight:60},{label:'b',weight:30},{label:'c',weight:10}]};
  const a=summarize(choice);assert.equal(a.winner,0);assert.deepEqual(a.probabilities,[.6,.3,.1]);close(a.confidence,.4);
  const score={...blockVisual('score'),options:[{label:'cosmetic',weight:0},{label:'workaround',weight:57},{label:'blocked',weight:43}]};
  close(summarize(score).score,1.43);close(summarize(score).confidence,.355);
  const adjacent={...score,options:score.options.map((o,i)=>({...o,weight:[0,50,50][i]}))};
  const separated={...score,options:score.options.map((o,i)=>({...o,weight:[50,0,50][i]}))};
  close(summarize(adjacent).confidence,.25);close(summarize(separated).confidence,0);
  assert.throws(()=>distribution([0,0]),/above zero/);assert.throws(()=>distribution([-1,2]),/non-negative/);
});

test('editing probabilities changes code routes, keeps thresholds separate, and leaves undo snapshots intact',()=>{
  const original=createGraph('jev-choice'),visual=structuredClone(original.nodes[2].visual);
  visual.options.forEach(o=>o.weight=1);
  const uncertain=updateVisual(original,'n2',visual);
  assert.equal(uncertain.edges.find(e=>e.active).when.mode,'review');
  assert.equal(original.nodes[2].visual.options[0].weight,76);
  visual.options[1].weight=100;const delivery=updateVisual(uncertain,'n2',visual);
  assert.equal(delivery.edges.filter(e=>e.active).length,1);assert.equal(delivery.edges.find(e=>e.active).when.option,1);
  const noul=createGraph('jev-noul'),noulVisual=noul.nodes[2].visual;
  for(const [value,mode] of [[.3,'no'],[.5,'review'],[.7,'yes']]){
    const next=updateVisual(noul,'n2',{...noulVisual,value});assert.equal(next.edges.find(e=>e.active).when.mode,mode);
    assert.equal('confidence' in summarize(next.nodes[2].visual),false);
  }
});

test('Box coordinates scale with the image and presence gates the drawing independently',()=>{
  const box={left:.25,top:.1,right:.75,bottom:.9};
  assert.deepEqual(boxPixels(box,400,200),{x:100,y:20,width:200,height:160});
  const visual={...blockVisual('box'),box};assert.equal(validVisual(visual),true);
  assert.equal(validVisual({...visual,box:{...box,left:.8}}),false);
  assert.equal(validVisual({...visual,box:{...box,bottom:1.2}}),false);
  const original=createGraph('jev-box'),absent=updateVisual(original,'n3',{...original.nodes[3].visual,value:.1});
  assert.equal(absent.edges.find(e=>e.id==='box-region').active,false);
  assert.deepEqual(absent.nodes[2].visual.box,original.nodes[2].visual.box);
  assert.equal(absent.nodes.find(n=>n.label==='Skip / review').routeActive,true);
});

test('composing blocks and changing option counts retain valid links and unrelated branches',()=>{
  const blank=createGraph('blank'),choice=addBlock(blank,'n0','choice',0),routed=addRoutes(choice,'n1');
  assert.equal(blank.nodes.length,1);assert.equal(choice.nodes.length,2);assert.equal(routed.nodes.length,6);
  const nested=grow(routed,'n2',1,3),visual=structuredClone(nested.nodes.find(n=>n.id==='n1').visual);
  visual.options.push({label:'Account',weight:80});const extended=updateVisual(nested,'n1',visual);
  assert.ok(extended.nodes.some(n=>n.label==='Account route'));
  assert.ok(extended.nodes.some(n=>n.parent==='n2'));
  visual.options.pop();const reduced=updateVisual(extended,'n1',visual);
  assert.ok(!reduced.nodes.some(n=>n.label==='Account route'));assert.ok(reduced.nodes.some(n=>n.parent==='n2'));
  const connected=connectBlocks(reduced,'n3','n4','handoff');assert.equal(connected.edges.at(-1).label,'handoff');
  assert.throws(()=>connectBlocks(connected,'n3','n4'),/already connected/);
  const removed=removeBranch(connected,'n1');assert.deepEqual(removed.nodes.map(n=>n.id),['n0']);assert.equal(removed.edges.length,0);
  for(const vertical of [false,true]){
    const positions=layout(extended,vertical);
    for(const edge of extended.edges)assert.ok(connectionGeometry(extended,positions,edge,vertical).points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  }
});
