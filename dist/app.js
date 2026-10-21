import {CARD_THEMES} from './card-themes.js';
import {PRESETS,createGraph,duration,clone,grow,removeBranch,MAX_NODES} from './model.js';
import {Renderer} from './renderer.js';
const $=id=>document.getElementById(id);
const STORAGE='diagram-motion-lab-v1';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let graph=createGraph('branches'),selected='n0',time=0,flowTime=0,playing=!reduced.matches,speed=1,flowSpeed=1,mode='signal',flowEnabled=true,history=[],toastTimer;
let saved={};
try { saved=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}; } catch {}
let cardTheme=CARD_THEMES.some(t=>t.id===saved.cardTheme)?saved.cardTheme:'baseline';
function validGraph(g) {
  if(!g || !PRESETS.some(p=>p.id===g.preset)||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||!Number.isInteger(g.nextId))return false;
  if(!g.nodes.length||g.nodes.length>MAX_NODES||g.edges.length>100)return false;
  const ids=new Set(g.nodes.map(n=>n.id));
  if(ids.size!==g.nodes.length||!g.nodes.some(n=>n.parent===null))return false;
  for(const n of g.nodes) {
    if(!/^n\d+$/.test(n.id)||Number(n.id.slice(1))>=g.nextId||typeof n.label!=='string'||n.label.length>40||typeof n.subtitle!=='string'||n.subtitle.length>120||!Number.isFinite(n.born)||n.born<0||n.born>1000)return false;
    if(n.width!==undefined&&(!Number.isFinite(n.width)||n.width<100||n.width>400))return false;
    if(n.height!==undefined&&(!Number.isFinite(n.height)||n.height<50||n.height>300))return false;
    if(g.layoutMode==='authored'&&[n.position,n.compactPosition].some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
    const seen=new Set([n.id]);let p=n.parent;
    while(p!==null) {if(!ids.has(p)||seen.has(p))return false;seen.add(p);p=g.nodes.find(n=>n.id===p).parent;}
  }
  if(g.groups!==undefined&&(!Array.isArray(g.groups)||g.groups.some(group=>typeof group.label!=='string'||!Array.isArray(group.members)||!group.members.length||group.members.some(id=>!ids.has(id)))))return false;
  return new Set(g.edges.map(e=>e.id)).size===g.edges.length && g.edges.every(e=>ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to&&(!e.fromGroup||g.groups?.some(g=>g.id===e.fromGroup))&&(!e.toGroup||g.groups?.some(g=>g.id===e.toGroup)));
}
if(validGraph(saved.graph)) {graph=saved.graph;selected=graph.nodes.some(n=>n.id===saved.selected)?saved.selected:graph.nodes[0].id;time=duration(graph);}
const requestedPreset=new URLSearchParams(location.search).get('preset');
if(PRESETS.some(p=>p.id===requestedPreset)&&graph.preset!==requestedPreset){graph=createGraph(requestedPreset);selected='n0';time=0;}
if(['signal','stream','draw'].includes(saved.mode))mode=saved.mode;
if(typeof saved.flowEnabled==='boolean')flowEnabled=saved.flowEnabled;
if(Number.isFinite(saved.flowSpeed)&&saved.flowSpeed>=.3&&saved.flowSpeed<=2.5)flowSpeed=saved.flowSpeed;
document.documentElement.dataset.theme=saved.theme==='dark'?'dark':'light';
if(saved.dots===false){$('dots').checked=false;$('canvas').classList.add('no-dots');}
$('flow-speed').value=flowSpeed;$('flow-label').textContent=`${flowSpeed}×`;$('flow-enabled').checked=flowEnabled;
const renderer=new Renderer($('diagram'),select,percent=>$('zoom-label').textContent=`${percent}%`);renderer.reduced=reduced.matches;
function persist() {
  try {localStorage.setItem(STORAGE,JSON.stringify({graph,selected,mode,flowEnabled,flowSpeed,cardTheme,theme:document.documentElement.dataset.theme,dots:$('dots').checked}));}catch{}
}
function syncCardTheme() {
  $('diagram').dataset.cardTheme=cardTheme;
  document.querySelectorAll('[data-card-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cardStyle===cardTheme)));
  $('card-theme-description').textContent=CARD_THEMES.find(t=>t.id===cardTheme).description;
  for(const n of graph.nodes)renderer.updateLabel(n);
}
for(const theme of CARD_THEMES) {
  const button=document.createElement('button');button.type='button';button.dataset.cardStyle=theme.id;button.setAttribute('aria-pressed','false');
  const sample=document.createElement('span');sample.className='card-sample';sample.setAttribute('aria-hidden','true');sample.textContent='Aa';
  const name=document.createElement('span');name.textContent=theme.name;button.append(sample,name);
  button.addEventListener('click',()=>{cardTheme=theme.id;syncCardTheme();persist();});$('card-themes').append(button);
}
$('diagram').dataset.cardTheme=cardTheme;
function toast(message) {clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function snapshot() {history.push({graph:clone(graph),selected,time});if(history.length>30)history.shift();$('undo').disabled=false;}

const previews={
 jev:'<path d="M22 7C38 7 33 19 48 19M22 31C38 31 33 19 48 19H67M104 19H134"/><rect x="0" y="1" width="22" height="12" rx="2"/><rect x="0" y="25" width="22" height="12" rx="2"/><rect x="67" y="2" width="37" height="34" rx="3"/><rect x="73" y="14" width="25" height="15" rx="2"/><rect x="125" y="12" width="23" height="14" rx="2"/>',
 branches:'<path d="M10 18H53M53 18C70 18 67 5 85 5H142M53 18C70 18 67 32 85 32H142"/><rect x="2" y="12" width="22" height="12" rx="2"/><rect x="85" y="0" width="22" height="10" rx="2"/><rect x="85" y="27" width="22" height="10" rx="2"/>',
 pipeline:'<path d="M15 18H140"/><rect x="0" y="11" width="25" height="14" rx="2"/><rect x="57" y="11" width="25" height="14" rx="2"/><rect x="115" y="11" width="25" height="14" rx="2"/>',
 fanout:'<path d="M25 18C45 18 43 4 62 4H82C105 4 103 18 123 18M25 18H123M25 18C45 18 43 32 62 32H82C105 32 103 18 123 18"/><rect x="0" y="11" width="25" height="14" rx="2"/><rect x="123" y="11" width="25" height="14" rx="2"/>',
 feedback:'<path d="M25 10H125M125 20C125 39 12 39 12 20"/><rect x="0" y="3" width="25" height="17" rx="2"/><rect x="115" y="3" width="25" height="17" rx="2"/>',
 architecture:'<path d="M25 18H70M70 18C90 18 85 5 105 5M70 18C90 18 85 32 105 32"/><rect x="0" y="10" width="25" height="16" rx="2"/><rect x="58" y="10" width="25" height="16" rx="2"/><rect x="105" y="0" width="30" height="10" rx="2"/><rect x="105" y="27" width="30" height="10" rx="2"/>',
 blank:'<rect x="53" y="7" width="34" height="23" rx="3"/><path d="M64 18H76M70 12V24"/>'
};
for(const p of PRESETS) {
  const button=document.createElement('button');button.className='preset';button.dataset.preset=p.id;
  // Only bundled, authored preset names and SVG thumbnails enter this markup.
  button.innerHTML=`<span class="preset-head"><span class="preset-number">${p.tag}</span>${p.name}</span><svg class="preset-preview" viewBox="0 0 150 38" aria-hidden="true"><g stroke="currentColor" stroke-width="1" fill="var(--paper)">${previews[p.id]}</g></svg>`;
  button.addEventListener('click',()=>{if(graph.preset===p.id)return;snapshot();graph=createGraph(p.id);selected='n0';time=reduced.matches?duration(graph):0;flowTime=0;playing=!reduced.matches;syncGraph(true);toast(`${p.name} loaded`);});$('presets').append(button);
}
function select(id) {selected=id;renderer.select(id);syncInspector();persist();}
function syncInspector() {
  const node=graph.nodes.find(n=>n.id===selected)||graph.nodes[0];selected=node.id;
  $('selected-title').textContent=node.label;$('selected-id').textContent=node.id.toUpperCase();$('node-label').value=node.label;$('node-subtitle').value=node.subtitle;
  $('remove').disabled=node.parent===null||node.kind==='junction';$('grow').disabled=node.kind==='junction'||graph.nodes.length+Number($('branch-count').value)>MAX_NODES;
}
function syncPlayback() {
  $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause animation':'Play animation');
  $('timeline').max=duration(graph);$('timeline').value=Math.min(time,duration(graph));
  $('time-label').textContent=`${Math.min(time,duration(graph)).toFixed(1)} / ${duration(graph).toFixed(1)}s`;
  $('canvas-state').textContent=reduced.matches?'REDUCED MOTION':playing?'LIVE CANVAS':'PAUSED';
  $('play').disabled=reduced.matches;$('replay').disabled=reduced.matches;$('timeline').disabled=reduced.matches;
}
function syncGraph(instant=false) {
  const p=PRESETS.find(p=>p.id===graph.preset);
  document.querySelector('.card-studio').dataset.preset=graph.preset;
  document.querySelector('.workspace').classList.toggle('wide-diagram',!!p.wide);
  $('collection-count').textContent=String(PRESETS.length).padStart(2,'0');
  $('primitive-note').hidden=!p.wide;
  $('diagram-title').textContent=p.name;$('diagram-caption').textContent=p.caption;$('description').textContent=p.description;$('preset-number').textContent=p.tag;
  $('diagram').querySelector('title').textContent=p.name;$('diagram').setAttribute('aria-label',`${p.name}. Select a node to edit or grow branches.`);
  $('node-count').textContent=`${graph.nodes.filter(n=>n.kind!=='junction').length} NODES · ${graph.edges.length} CONNECTIONS`;
  document.querySelectorAll('.preset').forEach(b=>{b.classList.toggle('active',b.dataset.preset===p.id);b.setAttribute('aria-pressed',String(b.dataset.preset===p.id));});
  if(reduced.matches)time=duration(graph);
  renderer.setGraph(graph,selected,{instant});renderer.fit();renderer.render(time,flowTime,mode,flowEnabled);
  syncInspector();syncPlayback();persist();
}
function syncModes() {document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));}
$('grow').addEventListener('click',()=>{
  try {const next=grow(graph,selected,Number($('branch-count').value),time);snapshot();graph=next;playing=!reduced.matches;syncGraph();toast(`${$('branch-count').value} new ${$('branch-count').value==='1'?'branch':'branches'} growing from ${graph.nodes.find(n=>n.id===selected).label}`);}catch(error){toast(error.message);}
});
$('branch-count').addEventListener('change',syncInspector);
$('remove').addEventListener('click',()=>{let parent=graph.nodes.find(n=>n.id===selected)?.parent;while(graph.nodes.find(n=>n.id===parent)?.kind==='junction')parent=graph.nodes.find(n=>n.id===parent).parent;try{const next=removeBranch(graph,selected);snapshot();graph=next;selected=parent;time=Math.min(time,duration(graph));syncGraph();toast('Branch removed. Undo brings it back.');}catch(error){toast(error.message);}});
$('undo').addEventListener('click',()=>{const previous=history.pop();if(!previous)return;({graph,selected,time}=previous);playing=false;syncGraph();$('undo').disabled=!history.length;toast('Last edit undone');});
for(const [id,key] of [['node-label','label'],['node-subtitle','subtitle']]) {
  let editStarted=false;
  $(id).addEventListener('focus',()=>editStarted=false);
  $(id).addEventListener('input',()=>{
    if(!editStarted){snapshot();editStarted=true;}
    const n=graph.nodes.find(n=>n.id===selected);n[key]=$(id).value|| (key==='label'?'Untitled':'');
    if(key==='subtitle'){
      n.subtitle=n.subtitle.split('\n').slice(0,4).join('\n');if($(id).value!==n.subtitle)$(id).value=n.subtitle;
      const lines=n.subtitle.split('\n').length;if(lines>1){n.height=Math.max(n.height||76,56+lines*21);n.width=Math.max(n.width||156,184);}
      renderer.setGraph(graph,selected,{instant:true});
    }else renderer.updateLabel(n);
    $('selected-title').textContent=n.label;persist();
  });
  $(id).addEventListener('blur',()=>{const n=graph.nodes.find(n=>n.id===selected);$(id).value=n[key];});
}
$('reset').addEventListener('click',()=>{snapshot();graph=createGraph(graph.preset);selected='n0';time=0;flowTime=0;playing=!reduced.matches;syncGraph(true);toast('Diagram reset. Undo restores your edits.');});
$('play').addEventListener('click',()=>{playing=!playing;syncPlayback();});
$('replay').addEventListener('click',()=>{time=0;flowTime=0;playing=true;syncPlayback();toast('Replaying the unfolding');});
$('timeline').addEventListener('input',()=>{time=Number($('timeline').value);flowTime=time;playing=false;syncPlayback();});
$('speed').addEventListener('change',()=>speed=Number($('speed').value));
$('flow-speed').addEventListener('input',()=>{flowSpeed=Number($('flow-speed').value);$('flow-label').textContent=`${flowSpeed.toFixed(1)}×`;persist();});
$('flow-enabled').addEventListener('change',()=>{flowEnabled=$('flow-enabled').checked;persist();});
$('dots').addEventListener('change',()=>{$('canvas').classList.toggle('no-dots',!$('dots').checked);persist();});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;syncModes();persist();}));
$('zoom-in').addEventListener('click',()=>renderer.zoom(1.2));$('zoom-out').addEventListener('click',()=>renderer.zoom(1/1.2));$('fit').addEventListener('click',()=>renderer.fit(false));
function syncThemeButton() {$('theme').setAttribute('aria-label',`Switch to ${document.documentElement.dataset.theme==='dark'?'light':'dark'} theme`);}
$('theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';syncThemeButton();persist();});
$('export').addEventListener('click',()=>{
  const name=PRESETS.find(p=>p.id===graph.preset).name;
  const data=renderer.exportSVG(name),url=URL.createObjectURL(new Blob([data],{type:'image/svg+xml'}));
  const a=document.createElement('a');a.href=url;a.download=`${graph.preset}-diagram.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Complete static diagram exported as SVG');
});
reduced.addEventListener('change',()=>{renderer.reduced=reduced.matches;if(reduced.matches){playing=false;time=duration(graph);}syncPlayback();});
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea,button,[role=button],a'))return;
  if(e.code==='Space'&&!reduced.matches){e.preventDefault();playing=!playing;syncPlayback();}
});
let last=performance.now(),frame=0;
function tick(now) {
  const delta=Math.min((now-last)/1000,.06);last=now;
  if(playing&&!document.hidden&&!reduced.matches){time=Math.min(duration(graph),time+delta*speed);flowTime+=delta*speed*flowSpeed;}
  renderer.render(time,flowTime,mode,flowEnabled,now);syncPlayback();frame=requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){cancelAnimationFrame(frame);}else{frame=requestAnimationFrame(tick);}});
syncModes();syncThemeButton();syncGraph(true);syncCardTheme();document.fonts.ready.then(()=>{for(const n of graph.nodes)renderer.updateLabel(n);renderer.fit();});frame=requestAnimationFrame(tick);
