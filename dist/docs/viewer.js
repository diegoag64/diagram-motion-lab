// A viewport around either SVG renderer: no diagram-specific pan/zoom dependency.
export class DiagramViewer {
  constructor({viewport,content,readout,zoomIn,zoomOut,reset}) {
    Object.assign(this,{viewport,content,readout,zoomIn,zoomOut});
    this.active=false;this.pointers=new Map();this.camera={x:0,y:0,scale:1};
    zoomIn.addEventListener('click',()=>this.zoom(1.2));
    zoomOut.addEventListener('click',()=>this.zoom(1/1.2));
    reset.addEventListener('click',()=>this.fit());
    this.observer=new ResizeObserver(()=>{if(this.active)this.fit();});this.observer.observe(viewport);
    viewport.addEventListener('wheel',event=>{
      if(!this.active)return;
      event.preventDefault();
      const units=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
      const delta=Math.max(-100,Math.min(100,event.deltaY*units));
      this.zoom(Math.exp(-delta*(event.ctrlKey?.01:.003)),this.local(event));
    },{passive:false});
    viewport.addEventListener('pointerdown',event=>{
      if(!this.active||event.button!==0)return;
      event.preventDefault();viewport.focus({preventScroll:true});
      viewport.setPointerCapture(event.pointerId);this.pointers.set(event.pointerId,this.local(event));
      viewport.classList.add('panning');
    });
    viewport.addEventListener('pointermove',event=>{
      if(!this.active||!this.pointers.has(event.pointerId))return;
      const before=[...this.pointers.values()];
      this.pointers.set(event.pointerId,this.local(event));
      const after=[...this.pointers.values()];
      if(before.length===1){this.camera.x+=after[0].x-before[0].x;this.camera.y+=after[0].y-before[0].y;}
      else {
        const center=points=>({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2});
        const distance=points=>Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
        const a=center(before),b=center(after),oldScale=this.camera.scale;
        const next=this.limit(oldScale*distance(after)/Math.max(1,distance(before)));
        this.camera={x:b.x-(a.x-this.camera.x)*next/oldScale,y:b.y-(a.y-this.camera.y)*next/oldScale,scale:next};
      }
      this.apply();
    });
    const release=event=>{this.pointers.delete(event.pointerId);if(!this.pointers.size)viewport.classList.remove('panning');};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,release);
    viewport.addEventListener('keydown',event=>{
      if(!this.active||event.target!==viewport)return;
      const step=event.shiftKey?100:40;
      if(event.key==='+'||event.key==='=')this.zoom(1.2);
      else if(event.key==='-')this.zoom(1/1.2);
      else if(event.key==='0'||event.key==='Home')this.fit();
      else if(event.key==='ArrowLeft')this.camera.x+=step;
      else if(event.key==='ArrowRight')this.camera.x-=step;
      else if(event.key==='ArrowUp')this.camera.y+=step;
      else if(event.key==='ArrowDown')this.camera.y-=step;
      else return;
      event.preventDefault();this.apply();
    });
  }
  local(event){const box=this.viewport.getBoundingClientRect();return {x:event.clientX-box.left,y:event.clientY-box.top};}
  limit(scale){return Math.max(.1,Math.min(4,scale));}
  open(){this.active=true;this.viewport.tabIndex=0;this.viewport.setAttribute('role','application');this.viewport.setAttribute('aria-label','Diagram viewer. Drag to pan, scroll or pinch to zoom. Arrow keys pan, plus and minus zoom, zero resets.');this.fit();this.viewport.focus({preventScroll:true});}
  close(){this.active=false;this.pointers.clear();this.viewport.classList.remove('panning');this.viewport.removeAttribute('tabindex');this.viewport.removeAttribute('role');this.viewport.removeAttribute('aria-label');this.content.style.removeProperty('transform');}
  fit(){
    if(!this.active)return;
    const {width,height}=this.viewport.getBoundingClientRect();
    const scale=this.limit(Math.min((width-64)/1245,(height-180)/270,1.15));
    this.camera={x:(width-1245*scale)/2,y:(height-270*scale)/2,scale};this.apply();
  }
  zoom(factor,point){
    if(!this.active)return;
    const {width,height}=this.viewport.getBoundingClientRect(),anchor=point||{x:width/2,y:height/2};
    const old=this.camera.scale,next=this.limit(old*factor);
    this.camera={x:anchor.x-(anchor.x-this.camera.x)*next/old,y:anchor.y-(anchor.y-this.camera.y)*next/old,scale:next};this.apply();
  }
  apply(){
    const {x,y,scale}=this.camera;this.content.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
    this.readout.textContent=`${Math.round(scale*100)}%`;
    this.zoomIn.disabled=scale>=4;this.zoomOut.disabled=scale<=.1;
  }
}
