import {JEV_PRESETS,createJevGraph,makeBlock,refreshRoutes} from './jev-primitives.js';
export const NODE_W = 156;
export const NODE_H = 76;
export const MAX_NODES = 40;
export const PRESETS = [
  ...JEV_PRESETS,
  { id:'jev', name:'One request, typed answers', tag:'07', kind:'composition', caption:'Your state and questions. One model call. Answers your code can use.', description:'Two inputs merge into one request. Jev evaluates each question against the state in parallel, then returns typed answers with probabilities and confidence for some types. Your code branches, sorts, and routes the result.', wide:true },
  { id:'branches', name:'Branching ideas', tag:'01', kind:'tree', caption:'One thought. Many possibilities.', description:'Start with an idea, then let it unfold. Select any node and grow a new branch.', labels:['An idea','Explore','Make','Research','Connect','Prototype','Refine'], subs:['the starting point','ask better questions','give it form','find the signal','spot a pattern','make it tangible','follow the feedback'], parents:[null,0,0,1,1,2,2], focal:0 },
  { id:'pipeline', name:'A flowing pipeline', tag:'02', kind:'pipeline', caption:'Follow the work, from start to finish.', description:'A clear sequence of handoffs. Try a flowing stream or a single traveling signal.', labels:['Input','Transform','Validate','Output'], subs:['raw material','shape the data','check the result','ready to use'], parents:[null,0,1,2], focal:1 },
  { id:'fanout', name:'Parallel thinking', tag:'03', kind:'fanout', caption:'One request. Multiple perspectives.', description:'An orchestrator sends work down three paths, then brings the results together.', labels:['Request','Orchestrator','Research','Build','Review','Synthesis'], subs:['user intent','plan + dispatch','find context','try an approach','check the work','a shared answer'], parents:[null,0,1,1,1,3], extra:[[2,5],[4,5]], focal:1 },
  { id:'feedback', name:'The feedback loop', tag:'04', kind:'loop', caption:'A little feedback changes everything.', description:'Learning is a loop. Follow the return connection as the result informs the next attempt.', labels:['Observe','Hypothesize','Experiment','Learn'], subs:['notice a signal','make a prediction','test the idea','update the model'], parents:[null,0,1,2], extra:[[3,0]], focal:3 },
  { id:'architecture', name:'Under the surface', tag:'05', kind:'architecture', caption:'Make the invisible system visible.', description:'Trace a request through a small application. Branch from any service to extend the system.', labels:['Browser','API gateway','Auth','Application','Database','Cache'], subs:['the interface','route the request','verify identity','run the logic','persist state','keep it close'], parents:[null,0,1,1,3,3], focal:1 },
  { id:'blank', name:'A blank beginning', tag:'06', kind:'blank', caption:'Every system starts with one thing.', description:'Name your starting point, grow its branches, and see where the idea takes you.', labels:['Start here'], subs:['a new possibility'], parents:[null], focal:0 },
];

export function createGraph(id) {
  const p = PRESETS.find(p => p.id === id) || PRESETS[0];
  if(p.kind==='jev-primitive')return createJevGraph(p.id.slice(4));
  if(p.id==='jev') return {
    preset:'jev',layoutMode:'authored',nextId:6,referenceVersion:2,scenePadding:8,showNodeNumbers:false,
    nodes:[
      {id:'n0',label:'your data',subtitle:'(the state)\ntext or JSON',parent:null,born:0,width:156.6328125,height:102,position:{x:16,y:20},compactPosition:{x:0,y:0}},
      {id:'n1',label:'your questions',subtitle:'about the data\n(several types)',parent:null,born:0,width:172.6328125,height:102,position:{x:8,y:172},compactPosition:{x:212,y:0}},
      {id:'n2',kind:'junction',label:'Combined request',subtitle:'',parent:'n0',born:.6,position:{x:222.6394591331482,y:147},compactPosition:{x:188,y:180}},
      {id:'n3',label:'evaluate each question',subtitle:'against the state\nin parallel',parent:'n2',born:1.2,width:234.8984375,height:102,position:{x:389.8726682662964,y:108},compactPosition:{x:70.55078125,y:296}},
      {id:'n4',label:'typed answers',subtitle:'+ probabilities\n+ confidence\n(some types)',parent:'n3',born:2.1,width:171.4453125,height:126,position:{x:797.7945432662964,y:84},compactPosition:{x:102.27734375,y:540}},
      {id:'n5',label:'your code',subtitle:'branch, sort, and route',parent:'n4',born:3,width:232.578125,height:78,position:{x:1004.2398557662964,y:108},compactPosition:{x:71.7109375,y:780}},
    ],
    groups:[{id:'model',label:'TypeSafe AI model: Jev',eyebrow:'',members:['n3'],focal:true,padding:{left:35,right:35,top:54,bottom:30},titleAlign:'center'}],
    edges:[
      {id:'data-request',from:'n0',to:'n2',arrow:false},
      {id:'questions-request',from:'n1',to:'n2',arrow:false},
      {id:'request-model',from:'n2',to:'n3',toGroup:'model',label:'one request'},
      {id:'model-response',from:'n3',to:'n4',fromGroup:'model',label:'one response'},
      {id:'response-code',from:'n4',to:'n5'},
    ]
  };
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
    if(graph.layoutMode==='authored') {
      const added=result.nodes.at(-1),bottom=Math.max(...graph.nodes.map(n=>(n.position?.y||0)+nodeSize(n).height));
      added.position={x:(parent.position?.x||0)+nodeSize(parent).width+160,y:bottom+100+i*120};
      added.compactPosition={x:i*184,y:Math.max(...graph.nodes.map(n=>(n.compactPosition?.y||0)+nodeSize(n).height))+140};
    }
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
  return {...clone(graph),nodes:graph.nodes.filter(n=>!removed.has(n.id)).map(n=>({...n})),edges:graph.edges.filter(e=>!removed.has(e.from)&&!removed.has(e.to)&&!removed.has(e.when?.node)).map(e=>({...e})),groups:(graph.groups||[]).map(g=>({...g,members:g.members.filter(id=>!removed.has(id))})).filter(g=>g.members.length)};
}

// Primary-parent links determine layout. Cross-links never change tree depth.
export function layout(graph,vertical=false) {
  if(graph.layoutMode==='authored')return new Map(graph.nodes.map(n=>[n.id,{...(vertical?n.compactPosition:n.position)}]));
  const children=new Map(graph.nodes.map(n=>[n.id,[]]));
  for(const node of graph.nodes) if(node.parent) children.get(node.parent)?.push(node);
  const positions=new Map(); let leaf=0;
  const gapX=Math.max(248,...graph.nodes.map(n=>nodeSize(n).width+92)),gapY=Math.max(120,...graph.nodes.map(n=>nodeSize(n).height+44));
  function place(node,depth) {
    const kids=children.get(node.id);
    const ys=kids.map(child=>place(child,depth+1));
    const y=ys.length?(ys[0]+ys.at(-1))/2:leaf++*gapY;
    positions.set(node.id,{x:depth*gapX,y}); return y;
  }
  for(const root of graph.nodes.filter(n=>n.parent===null)) place(root,0);
  if(vertical)for(const [id,p] of positions)positions.set(id,{x:p.y/gapY*Math.max(184,gapX-64),y:p.x/gapX*Math.max(156,gapY+36)});
  return positions;
}

export function nodeSize(node) { return node.kind==='junction'?{width:0,height:0}:{width:node.width||NODE_W,height:node.height||NODE_H}; }
export function nodeBox(node,positions) { return {...positions.get(node.id),...nodeSize(node)}; }
export function groupBox(group,graph,positions) {
  const boxes=group.members.map(id=>graph.nodes.find(n=>n.id===id)).filter(Boolean).map(n=>nodeBox(n,positions));
  const padding=group.padding||{left:24,right:24,top:64,bottom:24};
  const x=Math.min(...boxes.map(b=>b.x))-padding.left,y=Math.min(...boxes.map(b=>b.y))-padding.top;
  return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x+padding.right,height:Math.max(...boxes.map(b=>b.y+b.height))-y+padding.bottom};
}
export function connectionGeometry(graph,positions,edge,vertical=false) {
  const endpoint=(id,groupId)=>groupId?groupBox(graph.groups.find(g=>g.id===groupId),graph,positions):nodeBox(graph.nodes.find(n=>n.id===id),positions);
  return edgeGeometry(endpoint(edge.from,edge.fromGroup),endpoint(edge.to,edge.toGroup),edge.feedback,vertical);
}
export function sceneBounds(graph,positions,vertical=false) {
  const boxes=graph.nodes.map(n=>nodeBox(n,positions)).concat((graph.groups||[]).map(g=>groupBox(g,graph,positions)));
  const padding=graph.scenePadding??32,feedback=graph.edges.some(e=>e.feedback),x=Math.min(...boxes.map(b=>b.x))-padding,y=Math.min(...boxes.map(b=>b.y))-padding;
  return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x+(feedback&&vertical?120:padding),height:Math.max(...boxes.map(b=>b.y+b.height))-y+(feedback&&!vertical?120:padding)};
}

export function edgeGeometry(a,b,feedback=false,vertical=false) {
  const aw=a.width??NODE_W,ah=a.height??NODE_H,bw=b.width??NODE_W,bh=b.height??NODE_H;
  if(vertical) {
    const start={x:a.x+aw/2,y:a.y+ah},end={x:b.x+bw/2,y:b.y};
    const side=Math.max(a.x+aw,b.x+bw)+96;
    const points=feedback||b.y<=a.y
      ?[{x:a.x+aw,y:a.y+ah/2},{x:side,y:a.y+ah/2},{x:side,y:b.y+bh/2},{x:b.x+bw,y:b.y+bh/2}]
      :[start,{x:start.x,y:(start.y+end.y)/2},{x:end.x,y:(start.y+end.y)/2},end];
    return {d:`M ${points[0].x} ${points[0].y} C ${points[1].x} ${points[1].y}, ${points[2].x} ${points[2].y}, ${points[3].x} ${points[3].y}`,points};
  }
  const start={x:a.x+aw,y:a.y+ah/2};
  const end={x:b.x,y:b.y+bh/2};
  if(feedback || b.x<=a.x) {
    const bottom=Math.max(a.y+ah,b.y+bh)+96;
    return {d:`M ${a.x+aw/2} ${a.y+ah} C ${a.x+aw/2} ${bottom}, ${b.x+bw/2} ${bottom}, ${b.x+bw/2} ${b.y+bh}`,points:[{x:a.x+aw/2,y:a.y+ah},{x:a.x+aw/2,y:bottom},{x:b.x+bw/2,y:bottom},{x:b.x+bw/2,y:b.y+bh}]};
  }
  const mid=(start.x+end.x)/2;
  return {d:`M ${start.x} ${start.y} C ${mid} ${start.y}, ${mid} ${end.y}, ${end.x} ${end.y}`,points:[start,{x:mid,y:start.y},{x:mid,y:end.y},end]};
}

export function bezierPoint(points,t) {
  const s=1-t;const weights=[s*s*s,3*s*s*t,3*s*t*t,t*t*t];
  return {x:points.reduce((sum,p,i)=>sum+p.x*weights[i],0),y:points.reduce((sum,p,i)=>sum+p.y*weights[i],0)};
}

export function addBlock(graph,parentId,type,now){
  const next=grow(graph,parentId,1,now),placeholder=next.nodes.at(-1);
  const block=makeBlock(placeholder.id,type,({state:'State',question:'Question',choice:'Category probabilities',score:'Level distribution',noul:'P(condition holds)',image:'Image evidence',box:'Target region',action:'Next action'})[type],parentId,placeholder.born);
  if(!block.label)throw new Error('Choose a supported block type.');
  if(type==='box'&&graph.nodes.find(n=>n.id===parentId)?.visual?.type==='image')block.visual.imageFrom=parentId;
  Object.assign(placeholder,block);next.showNodeNumbers=false;return refreshRoutes(next);
}
