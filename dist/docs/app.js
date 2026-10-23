import {CARD_THEMES} from '../card-themes.js';
import {Renderer} from '../renderer.js';
import {DiagramViewer} from './viewer.js';
import {createGraph,duration} from '../model.js';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const prefsKey='typesafe-docs-local-preview-v1';
let prefs={};try{prefs=JSON.parse(localStorage.getItem(prefsKey)||'{}')||{};}catch{}
const styles=CARD_THEMES.map(theme=>theme.id);
for(const theme of CARD_THEMES){const option=document.createElement('option');option.value=theme.id;option.textContent=theme.name;$('card-style').append(option);}
let cardStyle=styles.includes(prefs.cardStyle)?prefs.cardStyle:'baseline',view='animated',playing=prefs.playing!==false,flowTime=0,inView=true;
document.documentElement.dataset.theme=prefs.theme==='light'?'light':'dark';
const graph=createGraph('jev');
const svg=$('diagram');svg.dataset.cardTheme=cardStyle;$('card-style').value=cardStyle;
const renderer=new Renderer(svg,()=>{},()=>{},{readOnly:true});renderer.reduced=reduced.matches;
renderer.setGraph(graph,null,{instant:true});renderer.fit(false);renderer.render(duration(graph),0,'signal',true);
function persist(){try{localStorage.setItem(prefsKey,JSON.stringify({theme:document.documentElement.dataset.theme,cardStyle,playing}));}catch{}}
let noticeTimer;function announce(text){$('announcement').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('announcement').textContent='',2800);}
function sync(){
 $('theme').setAttribute('aria-label',`Switch to ${document.documentElement.dataset.theme==='dark'?'light':'dark'} theme`);
 $('motion').textContent=playing?'Ⅱ':'▶';$('motion').setAttribute('aria-label',playing?'Pause diagram animation':'Play diagram animation');$('motion').disabled=reduced.matches||view==='original';$('card-style').disabled=view==='original';
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
}
$('theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';sync();persist();});
$('card-style').addEventListener('change',()=>{cardStyle=$('card-style').value;svg.dataset.cardTheme=cardStyle;for(const n of graph.nodes)renderer.updateLabel(n);persist();});
$('motion').addEventListener('click',()=>{playing=!playing;sync();persist();});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;$('animated-diagram').hidden=view!=='animated';$('original-diagram').hidden=view!=='original';if(view==='animated')requestAnimationFrame(()=>renderer.fit(false));sync();}));
const dialog=$('diagram-dialog');
const viewer=new DiagramViewer({viewport:$('diagram-viewport'),content:$('diagram-content'),readout:$('viewer-zoom'),zoomIn:$('viewer-zoom-in'),zoomOut:$('viewer-zoom-out'),reset:$('viewer-reset')});
$('expand').addEventListener('click',()=>{if(dialog.open){dialog.close();return;}dialog.showModal();$('expanded-mount').append($('diagram-figure'));$('expand').setAttribute('aria-label','Restore inline diagram');$('expand').title='Restore inline diagram';document.body.classList.add('diagram-expanded');requestAnimationFrame(()=>{if(dialog.open){renderer.fit(false);viewer.open();}});});
$('close-diagram').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{viewer.close();document.body.classList.remove('diagram-expanded');$('diagram-mount').append($('diagram-figure'));$('expand').setAttribute('aria-label','Expand diagram');$('expand').title='Expand diagram';requestAnimationFrame(()=>{renderer.fit(false);$('expand').focus();});});
let last=performance.now();function tick(now){const delta=Math.min((now-last)/1000,.06);last=now;if(!document.hidden&&inView&&view==='animated'){if(playing&&!reduced.matches)flowTime+=delta;renderer.render(duration(graph),flowTime,'signal',!reduced.matches,now);}requestAnimationFrame(tick);}
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{rootMargin:'100px'}).observe($('diagram-figure'));
reduced.addEventListener('change',()=>{renderer.reduced=reduced.matches;sync();});
document.fonts.ready.then(()=>{renderer.setGraph(graph,null,{instant:true});renderer.fit(false);});
$('menu').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menu').setAttribute('aria-expanded',String(open));$('menu').setAttribute('aria-label',open?'Close navigation':'Open navigation');});
$('sidebar').addEventListener('click',e=>{if(e.target.closest('a')){$('sidebar').classList.remove('open');$('menu').setAttribute('aria-expanded','false');}});
const search=$('search-dialog'),pages=[...document.querySelectorAll('.sidebar a')].map(a=>({title:a.textContent.trim(),href:a.getAttribute('href')}));
function filterPages(){const q=$('search-input').value.trim().toLowerCase();$('search-results').replaceChildren();const matches=pages.filter(p=>p.title.toLowerCase().includes(q));for(const page of matches){const a=document.createElement('a');a.textContent=page.title;a.href=page.href;a.addEventListener('click',()=>search.close());$('search-results').append(a);}if(!matches.length){const p=document.createElement('p');p.textContent='No matching page. Try “Choice” or “Confidence”.';$('search-results').append(p);}}
function openSearch(){search.showModal();$('search-input').value='';filterPages();$('search-input').focus();}
$('search-open').addEventListener('click',openSearch);$('search-input').addEventListener('input',filterPages);
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(search.open)search.close();else openSearch();}});
$('copy-page').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('Introduction\n\n'+document.querySelector('.lead').textContent+'\n\n'+$('article').innerText);announce('Preview page copied');}catch{announce('Copy unavailable in this browser. Select the article text to copy.');}});
document.querySelectorAll('[data-feedback]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-feedback]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('feedback-result').textContent=`“${b.dataset.feedback}” noted in this local preview.`;}));
const headings=[...document.querySelectorAll('article h2')];new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('.toc a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));}},{rootMargin:'-100px 0px -60% 0px'}).observe(headings[0]);
for(const heading of headings.slice(1)){new IntersectionObserver(entries=>{if(entries[0].isIntersecting)document.querySelectorAll('.toc a').forEach(a=>a.classList.toggle('active',a.hash==='#'+heading.id));},{rootMargin:'-100px 0px -60% 0px'}).observe(heading);}
sync();requestAnimationFrame(tick);
