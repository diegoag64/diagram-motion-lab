export const NODE_W = 156;
export const NODE_H = 76;
export const MAX_NODES = 40;
export const PRESETS = [
  { id:'branches', name:'Branching ideas', tag:'01', kind:'tree', caption:'One thought. Many possibilities.', description:'Start with an idea, then let it unfold. Select any node and grow a new branch.', labels:['An idea','Explore','Make','Research','Connect','Prototype','Refine'], subs:['the starting point','ask better questions','give it form','find the signal','spot a pattern','make it tangible','follow the feedback'], parents:[null,0,0,1,1,2,2], focal:0 },
  { id:'pipeline', name:'A flowing pipeline', tag:'02', kind:'pipeline', caption:'Follow the work, from start to finish.', description:'A clear sequence of handoffs. Try a flowing stream or a single traveling signal.', labels:['Input','Transform','Validate','Output'], subs:['raw material','shape the data','check the result','ready to use'], parents:[null,0,1,2], focal:1 },
  { id:'fanout', name:'Parallel thinking', tag:'03', kind:'fanout', caption:'One request. Multiple perspectives.', description:'An orchestrator sends work down three paths, then brings the results together.', labels:['Request','Orchestrator','Research','Build','Review','Synthesis'], subs:['user intent','plan + dispatch','find context','try an approach','check the work','a shared answer'], parents:[null,0,1,1,1,3], extra:[[2,5],[4,5]], focal:1 },
  { id:'feedback', name:'The feedback loop', tag:'04', kind:'loop', caption:'A little feedback changes everything.', description:'Learning is a loop. Follow the return connection as the result informs the next attempt.', labels:['Observe','Hypothesize','Experiment','Learn'], subs:['notice a signal','make a prediction','test the idea','update the model'], parents:[null,0,1,2], extra:[[3,0]], focal:3 },
  { id:'architecture', name:'Under the surface', tag:'05', kind:'architecture', caption:'Make the invisible system visible.', description:'Trace a request through a small application. Branch from any service to extend the system.', labels:['Browser','API gateway','Auth','Application','Database','Cache'], subs:['the interface','route the request','verify identity','run the logic','persist state','keep it close'], parents:[null,0,1,1,3,3], focal:1 },
  { id:'blank', name:'A blank beginning', tag:'06', kind:'blank', caption:'Every system starts with one thing.', description:'Name your starting point, grow its branches, and see where the idea takes you.', labels:['Start here'], subs:['a new possibility'], parents:[null], focal:0 },
];

export function createGraph(id) {
  const p = PRESETS.find(p => p.id === id) || PRESETS[0];
  const depths=[];
  const nodes=p.labels.map((label,i) => {
    depths[i]=p.parents[i]===null?0:depths[p.parents[i]]+1;
    return {id:`n${i}`, label, subtitle:p.subs[i], parent:p.parents[i]===null?null:`n${p.parents[i]}`, born:depths[i]*.9, focal:i===p.focal};
  });
  const edges=nodes.filter(n=>n.parent).map(n=>({id:`e-${n.id}`,from:n.parent,to:n.id}));
  for(const [a,b] of p.extra||[]) edges.push({id:`cross-${a}-${b}`,from:`n${a}`,to:`n${b}`,feedback:b<a});
  return {preset:p.id,nodes,edges,nextId:nodes.length};
}

export function duration(graph) { return Math.max(...graph.nodes.map(n=>n.born),0)+.7; }
export function clone(graph) { return structuredClone(graph); }
export function grow(graph, parentId, count, now) {
  const parent=graph.nodes.find(n=>n.id===parentId);
  if(!parent) throw new Error('Select a node first.');
  if(!Number.isInteger(count)||count<1||count>3) throw new Error('Choose one to three branches.');
  if(graph.nodes.length+count>MAX_NODES) throw new Error(`This canvas holds up to ${MAX_NODES} nodes. Remove a branch to make room.`);
  const result=clone(graph);
  for(let i=0;i<count;i++) {
    const id=`n${result.nextId++}`;
    result.nodes.push({id,label:`New idea ${result.nextId}`,subtitle:'something to explore',parent:parentId,born:Math.max(now,parent.born+.7)+.3+i*.22,focal:false});
    result.edges.push({id:`e-${id}`,from:parentId,to:id});
  }
  return result;
}

export function removeBranch(graph,id) {
  const node=graph.nodes.find(n=>n.id===id);
  if(!node || node.parent===null) throw new Error('The starting node stays on the canvas.');
  const removed=new Set([id]);
  let changed=true;
  while(changed) { changed=false; for(const n of graph.nodes) if(removed.has(n.parent)&&!removed.has(n.id)){removed.add(n.id);changed=true;} }
  return {...clone(graph),nodes:graph.nodes.filter(n=>!removed.has(n.id)).map(n=>({...n})),edges:graph.edges.filter(e=>!removed.has(e.from)&&!removed.has(e.to)).map(e=>({...e}))};
}

// Primary-parent links determine layout. Cross-links never change tree depth.
export function layout(graph) {
  const children=new Map(graph.nodes.map(n=>[n.id,[]]));
  for(const node of graph.nodes) if(node.parent) children.get(node.parent)?.push(node);
  const positions=new Map(); let leaf=0;
  function place(node,depth) {
    const kids=children.get(node.id);
    const ys=kids.map(child=>place(child,depth+1));
    const y=ys.length?(ys[0]+ys.at(-1))/2:leaf++*120;
    positions.set(node.id,{x:depth*248,y}); return y;
  }
  for(const root of graph.nodes.filter(n=>n.parent===null)) place(root,0);
  return positions;
}

export function edgeGeometry(a,b,feedback=false,vertical=false) {
  if(vertical) {
    const start={x:a.x+NODE_W/2,y:a.y+NODE_H},end={x:b.x+NODE_W/2,y:b.y};
    const side=Math.max(a.x,b.x)+NODE_W+96;
    const points=feedback||b.y<=a.y
      ?[{x:a.x+NODE_W,y:a.y+NODE_H/2},{x:side,y:a.y+NODE_H/2},{x:side,y:b.y+NODE_H/2},{x:b.x+NODE_W,y:b.y+NODE_H/2}]
      :[start,{x:start.x,y:(start.y+end.y)/2},{x:end.x,y:(start.y+end.y)/2},end];
    return {d:`M ${points[0].x} ${points[0].y} C ${points[1].x} ${points[1].y}, ${points[2].x} ${points[2].y}, ${points[3].x} ${points[3].y}`,points};
  }
  const start={x:a.x+NODE_W,y:a.y+NODE_H/2};
  const end={x:b.x,y:b.y+NODE_H/2};
  if(feedback || b.x<=a.x) {
    const bottom=Math.max(a.y,b.y)+NODE_H+96;
    return {d:`M ${a.x+NODE_W/2} ${a.y+NODE_H} C ${a.x+NODE_W/2} ${bottom}, ${b.x+NODE_W/2} ${bottom}, ${b.x+NODE_W/2} ${b.y+NODE_H}`,points:[{x:a.x+NODE_W/2,y:a.y+NODE_H},{x:a.x+NODE_W/2,y:bottom},{x:b.x+NODE_W/2,y:bottom},{x:b.x+NODE_W/2,y:b.y+NODE_H}]};
  }
  const mid=(start.x+end.x)/2;
  return {d:`M ${start.x} ${start.y} C ${mid} ${start.y}, ${mid} ${end.y}, ${end.x} ${end.y}`,points:[start,{x:mid,y:start.y},{x:mid,y:end.y},end]};
}

export function bezierPoint(points,t) {
  const s=1-t;const weights=[s*s*s,3*s*s*t,3*s*t*t,t*t*t];
  return {x:points.reduce((sum,p,i)=>sum+p.x*weights[i],0),y:points.reduce((sum,p,i)=>sum+p.y*weights[i],0)};
}
