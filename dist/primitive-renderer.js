import {summarize,boxPixels} from './jev-primitives.js';
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},text)=>{const node=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;return node;};
const text=(parent,value,x,y,cls='primitive-text',extra={})=>parent.append(el('text',{x,y,class:cls,...extra},value));
function lines(parent,value,x,y,width,max=5){
  const measure=el('text',{class:'primitive-text'});parent.append(measure);
  const words=value.split(/\s+/),rows=[];let row='';
  for(const word of words){
    const candidate=(row+' '+word).trim();measure.textContent=candidate;
    if(row&&measure.getComputedTextLength()>width){rows.push(row);row=word;}else row=candidate;
  }
  if(row)rows.push(row);measure.remove();
  rows.slice(0,max).forEach((line,i)=>text(parent,line+(i===max-1&&rows.length>max?'…':''),x,y+i*21));
}
function scene(parent,x,y,width,height,image){
  const group=el('svg',{x,y,width,height,viewBox:'0 0 400 240',preserveAspectRatio:'none'});parent.append(group);
  if(image){group.append(el('image',{href:image,x:0,y:0,width:400,height:240,preserveAspectRatio:'none'}));return;}
  // Self-contained vector illustration; exported diagrams need no external image URL.
  group.append(el('rect',{width:400,height:240,rx:8,fill:'var(--primitive-scene)'}),el('rect',{x:0,y:190,width:400,height:50,fill:'var(--primitive-table)'}),el('path',{d:'M0 190H400',class:'primitive-line'}));
  group.append(el('rect',{x:30,y:56,width:60,height:134,rx:4,fill:'var(--primitive-object)'}),el('path',{d:'M34 62H85M34 74H85',class:'primitive-line'}));
  group.append(el('path',{d:'M255 94H280C316 94 316 153 280 153H255',fill:'none',stroke:'var(--ink)','stroke-width':10}),el('path',{d:'M145 60H263V157Q263 190 228 190H180Q145 190 145 157Z',fill:'var(--primitive-mug)',stroke:'var(--ink)','stroke-width':3}));
  group.append(el('ellipse',{cx:204,cy:60,rx:59,ry:12,fill:'var(--primitive-table)',stroke:'var(--ink)','stroke-width':3}),el('path',{d:'M175 31Q160 17 178 5M211 31Q196 17 214 5',class:'primitive-line'}));
}
export function renderPrimitive(group,node,sourceImage){
  group.querySelector('.primitive-content')?.remove();
  const v=node.visual;if(!v)return;
  group.classList.add('typed-node');group.classList.toggle('route-active',node.routeActive===true);group.classList.toggle('route-idle',node.routeActive===false);
  const g=el('g',{class:'primitive-content','pointer-events':'none'});group.append(g);
  const w=node.width,pad=20,inner=w-pad*2;
  text(g,({state:'STATE',question:'INSTRUCTIONS',image:'IMAGE STATE',action:'YOUR CODE'})[v.type]||`JEV · ${v.type.toUpperCase()}`,pad,25,'primitive-eyebrow');
  text(g,node.label,pad,51,'primitive-title');
  let accessible=node.label;
  if(['state','question','action'].includes(v.type)){
    lines(g,v.text,pad,79,inner,v.type==='action'?2:5);accessible+=`. ${v.text}`;
  } else if(v.type==='choice'||v.type==='score'){
    const a=summarize(v);
    v.options.forEach((option,i)=>{
      const y=88+i*44,p=a.probabilities[i];
      text(g,(v.type==='score'?`${i} · `:'')+option.label,pad,y,'primitive-option');
      text(g,`${Math.round(p*100)}%`,w-pad,y,'primitive-value',{'text-anchor':'end'});
      g.append(el('rect',{x:pad,y:y+9,width:inner,height:7,rx:3.5,class:'probability-track'}),el('rect',{x:pad,y:y+9,width:inner*p,height:7,rx:3.5,class:`probability-fill ${i===a.winner?'winning':''}`,'data-probability':p}));
    });
    const bottom=100+v.options.length*44;
    if(v.type==='choice')text(g,`Selected: ${v.options[a.winner].label}`,pad,bottom,'primitive-result');
    else {
      text(g,`Score ${a.score.toFixed(2)} / ${v.options.length-1}`,pad,bottom,'primitive-result');
      g.append(el('path',{d:`M${pad} ${bottom+22}H${w-pad}`,class:'primitive-line'}));
      for(let i=0;i<v.options.length;i++){const x=pad+inner*i/(v.options.length-1);g.append(el('path',{d:`M${x} ${bottom+17}v10`,class:'primitive-line'}));text(g,String(i),x,bottom+43,'primitive-small',{'text-anchor':'middle'});}
      g.append(el('circle',{cx:pad+inner*a.score/(v.options.length-1),cy:bottom+22,r:5,class:'probability-marker'}));
    }
    text(g,`Confidence ${Math.round(a.confidence*100)}%`,pad,node.height-17,'primitive-small');
    accessible+=`. ${v.options.map((o,i)=>`${o.label} ${Math.round(a.probabilities[i]*100)} percent`).join(', ')}. ${v.type==='choice'?`Selected ${v.options[a.winner].label}`:`Score ${a.score.toFixed(2)}`}. Confidence ${Math.round(a.confidence*100)} percent.`;
  } else if(v.type==='noul'){
    const a=summarize(v);text(g,`${Math.round(v.value*100)}%`,pad,104,'primitive-big');text(g,'probability of yes',pad,127,'primitive-small');
    const y=151;g.append(el('rect',{x:pad,y,width:inner,height:9,rx:4,class:'probability-track'}),el('rect',{x:pad,y,width:inner*v.value,height:9,rx:4,class:'probability-fill winning'}));
    for(const t of [v.low,v.high])g.append(el('path',{d:`M${pad+inner*t} ${y-5}v20`,class:'threshold-mark'}));
    text(g,'No',pad,183,'primitive-small');text(g,'Yes',w-pad,183,'primitive-small',{'text-anchor':'end'});text(g,`Code decision: ${a.decision}`,pad,211,'primitive-result');
    accessible+=`. Probability of yes ${Math.round(v.value*100)} percent. Code decision ${a.decision}.`;
  } else if(v.type==='image'||v.type==='box'){
    const y=72,h=v.type==='box'?168:128;scene(g,pad,y,inner,h,sourceImage||v.image);
    if(v.type==='box'){
      const box=boxPixels(v.box,inner,h);g.append(el('rect',{x:pad+box.x,y:y+box.y,width:box.width,height:box.height,class:'bounding-box'}));
      text(g,`left ${v.box.left.toFixed(2)}   top ${v.box.top.toFixed(2)}`,pad,267,'primitive-coordinates');
      text(g,`right ${v.box.right.toFixed(2)}  bottom ${v.box.bottom.toFixed(2)}`,pad,289,'primitive-coordinates');
      text(g,`Confidence ${Math.round(v.confidence*100)}%`,pad,316,'primitive-small');text(g,'Edges are fractions of image size',pad,335,'primitive-small');
      accessible+=`. Box left ${v.box.left}, top ${v.box.top}, right ${v.box.right}, bottom ${v.box.bottom}. Confidence ${v.confidence}.`;
    }else accessible+=v.image?'. Custom local image.':'. Example image with a mug on a desk.';
  }
  for(const line of g.querySelectorAll('text')){let value=line.textContent;const available=line.classList.contains('primitive-option')?inner-65:inner;while(line.getComputedTextLength()>available&&value.length>1){value=value.slice(0,-1);line.textContent=value+'…';}}
  group.setAttribute('aria-label',accessible+' Select to edit.');
}
