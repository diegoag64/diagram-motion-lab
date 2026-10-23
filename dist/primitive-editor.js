import {summarize,validVisual} from './jev-primitives.js';
const html=(tag,attrs={},value)=>{const node=document.createElement(tag);for(const [key,val] of Object.entries(attrs))node.setAttribute(key,val);if(value!==undefined)node.textContent=value;return node;};
export class PrimitiveEditor {
  constructor(root,{getNode,change}){Object.assign(this,{root,getNode,change});}
  render(node){
    this.root.replaceChildren();this.root.hidden=!node.visual;if(!node.visual)return;
    const v=node.visual;
    this.root.append(html('h3',{},'Edit '+({state:'state',question:'instructions',action:'code action',image:'image evidence',box:'Box answer',choice:'Choice answer',score:'Score answer',noul:'Noul answer'})[v.type]));
    const help=html('p',{class:'help'},['choice','score','noul','box'].includes(v.type)?'Illustrative values. Editing them changes the drawing and code routes; it does not run Jev.':'Edit the evidence or instructions shown in the diagram.');this.root.append(help);
    const fields=html('div',{class:'primitive-fields'});this.root.append(fields);
    const error=html('p',{class:'primitive-error',role:'status'});this.root.append(error);
    const update=(mutate,structure=false)=>{
      const next=structuredClone(this.getNode().visual);mutate(next);
      if(!validVisual(next)){error.textContent='Use valid values: positive total weight, ordered thresholds, and left < right / top < bottom.';return;}
      try{this.change(next,structure);error.textContent='';}catch(reason){error.textContent=reason.message;}
    };
    const field=(title,input)=>{const label=html('label',{class:'primitive-field'});label.append(html('span',{},title),input);fields.append(label);return label;};
    const number=(title,value,min,max,step,onValue)=>{
      const input=html('input',{type:'number',min,max,step,'aria-label':title});input.value=value;input.addEventListener('input',()=>{if(input.value!==''&&input.checkValidity())update(next=>onValue(next,Number(input.value)));else error.textContent='Enter a number within the displayed range.';});field(title,input);return input;
    };
    const range=(title,value,min,max,step,onValue)=>{
      const input=html('input',{type:'range',min,max,step,'aria-label':title});input.value=value;
      const output=html('output',{},String(value)),label=field(title,input);label.append(output);
      input.addEventListener('input',()=>{output.textContent=input.value;update(next=>onValue(next,Number(input.value)));});return input;
    };
    if(['state','question','action'].includes(v.type)){
      const input=html('textarea',{rows:4,maxlength:500,'aria-label':'Block text'});input.value=v.text;input.addEventListener('input',()=>update(next=>next.text=input.value));field('Text',input);
    }
    if(v.type==='choice'||v.type==='score'){
      v.options.forEach((option,i)=>{
        const name=html('input',{type:'text',maxlength:32,'aria-label':`${v.type==='score'?'Level':'Category'} ${i+1} label`});name.value=option.label;name.addEventListener('input',()=>update(next=>next.options[i].label=name.value.trim()));field(v.type==='score'?`Level ${i}`:`Category ${i+1}`,name);
        number(`Weight ${i+1}`,option.weight,0,100,1,(next,value)=>next.options[i].weight=value);
      });
      const optionTools=html('div',{class:'option-tools'});
      const add=html('button',{type:'button',class:'button'},'Add '+(v.type==='choice'?'category':'level'));add.disabled=v.options.length>=6;add.addEventListener('click',()=>update(next=>{let name='New '+(next.options.length+1);while(next.options.some(o=>o.label===name))name+='+';next.options.push({label:name,weight:10});},true));
      const remove=html('button',{type:'button',class:'button'},'Remove last '+(v.type==='choice'?'category':'level'));remove.disabled=v.options.length<=2;remove.addEventListener('click',()=>update(next=>{next.options.pop();if(next.type==='score')next.threshold=Math.min(next.threshold,next.options.length-1);},true));optionTools.append(add,remove);fields.append(optionTools);
      range(v.type==='choice'?'Code confidence threshold':'Code score threshold',v.threshold,0,v.type==='choice'?1:v.options.length-1,.01,(next,value)=>next.threshold=value);
      this.root.append(html('p',{class:'help'},'Weights normalize to 100%. Confidence is derived using the documented TypeSafe formula. Thresholds are editable example policies.'));
    }
    if(v.type==='noul'){
      range('Probability of yes',v.value,0,1,.01,(next,value)=>next.value=value);
      number('No at or below',v.low,0,1,.01,(next,value)=>next.low=value);
      number('Yes at or above',v.high,0,1,.01,(next,value)=>next.high=value);
      this.root.append(html('p',{class:'help'},'Between the thresholds, code routes to review. Noul has no separate confidence. These are example policies, not universal cutoffs.'));
    }
    if(v.type==='box'){
      for(const key of ['left','top','right','bottom'])number(`Box ${key}`,v.box[key],0,1,.01,(next,value)=>next.box[key]=value);
      range('Box confidence',v.confidence,0,1,.01,(next,value)=>next.confidence=value);
      this.root.append(html('p',{class:'help'},'Box is Dreamer-ready in Jev 1.14. It always returns a box. Ask a separate Noul for presence; do not treat a box as proof that an object exists.'));
    }
    if(v.type==='box'&&v.imageFrom)this.root.append(html('p',{class:'help'},'Image linked to its evidence block. Select Image evidence to replace it.'));
    if(v.type==='image'||(v.type==='box'&&!v.imageFrom)){
      const file=html('input',{type:'file',accept:'image/png,image/jpeg,image/webp','aria-label':'Use a local image'});field('Local image · PNG, JPEG, WebP · up to 500 KB',file);
      file.addEventListener('change',async()=>{
        const chosen=file.files[0];if(!chosen)return;
        if(chosen.size>500000||!['image/png','image/jpeg','image/webp'].includes(chosen.type)){error.textContent='Choose a PNG, JPEG, or WebP up to 500 KB.';return;}
        const selectedId=node.id,reader=new FileReader();reader.onload=()=>{if(this.getNode().id===selectedId)update(next=>next.image=String(reader.result));};reader.readAsDataURL(chosen);
      });
      const reset=html('button',{class:'button',type:'button'},'Use sample illustration');reset.addEventListener('click',()=>update(next=>delete next.image));fields.append(reset);
    }
    if(['choice','score','noul','box'].includes(v.type)){
      const response=html('details',{class:'answer-json'}),pre=html('pre',{'aria-label':'Illustrative typed answer'});response.append(html('summary',{},'Typed answer'),pre);this.root.append(response);this.response=pre;this.updateAnswer(v);
    }else this.response=null;
  }
  updateAnswer(v){
    if(!this.response)return;const a=summarize(v);let answer={type:v.type};
    if(v.type==='choice')Object.assign(answer,{choice:v.options[a.winner].label,probabilities:Object.fromEntries(v.options.map((o,i)=>[o.label,a.probabilities[i]])),confidence:a.confidence});
    if(v.type==='score')Object.assign(answer,{score:a.score,legend:Object.fromEntries(v.options.map((o,i)=>[i,o.label])),probabilities:Object.fromEntries(a.probabilities.map((p,i)=>[i,p])),confidence:a.confidence});
    if(v.type==='noul')answer.noul=v.value;
    if(v.type==='box')Object.assign(answer,{box:v.box,confidence:v.confidence});
    this.response.textContent=JSON.stringify(answer,(_,value)=>typeof value==='number'?Number(value.toFixed(4)):value,2);
  }
}
