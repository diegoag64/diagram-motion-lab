// Visual examples, not inference. Contracts: docs.typesafe.ai/primitives and /confidence.
export const BLOCKS=[['state','State / evidence'],['question','Question / instructions'],['choice','Choice distribution'],['score','Score distribution'],['noul','Noul probability'],['image','Image evidence'],['box','Box region'],['action','Code / action']];
export const JEV_PRESETS=['choice','score','noul','box'].map((type,i)=>({id:`jev-${type}`,name:({choice:'Choice · classify and route',score:'Score · rate on a scale',noul:'Noul · check a condition',box:'Box · locate in an image'})[type],tag:String(i+8).padStart(2,'0'),kind:'jev-primitive',wide:true,caption:({choice:'One question. Competing categories. A route chosen by your code.',score:'Descriptive levels become a weighted score your code can compare.',noul:'A probability of yes, with a decision policy you control.',box:'Find a region, check presence, then let your code draw it.'})[type],description:({choice:'Choice probabilities sum to 100%. They compare alternatives, not independent labels. Adjust the distribution or the confidence threshold to see the chosen route change.',score:'The score is the probability-weighted position on ordered levels. Change the weights to move the score; the code threshold decides the priority.',noul:'A Noul is P(yes), not intensity. Near 50% means uncertainty. There is no separate confidence field. Use separate Noul questions when several labels can apply.',box:'Box returns one region using normalized image edges and includes confidence. A separate Noul checks presence in parallel; code ignores the region when presence is uncertain or low.'})[type],docs:`https://docs.typesafe.ai/primitives/${type}`}));
export function distribution(values){
  if(!Array.isArray(values)||values.length<2||values.some(p=>!Number.isFinite(p)||p<0))throw new Error('Use at least two non-negative weights.');
  const total=values.reduce((sum,p)=>sum+p,0);if(!total)throw new Error('At least one weight must be above zero.');
  return values.map(p=>p/total);
}
export function summarize(visual){
  if(visual.type==='choice'||visual.type==='score'){
    const ps=distribution(visual.options.map(o=>o.weight)),winner=ps.indexOf(Math.max(...ps)),n=ps.length;
    const score=ps.reduce((sum,p,i)=>sum+p*i,0);
    const even=ps.reduce((sum,_,i)=>sum+Math.abs(i-(n-1)/2),0)/n;
    const confidence=visual.type==='choice'?(ps[winner]-1/n)/(1-1/n):Math.max(0,1-ps.reduce((sum,p,i)=>sum+p*Math.abs(i-winner),0)/even);
    return {probabilities:ps,winner,score,confidence};
  }
  if(visual.type==='noul')return {value:visual.value,decision:visual.value>=visual.high?'yes':visual.value<=visual.low?'no':'review'};
  if(visual.type==='box')return {box:visual.box,confidence:visual.confidence};
  return {};
}
export function boxPixels(box,width,height){return {x:box.left*width,y:box.top*height,width:(box.right-box.left)*width,height:(box.bottom-box.top)*height};}
export function validVisual(v){
  if(!v||!BLOCKS.some(([type])=>type===v.type))return false;
  if(['state','question','action'].includes(v.type))return typeof v.text==='string'&&v.text.length<=500;
  if(['choice','score'].includes(v.type))return Array.isArray(v.options)&&v.options.length>=2&&v.options.length<=6&&v.options.every(o=>typeof o.label==='string'&&o.label.length>0&&o.label.length<=32&&Number.isFinite(o.weight)&&o.weight>=0&&o.weight<=100)&&v.options.some(o=>o.weight>0)&&new Set(v.options.map(o=>o.label)).size===v.options.length&&Number.isFinite(v.threshold)&&v.threshold>=0&&v.threshold<=(v.type==='choice'?1:v.options.length-1);
  if(v.type==='noul')return [v.value,v.low,v.high].every(x=>Number.isFinite(x)&&x>=0&&x<=1)&&v.low<v.high;
  if(v.type==='image')return v.image===undefined||validImage(v.image);
  if(v.type==='box')return v.box&&['left','right','top','bottom'].every(k=>Number.isFinite(v.box[k])&&v.box[k]>=0&&v.box[k]<=1)&&v.box.left<v.box.right&&v.box.top<v.box.bottom&&Number.isFinite(v.confidence)&&v.confidence>=0&&v.confidence<=1&&(v.image===undefined||validImage(v.image));
  return false;
}
export function validImage(image){return typeof image==='string'&&image.length<=700000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image);}
export function blockVisual(type){
  if(type==='choice')return {type,options:[{label:'Billing',weight:76},{label:'Delivery',weight:14},{label:'Other',weight:10}],threshold:.55};
  if(type==='score')return {type,options:[{label:'Cosmetic only',weight:5},{label:'Workaround available',weight:25},{label:'Work blocked',weight:70}],threshold:1.4};
  if(type==='noul')return {type,value:.86,low:.3,high:.7};
  if(type==='box')return {type,box:{left:.35,top:.19,right:.78,bottom:.81},confidence:.92};
  if(type==='image')return {type};
  return {type,text:({state:'The same evidence is available to each question.',question:'Ask one focused question about the state.',action:'Your code decides what happens next.'})[type]||''};
}
export function blockSize(v){
  if(v.type==='choice'||v.type==='score')return {width:320,height:156+v.options.length*44+(v.type==='score'?52:0)};
  if(v.type==='box')return {width:320,height:350};
  if(v.type==='image')return {width:240,height:220};
  if(v.type==='noul')return {width:320,height:230};
  return {width:240,height:v.type==='action'?112:180};
}
export function makeBlock(id,type,label,parent,born,visual=blockVisual(type)){
  return {id,label,subtitle:'',parent,born,visual,...blockSize(visual)};
}
export function createJevGraph(type){
  const input=type==='box'?makeBlock('n0','image','Image · photo',null,0):makeBlock('n0','state',type==='score'?'Bug report':'Incoming message',null,0);
  if(type!=='box')input.visual.text=({choice:'I was charged twice for my order. Please help me fix the extra payment.',score:'Checkout fails for every customer. There is no alternate way to pay.',noul:'I need a person to help me. The self-service steps did not fix it.'})[type];
  const question=makeBlock('n1','question','Question · '+type,null,0);
  question.visual.text=({choice:'Which team should handle this message?\nChoose Billing, Delivery, or Other.',score:'How much does this bug disrupt work?\nOrdered levels: cosmetic, workaround, blocked.',noul:'Is this customer asking for a human agent?',box:'Find the mug in photo.\nAlso ask: is a mug present?\nTwo independent questions, one request.'})[type];
  const result=makeBlock('n2',type,({choice:'Category probabilities',score:'Severity distribution',noul:'P(human requested)',box:'Mug region'})[type],'n0',1.1);
  input.position={x:0,y:40};question.position={x:0,y:320};result.position={x:370,y:100};
  input.compactPosition={x:40,y:0};question.compactPosition={x:40,y:input.height+70};result.compactPosition={x:0,y:input.height+320};
  const graph={preset:`jev-${type}`,layoutMode:'authored',nodes:[input,question,result],edges:[{id:'state-answer',from:'n0',to:'n2',label:'state'},{id:'question-answer',from:'n1',to:'n2',label:'question'}],nextId:3,showNodeNumbers:false,scenePadding:32};
  if(type==='box'){
    result.visual.imageFrom=input.id;
    const presence=makeBlock('n3','noul','P(mug present)','n0',1.1);presence.visual.value=.96;presence.position={x:370,y:530};presence.compactPosition={x:0,y:input.height+740};
    graph.nodes.push(presence);graph.nextId=4;graph.edges.push({id:'state-presence',from:'n0',to:'n3',label:'same state'},{id:'question-presence',from:'n1',to:'n3'});
    addRoutesInPlace(graph,'n3',[{label:'Draw the region',text:'Use the Box coordinates.',mode:'yes'},{label:'Skip / review',text:'Ignore the Box coordinates.',mode:'not-yes'}]);
    graph.edges.push({id:'box-region',from:'n2',to:'n4',label:'coordinates',when:{node:'n3',mode:'yes'}});
  } else addRoutesInPlace(graph,'n2');
  return refreshRoutes(graph);
}
function routeDefinitions(node){
  const v=node.visual;
  if(v.type==='choice')return [...v.options.map((o,i)=>({label:`${o.label} route`,text:`Code dispatches to ${o.label}.`,mode:'option',option:i})),{label:'Review route',text:'Low confidence.\nAsk for clarification.',mode:'review'}];
  if(v.type==='score')return [{label:'Prioritize',text:'Code adds to the priority queue.',mode:'above'},{label:'Normal queue',text:'Code keeps the ordinary priority.',mode:'below'}];
  if(v.type==='noul')return [{label:'Yes route',text:'Code acts on a likely yes.',mode:'yes'},{label:'Review route',text:'Code asks for clarification.',mode:'review'},{label:'No route',text:'Code follows the no branch.',mode:'no'}];
  return [];
}
function addRoutesInPlace(graph,nodeId,definitions){
  const source=graph.nodes.find(n=>n.id===nodeId),routes=definitions||routeDefinitions(source),baseY=source.position?.y||0;
  if(graph.nodes.length+routes.length>40)throw new Error('This canvas holds up to 40 nodes.');
  routes.forEach((route,i)=>{
    const id=`n${graph.nextId++}`,node=makeBlock(id,'action',route.label,nodeId,source.born+.9);node.visual.text=route.text;node.generatedRoute=true;
    if(graph.layoutMode==='authored'){
      node.position={x:(source.position?.x||0)+source.width+150,y:baseY+i*152};
      node.compactPosition={x:(source.compactPosition?.x||0),y:(source.compactPosition?.y||0)+source.height+120+i*172};
    }
    graph.nodes.push(node);graph.edges.push({id:`e-${id}`,from:nodeId,to:id,when:{node:nodeId,mode:route.mode,...(route.option===undefined?{}:{option:route.option})}});
  });
}
export function addRoutes(graph,nodeId){
  const source=graph.nodes.find(n=>n.id===nodeId);if(!source?.visual||!['choice','score','noul'].includes(source.visual.type))throw new Error('Select a Choice, Score, or Noul block.');
  if(graph.edges.some(e=>e.from===nodeId&&e.when))throw new Error('This answer already has routes. Edit its values to explore them.');
  const next=structuredClone(graph);addRoutesInPlace(next,nodeId);return refreshRoutes(next);
}
export function refreshRoutes(graph){
  for(const node of graph.nodes)delete node.routeActive;
  for(const edge of graph.edges){
    if(!edge.when)continue;
    const source=graph.nodes.find(n=>n.id===edge.when.node),v=source?.visual;if(!v){delete edge.when;delete edge.active;continue;}
    const a=summarize(v),{mode,option}=edge.when;
    if(v.type==='choice'){
      edge.active=mode==='review'?a.confidence<v.threshold:a.confidence>=v.threshold&&a.winner===option;
      edge.label=mode==='review'?`confidence < ${Math.round(v.threshold*100)}%`:`${v.options[option]?.label||'Removed option'} · ${Math.round((a.probabilities[option]||0)*100)}%`;
    } else if(v.type==='score'){
      edge.active=mode==='above'?a.score>=v.threshold:a.score<v.threshold;edge.label=`score ${mode==='above'?'≥':'<'} ${v.threshold.toFixed(2)}`;
    } else if(v.type==='noul'){
      edge.active=mode==='not-yes'?a.decision!=='yes':mode===a.decision;
      edge.label=mode==='yes'?`P(yes) ≥ ${Math.round(v.high*100)}%`:mode==='no'?`P(yes) ≤ ${Math.round(v.low*100)}%`:mode==='not-yes'?`P(yes) < ${Math.round(v.high*100)}%`:'between thresholds';
      if(edge.id==='box-region')edge.label='coordinates';
    }
    const target=graph.nodes.find(n=>n.id===edge.to);if(target){target.routeActive=(target.routeActive??false)||edge.active;if(v.type==='choice'&&mode==='option'&&target.generatedRoute&&v.options[option]){target.label=`${v.options[option].label} route`;target.visual.text=`Send to ${v.options[option].label}.`;}}
  }
  return graph;
}
export function connectBlocks(graph,from,to,label=''){
  if(from===to||!graph.nodes.some(n=>n.id===from)||!graph.nodes.some(n=>n.id===to))throw new Error('Choose two different existing blocks.');
  if(graph.edges.some(e=>e.from===from&&e.to===to))throw new Error('These blocks are already connected.');
  if(graph.edges.length>=100)throw new Error('This canvas holds up to 100 connections.');
  const next=structuredClone(graph);let id=`link-${from}-${to}`,i=1;while(next.edges.some(e=>e.id===id))id=`link-${from}-${to}-${i++}`;
  next.edges.push({id,from,to,label:String(label).slice(0,40)});return next;
}

// Keep existing routes and their children when editing an answer; remove only the
// removed option's subtree. Callers keep the previous graph as an undo snapshot.
export function updateVisual(graph,nodeId,visual){
  if(!validVisual(visual))throw new Error('Invalid primitive values.');
  const next=structuredClone(graph),node=next.nodes.find(n=>n.id===nodeId);
  if(!node?.visual||node.visual.type!==visual.type)throw new Error('Select a matching primitive block.');
  const oldCount=node.visual.options?.length;node.visual=structuredClone(visual);if(visual.type==='action')node.generatedRoute=false;Object.assign(node,blockSize(visual));
  if(oldCount&&oldCount!==visual.options.length){
    const conditional=next.edges.filter(e=>e.from===nodeId&&e.when);
    const removed=new Set(conditional.filter(e=>e.when.mode==='option'&&e.when.option>=visual.options.length).map(e=>e.to));
    let changed=true;while(changed){changed=false;for(const n of next.nodes)if(removed.has(n.parent)&&!removed.has(n.id)){removed.add(n.id);changed=true;}}
    next.nodes=next.nodes.filter(n=>!removed.has(n.id));next.edges=next.edges.filter(e=>!removed.has(e.from)&&!removed.has(e.to)&&!removed.has(e.when?.node));
    next.groups=(next.groups||[]).map(g=>({...g,members:g.members.filter(id=>!removed.has(id))})).filter(g=>g.members.length);
    if(visual.type==='choice'&&conditional.length){
      for(let i=oldCount;i<visual.options.length;i++)addRoutesInPlace(next,nodeId,[routeDefinitions(node)[i]]);
    }
    if(next.layoutMode==='authored'){
      for(const edge of next.edges.filter(e=>e.from===nodeId&&e.when)){
        const target=next.nodes.find(n=>n.id===edge.to),i=visual.type==='score'?(edge.when.mode==='above'?0:1):edge.when.mode==='option'?edge.when.option:visual.options.length;
        if(target?.generatedRoute){target.position.y=node.position.y+i*152;target.compactPosition.y=node.compactPosition.y+node.height+120+i*172;}
      }
    }
  }
  return refreshRoutes(next);
}
