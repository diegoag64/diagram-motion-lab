import {layout,edgeGeometry,bezierPoint,NODE_W,NODE_H} from './model.js';
const NS='http://www.w3.org/2000/svg';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>1-Math.pow(1-clamp(v),3);
function element(tag,attrs={},text) { const e=document.createElementNS(NS,tag); for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v); if(text!==undefined)e.textContent=text; return e; }

export class Renderer {
  constructor(svg,onSelect,onZoom) {
    this.svg=svg;this.nodeLayer=svg.querySelector('#node-layer');this.edgeLayer=svg.querySelector('#edge-layer');
    this.onSelect=onSelect;this.onZoom=onZoom;this.nodes=new Map();this.edges=new Map();this.positions=new Map();this.targets=new Map();this.camera={x:0,y:0,scale:1};this.reduced=false;
    this.observer=new ResizeObserver(()=>{ if(this.graph){const vertical=this.svg.clientWidth<450;if(vertical!==this.vertical)this.setGraph(this.graph,this.selected,{instant:true});this.fit();} });this.observer.observe(svg);
    let drag=null;
    svg.addEventListener('pointerdown',e=> { if(e.target.closest('.diagram-node'))return; drag={x:e.clientX,y:e.clientY,cam:{...this.camera}};svg.setPointerCapture(e.pointerId);svg.classList.add('panning'); });
    svg.addEventListener('pointermove',e=>{if(!drag)return; this.camera.x=drag.cam.x-(e.clientX-drag.x)/this.camera.scale;this.camera.y=drag.cam.y-(e.clientY-drag.y)/this.camera.scale;this.applyCamera();});
    const end=()=>{drag=null;svg.classList.remove('panning');};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
    svg.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();this.zoom(e.deltaY<0?1.1:1/1.1);}}, {passive:false});
  }
  setGraph(graph,selected,{instant=false}={}) {
    this.graph=graph;this.selected=selected;
    this.starts=new Map(this.positions);this.targets=layout(graph);this.layoutStart=performance.now();
    this.vertical=this.svg.clientWidth<450;
    if(this.vertical)for(const [id,p] of this.targets)this.targets.set(id,{x:p.y/120*184,y:p.x/248*156});
    for(const n of graph.nodes) if(!this.starts.has(n.id)) this.starts.set(n.id,this.targets.get(n.id));
    if(instant||this.reduced)this.layoutStart-=800;
    this.nodeLayer.replaceChildren();this.edgeLayer.replaceChildren();this.nodes.clear();this.edges.clear();
    for(const e of graph.edges) {
      const g=element('g',{'aria-hidden':'true'});
      const base=element('path',{class:'edge-base',pathLength:100,'marker-end':'url(#arrow)'});
      const flow=element('path',{class:'edge-flow',pathLength:100});
      const particle=element('circle',{class:'flow-particle',r:3});
      g.append(base,flow,particle);this.edgeLayer.append(g);this.edges.set(e.id,{g,base,flow,particle});
    }
    graph.nodes.forEach((n,i)=>{
      const g=element('g',{class:`diagram-node ${n.focal?'focal':''} ${n.id===selected?'selected':''}`,role:'button',tabindex:'0','aria-label':`${n.label}. Select to edit or grow branches.`,'aria-pressed':String(n.id===selected),'data-node':n.id});
      g.append(element('rect',{class:'selection-ring',x:-5,y:-5,width:NODE_W+10,height:NODE_H+10,rx:10}),element('rect',{class:'node-box',width:NODE_W,height:NODE_H,rx:6}),element('text',{class:'node-index',x:12,y:16},String(i+1).padStart(2,'0')),element('text',{class:'node-name',x:NODE_W/2,y:37,'text-anchor':'middle'},n.label),element('text',{class:'node-subtitle',x:NODE_W/2,y:56,'text-anchor':'middle'},n.subtitle));
      g.addEventListener('click',()=>this.onSelect(n.id));
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onSelect(n.id);}});
      this.nodeLayer.append(g);this.nodes.set(n.id,g);this.fitLabel(g.querySelector('.node-name'));this.fitLabel(g.querySelector('.node-subtitle'));
    });
    this.positions=new Map(this.targets);
  }
  select(id) {
    this.selected=id;
    for(const [key,node] of this.nodes) { node.classList.toggle('selected',key===id);node.setAttribute('aria-pressed',String(key===id)); }
  }
  updateLabel(node) {
    const g=this.nodes.get(node.id);if(!g)return;
    g.querySelector('.node-name').textContent=node.label;
    g.querySelector('.node-subtitle').textContent=node.subtitle;
    g.setAttribute('aria-label',`${node.label}. Select to edit or grow branches.`);
    this.fitLabel(g.querySelector('.node-name'));this.fitLabel(g.querySelector('.node-subtitle'));
  }
  fitLabel(text) {
    const full=text.textContent;let shortened=full;
    while(text.getComputedTextLength()>132 && shortened.length>1){shortened=shortened.slice(0,-1);text.textContent=shortened+'…';}
  }
  fit(readable=true) {
    if(!this.targets.size)return;
    const ps=[...this.targets.values()];
    const feedback=this.graph.edges.some(e=>e.feedback);
    const minX=Math.min(...ps.map(p=>p.x))-36,maxX=Math.max(...ps.map(p=>p.x))+NODE_W+(feedback&&this.vertical?120:36);
    const minY=Math.min(...ps.map(p=>p.y))-50,maxY=Math.max(...ps.map(p=>p.y))+NODE_H+(feedback&&!this.vertical?120:50);
    const w=this.svg.clientWidth,h=this.svg.clientHeight;
    let scale=Math.min(w/(maxX-minX),h/(maxY-minY),1.15);
    if(this.vertical&&readable&&scale<.9){scale=.9;const p=this.targets.get(this.selected)||ps[0];this.camera={x:p.x+NODE_W/2-w/scale/2,y:Math.max(minY,p.y-90),scale};}
    else this.camera={x:(minX+maxX)/2-w/scale/2,y:(minY+maxY)/2-h/scale/2,scale};this.applyCamera();
  }
  zoom(factor) {
    const w=this.svg.clientWidth,h=this.svg.clientHeight,old=this.camera.scale,next=clamp(old*factor,.2,2.5);
    this.camera.x+=w/old/2-w/next/2;this.camera.y+=h/old/2-h/next/2;this.camera.scale=next;this.applyCamera();
  }
  applyCamera() {
    const {x,y,scale}=this.camera;this.svg.setAttribute('viewBox',`${x} ${y} ${this.svg.clientWidth/scale} ${this.svg.clientHeight/scale}`);this.onZoom(Math.round(scale*100));
  }
  render(time,flowTime,mode,flowEnabled,now=performance.now()) {
    if(!this.graph)return;
    const progress=this.reduced?1:smooth((now-this.layoutStart)/700);
    const nodeMap=new Map(this.graph.nodes.map(n=>[n.id,n]));
    for(const n of this.graph.nodes) {
      const a=this.starts.get(n.id),b=this.targets.get(n.id),p={x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress};this.positions.set(n.id,p);
      const visible=this.reduced?1:smooth((time-n.born)/.5);
      const node=this.nodes.get(n.id);node.setAttribute('transform',`translate(${p.x},${p.y+(1-visible)*10})`);node.setAttribute('opacity',visible);
      node.style.pointerEvents=visible>.5?'auto':'none';node.setAttribute('tabindex',visible>.5?'0':'-1');node.setAttribute('aria-hidden',String(visible<=.5));
    }
    for(const [i,e] of this.graph.edges.entries()) {
      const a=this.positions.get(e.from),b=this.positions.get(e.to);if(!a||!b)continue;
      const geo=edgeGeometry(a,b,e.feedback,this.vertical),dom=this.edges.get(e.id);
      const birth=Math.max(nodeMap.get(e.to).born,nodeMap.get(e.from).born);
      const reveal=this.reduced?1:clamp((time-birth+.4)/.55);
      dom.base.setAttribute('d',geo.d);dom.base.setAttribute('stroke-dasharray',`${reveal*100} 100`);
      dom.base.setAttribute('marker-end',reveal>=1?'url(#arrow)':'');
      dom.flow.setAttribute('d',geo.d);
      const active=flowEnabled&&!this.reduced&&reveal>=1;
      dom.flow.style.display=active&&mode!=='signal'?'':'none';dom.particle.style.display=active&&mode==='signal'?'':'none';
      const phase=(flowTime*.22-i*.17)%1;const t=(phase+1)%1;
      if(mode==='signal') { const p=bezierPoint(geo.points,t);dom.particle.setAttribute('cx',p.x);dom.particle.setAttribute('cy',p.y);dom.particle.setAttribute('opacity',Math.min(t*8,(1-t)*8,1)); }
      else if(mode==='stream') { dom.flow.setAttribute('stroke-dasharray','3 12');dom.flow.setAttribute('stroke-dashoffset',-flowTime*25+i*4);dom.flow.setAttribute('opacity','.8'); }
      else { dom.flow.setAttribute('stroke-dasharray','24 100');dom.flow.setAttribute('stroke-dashoffset',24-t*124);dom.flow.setAttribute('opacity','.9'); }
    }
  }
  exportSVG(title) {
    // Export a complete, still frame, independent of current scrub/zoom state.
    const copy=this.svg.cloneNode(true);copy.setAttribute('xmlns',NS);
    copy.querySelector('title').textContent=title;
    copy.querySelector('desc').textContent=`${title}. ${this.graph.nodes.map(n=>n.label).join(', ')}.`;
    copy.querySelectorAll('.edge-flow,.flow-particle,.selection-ring').forEach(n=>n.remove());
    copy.querySelectorAll('[tabindex],[role=button]').forEach(n=>{n.removeAttribute('tabindex');n.removeAttribute('role');n.removeAttribute('aria-pressed');n.removeAttribute('aria-hidden');});
    const theme=getComputedStyle(document.documentElement),color=k=>theme.getPropertyValue(k).trim();
    copy.querySelector('defs').append(element('style',{},`.node-box{fill:${color('--surface')};stroke:${color('--muted')};stroke-width:1}.focal .node-box{fill:${color('--accent-tint')};stroke:${color('--accent')}}.node-name{fill:${color('--ink')};font:500 13px system-ui,sans-serif}.node-subtitle{fill:${color('--muted')};font:9px monospace}.node-index{fill:${color('--muted')};font:8px monospace}.edge-base{stroke:${color('--muted')};stroke-width:1;fill:none}`));
    copy.querySelector('#arrow path').setAttribute('stroke',color('--muted'));
    for(const n of this.graph.nodes) {const g=copy.querySelector(`[data-node="${n.id}"]`),p=this.targets.get(n.id);g.setAttribute('transform',`translate(${p.x},${p.y})`);g.setAttribute('opacity','1');g.removeAttribute('style');}
    const paths=copy.querySelectorAll('.edge-base');this.graph.edges.forEach((e,i)=>{paths[i].setAttribute('d',edgeGeometry(this.targets.get(e.from),this.targets.get(e.to),e.feedback,this.vertical).d);paths[i].removeAttribute('stroke-dasharray');paths[i].setAttribute('marker-end','url(#arrow)');});
    const feedback=this.graph.edges.some(e=>e.feedback);
    const ps=[...this.targets.values()],x=Math.min(...ps.map(p=>p.x))-32,y=Math.min(...ps.map(p=>p.y))-32,w=Math.max(...ps.map(p=>p.x))+NODE_W-x+(feedback&&this.vertical?120:32),h=Math.max(...ps.map(p=>p.y))+NODE_H-y+(feedback&&!this.vertical?120:32);
    copy.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);copy.setAttribute('width',w);copy.setAttribute('height',h);copy.setAttribute('aria-label',title);
    copy.insertBefore(element('rect',{x,y,width:w,height:h,fill:color('--canvas')}),copy.querySelector('#edge-layer'));
    return new XMLSerializer().serializeToString(copy);
  }
}
