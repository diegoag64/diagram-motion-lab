import {layout,connectionGeometry,bezierPoint,nodeSize,groupBox,sceneBounds} from './model.js';
const NS='http://www.w3.org/2000/svg';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>1-Math.pow(1-clamp(v),3);
function element(tag,attrs={},text) { const e=document.createElementNS(NS,tag); for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v); if(text!==undefined)e.textContent=text; return e; }

export class Renderer {
  constructor(svg,onSelect,onZoom) {
    this.svg=svg;this.nodeLayer=svg.querySelector('#node-layer');this.edgeLayer=svg.querySelector('#edge-layer');
    this.groupLayer=element('g',{id:'group-layer'});svg.insertBefore(this.groupLayer,this.edgeLayer);
    this.labelLayer=element('g',{id:'label-layer'});svg.append(this.labelLayer);
    this.onSelect=onSelect;this.onZoom=onZoom;this.nodes=new Map();this.edges=new Map();this.groups=new Map();this.positions=new Map();this.targets=new Map();this.camera={x:0,y:0,scale:1};this.reduced=false;
    this.observer=new ResizeObserver(()=>{if(this.graph){const vertical=this.svg.clientWidth<450;if(vertical!==this.vertical)this.setGraph(this.graph,this.selected,{instant:true});this.fit();}});this.observer.observe(svg);
    let drag=null;
    svg.addEventListener('pointerdown',e=>{if(e.target.closest('.diagram-node:not(.junction)'))return;drag={x:e.clientX,y:e.clientY,cam:{...this.camera}};svg.setPointerCapture(e.pointerId);svg.classList.add('panning');});
    svg.addEventListener('pointermove',e=>{if(!drag)return;this.camera.x=drag.cam.x-(e.clientX-drag.x)/this.camera.scale;this.camera.y=drag.cam.y-(e.clientY-drag.y)/this.camera.scale;this.applyCamera();});
    const end=()=>{drag=null;svg.classList.remove('panning');};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
    svg.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();this.zoom(e.deltaY<0?1.1:1/1.1);}}, {passive:false});
  }
  setGraph(graph,selected,{instant=false}={}) {
    this.graph=graph;this.selected=selected;this.vertical=this.svg.clientWidth<450;
    this.starts=new Map(this.positions);this.targets=layout(graph,this.vertical);this.layoutStart=performance.now();
    for(const n of graph.nodes)if(!this.starts.has(n.id))this.starts.set(n.id,this.targets.get(n.id));
    if(instant||this.reduced)this.layoutStart-=800;
    for(const layer of [this.nodeLayer,this.edgeLayer,this.groupLayer,this.labelLayer])layer.replaceChildren();
    this.nodes.clear();this.edges.clear();this.groups.clear();
    for(const group of graph.groups||[]) {
      const g=element('g',{class:`diagram-group ${group.focal?'focal':''}`,'data-group':group.id,role:'group','aria-label':group.label});
      g.append(element('rect',{class:'group-box',rx:8}),element('text',{class:'group-eyebrow',x:24,y:22},group.eyebrow||'GROUP'),element('text',{class:'group-title',x:24,y:46},group.label));
      this.groupLayer.append(g);this.groups.set(group.id,g);
    }
    for(const e of graph.edges) {
      const g=element('g',{'aria-hidden':'true','data-edge':e.id});
      const base=element('path',{class:'edge-base',pathLength:100});
      const flow=element('path',{class:'edge-flow',pathLength:100});
      const particle=element('circle',{class:'flow-particle',r:3});
      let label=null;
      if(e.label){label=element('g',{class:'edge-label','data-edge-label':e.id});label.append(element('rect',{class:'edge-label-mask',rx:3}),element('text',{'text-anchor':'middle',y:4},e.label));this.labelLayer.append(label);}
      g.append(base,flow,particle);this.edgeLayer.append(g);this.edges.set(e.id,{g,base,flow,particle,label});
    }
    graph.nodes.forEach((n,i)=>{
      const junction=n.kind==='junction';
      const g=element('g',{class:`diagram-node ${junction?'junction':''} ${n.focal?'focal':''} ${n.id===selected?'selected':''}`,'data-node':n.id});
      if(junction){g.setAttribute('role','img');g.setAttribute('aria-label',n.label);g.append(element('circle',{class:'junction-dot',r:4}));}
      else {
        g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-pressed',String(n.id===selected));
        const {width,height}=nodeSize(n);
        g.append(element('rect',{class:'selection-ring',x:-5,y:-5,width:width+10,height:height+10,rx:10}),element('rect',{class:'node-box',width,height,rx:6}),element('text',{class:'node-index',x:12,y:16},String(graph.nodes.slice(0,i+1).filter(n=>n.kind!=='junction').length).padStart(2,'0')),element('text',{class:'node-name','text-anchor':'middle'}),element('text',{class:'node-subtitle','text-anchor':'middle'}));
        g.addEventListener('click',()=>this.onSelect(n.id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onSelect(n.id);}});
      }
      this.nodeLayer.append(g);this.nodes.set(n.id,g);this.updateLabel(n);
    });
    this.positions=new Map(this.targets);this.updateGroups(this.positions,Infinity);this.positionEdgeLabels(this.positions);
  }
  select(id) {this.selected=id;for(const [key,node] of this.nodes){node.classList.toggle('selected',key===id);if(!node.classList.contains('junction'))node.setAttribute('aria-pressed',String(key===id));}}
  updateLabel(node) {
    const g=this.nodes.get(node.id);if(!g||node.kind==='junction')return;
    const {width,height}=nodeSize(node),lines=node.subtitle.split('\n'),multiline=height>76;
    g.classList.toggle('multiline',multiline);
    const title=g.querySelector('.node-name'),detail=g.querySelector('.node-subtitle');
    const lineHeight=multiline?21:16,total=20+lines.length*lineHeight,start=Math.max(35,(height-total)/2+15);
    title.textContent=node.label;title.setAttribute('x',width/2);title.setAttribute('y',multiline?start:37);
    detail.replaceChildren();lines.forEach((line,i)=>detail.append(element('tspan',{x:width/2,y:multiline?start+27+i*lineHeight:56+i*lineHeight},line)));
    g.setAttribute('aria-label',`${node.label}. ${node.subtitle.replaceAll('\n',', ')}. Select to edit or grow branches.`);
    this.fitLabel(title,width-24);for(const line of detail.children)this.fitLabel(line,width-24);
  }
  fitLabel(text,width=132) {let shortened=text.textContent;while(text.getComputedTextLength()>width&&shortened.length>1){shortened=shortened.slice(0,-1);text.textContent=shortened+'…';}}
  updateGroups(positions,time) {
    for(const group of this.graph.groups||[]){const box=groupBox(group,this.graph,positions),g=this.groups.get(group.id);g.setAttribute('transform',`translate(${box.x},${box.y})`);g.querySelector('rect').setAttribute('width',box.width);g.querySelector('rect').setAttribute('height',box.height);const birth=Math.min(...group.members.map(id=>this.graph.nodes.find(n=>n.id===id).born))-.5;const visible=this.reduced?1:smooth((time-birth)/.4);g.setAttribute('opacity',visible);g.setAttribute('aria-hidden',String(visible<.5));}
  }
  positionEdgeLabels(positions) {
    for(const e of this.graph.edges){const label=this.edges.get(e.id).label;if(!label)continue;const midpoint=bezierPoint(connectionGeometry(this.graph,positions,e,this.vertical).points,.5),w=label.querySelector('text').getComputedTextLength()+16;label.setAttribute('transform',`translate(${midpoint.x+(this.vertical?w/2+10:0)},${midpoint.y+(this.vertical?0:-16)})`);const mask=label.querySelector('rect');mask.setAttribute('x',-w/2);mask.setAttribute('y',-10);mask.setAttribute('width',w);mask.setAttribute('height',20);}
  }
  fit(readable=true) {
    if(!this.targets.size)return;
    const box=sceneBounds(this.graph,this.targets,this.vertical),w=this.svg.clientWidth,h=this.svg.clientHeight;
    let scale=Math.min(w/box.width,h/box.height,1.15);
    if(this.vertical&&readable&&scale<.9){scale=.9;const node=this.graph.nodes.find(n=>n.id===this.selected)||this.graph.nodes[0],p=this.targets.get(node.id);this.camera={x:this.graph.layoutMode==='authored'?box.x+box.width/2-w/scale/2:p.x+nodeSize(node).width/2-w/scale/2,y:Math.max(box.y,p.y-90),scale};}
    else this.camera={x:box.x+box.width/2-w/scale/2,y:box.y+box.height/2-h/scale/2,scale};this.applyCamera();
  }
  zoom(factor) {const w=this.svg.clientWidth,h=this.svg.clientHeight,old=this.camera.scale,next=clamp(old*factor,.2,2.5);this.camera.x+=w/old/2-w/next/2;this.camera.y+=h/old/2-h/next/2;this.camera.scale=next;this.applyCamera();}
  applyCamera() {const {x,y,scale}=this.camera;this.svg.setAttribute('viewBox',`${x} ${y} ${this.svg.clientWidth/scale} ${this.svg.clientHeight/scale}`);this.onZoom(Math.round(scale*100));}
  render(time,flowTime,mode,flowEnabled,now=performance.now()) {
    if(!this.graph)return;
    const progress=this.reduced?1:smooth((now-this.layoutStart)/700),nodeMap=new Map(this.graph.nodes.map(n=>[n.id,n]));
    for(const n of this.graph.nodes){const a=this.starts.get(n.id),b=this.targets.get(n.id),p={x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress};this.positions.set(n.id,p);const visible=this.reduced?1:smooth((time-n.born)/.5),node=this.nodes.get(n.id);node.setAttribute('transform',`translate(${p.x},${p.y+(n.kind==='junction'?0:(1-visible)*10)})`);node.setAttribute('opacity',visible);node.style.pointerEvents=visible>.5&&n.kind!=='junction'?'auto':'none';if(n.kind!=='junction')node.setAttribute('tabindex',visible>.5?'0':'-1');node.setAttribute('aria-hidden',String(visible<=.5));}
    this.updateGroups(this.positions,time);this.positionEdgeLabels(this.positions);
    for(const e of this.graph.edges){
      const geo=connectionGeometry(this.graph,this.positions,e,this.vertical),dom=this.edges.get(e.id),birth=Math.max(nodeMap.get(e.to).born,nodeMap.get(e.from).born),reveal=this.reduced?1:clamp((time-birth+.4)/.55);
      dom.base.setAttribute('d',geo.d);dom.base.setAttribute('stroke-dasharray',`${reveal*100} 100`);dom.base.setAttribute('marker-end',reveal>=1&&e.arrow!==false?'url(#arrow)':'');dom.flow.setAttribute('d',geo.d);if(dom.label)dom.label.setAttribute('opacity',reveal);
      const active=flowEnabled&&!this.reduced&&reveal>=1;dom.flow.style.display=active&&mode!=='signal'?'':'none';dom.particle.style.display=active&&mode==='signal'?'':'none';
      // All connections leaving the same node share a phase.
      const sourcePhase=nodeMap.get(e.from).born,phase=(flowTime*.22-sourcePhase*.17)%1,t=(phase+1)%1;
      if(mode==='signal'){const p=bezierPoint(geo.points,t);dom.particle.setAttribute('cx',p.x);dom.particle.setAttribute('cy',p.y);dom.particle.setAttribute('opacity',Math.min(t*8,(1-t)*8,1));}
      else if(mode==='stream'){dom.flow.setAttribute('stroke-dasharray','3 12');dom.flow.setAttribute('stroke-dashoffset',-flowTime*25+sourcePhase*4);dom.flow.setAttribute('opacity','.8');}
      else {dom.flow.setAttribute('stroke-dasharray','24 100');dom.flow.setAttribute('stroke-dashoffset',24-t*124);dom.flow.setAttribute('opacity','.9');}
    }
  }
  exportSVG(title) {
    // Render the final frame synchronously, then restore the live frame on the next tick.
    this.render(Infinity,0,'signal',false,Infinity);
    const copy=this.svg.cloneNode(true);copy.setAttribute('xmlns',NS);copy.querySelector('title').textContent=title;
    copy.querySelector('desc').textContent=`${title}. ${(this.graph.groups||[]).map(g=>g.label).join('. ')}. ${this.graph.nodes.filter(n=>n.kind!=='junction').map(n=>`${n.label}: ${n.subtitle.replaceAll('\n',', ')}`).join('. ')}.`;
    copy.querySelectorAll('.edge-flow,.flow-particle,.selection-ring').forEach(n=>n.remove());
    copy.querySelectorAll('[tabindex],[role=button],[aria-hidden]').forEach(n=>{n.removeAttribute('tabindex');n.removeAttribute('aria-pressed');n.removeAttribute('aria-hidden');if(n.getAttribute('role')==='button')n.removeAttribute('role');});
    for(const n of this.graph.nodes)copy.querySelector(`[data-node="${n.id}"]`).setAttribute('aria-label',`${n.label}. ${n.subtitle.replaceAll('\n',' ')}`);
    // Inline resolved presentation so containers, labels, and fonts survive standalone export.
    const properties=['fill','stroke','stroke-width','stroke-opacity','fill-opacity','font-family','font-size','font-weight','font-style','letter-spacing','text-anchor'];
    const sourceElements=[...this.svg.querySelectorAll('rect,path,text,tspan,circle')].filter(n=>!n.closest('.edge-flow,.flow-particle,.selection-ring'));
    const targetElements=[...copy.querySelectorAll('rect,path,text,tspan,circle')];
    sourceElements.forEach((source,i)=>{const target=targetElements[i],style=getComputedStyle(source);for(const property of properties)target.style.setProperty(property,style.getPropertyValue(property));if(source.matches('text,tspan')){target.style.fontFamily=source.closest('.group-title')?'Georgia, serif':source.closest('.node-subtitle')&& !source.closest('.multiline')?'monospace':'system-ui, sans-serif';if(!source.children.length&&source.textContent){target.setAttribute('textLength',source.getComputedTextLength());target.setAttribute('lengthAdjust','spacingAndGlyphs');}}});
    copy.querySelectorAll('.edge-base').forEach(p=>p.removeAttribute('stroke-dasharray'));
    const box=sceneBounds(this.graph,this.targets,this.vertical);copy.setAttribute('viewBox',`${box.x} ${box.y} ${box.width} ${box.height}`);copy.setAttribute('width',box.width);copy.setAttribute('height',box.height);copy.setAttribute('aria-label',title);
    copy.insertBefore(element('rect',{...box,fill:getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim()}),copy.querySelector('#group-layer'));
    return new XMLSerializer().serializeToString(copy);
  }
}
