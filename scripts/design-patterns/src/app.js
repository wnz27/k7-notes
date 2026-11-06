(() => {
'use strict';
const chinesePatterns = [...window.CREATION_PATTERNS, ...window.BEHAVIOR_PATTERNS];
const translations = window.PATTERN_EN || {};
const staticTranslations = window.BOOKLET_UI_EN || {};
const translateCode = code => code.split('\n').map(line => {
  const hash = line.indexOf('#');
  const source = hash < 0 ? line : line.slice(0,hash);
  const comment = hash < 0 ? '' : line.slice(hash);
  const translated = source.replace(/(["'])([^"'\n]*[\u3400-\u9fff][^"'\n]*)\1/g,(match,quote,value) => {
    const replacement=translations[value];
    return replacement ? quote+replacement.replace(/\\/g,'\\\\').replaceAll(quote,'\\'+quote).replace(/\n/g,'\\n')+quote : match;
  });
  return translated+(translations[comment] || comment);
}).join('\n');
const translate = (value, key) => {
  if (typeof value === 'string') {
    if (key === 'code') return translateCode(value);
    return ['id','category','kind','tone'].includes(key) ? value : translations[value] || value;
  }
  if (Array.isArray(value)) return value.map(item => translate(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name,item]) => [name,translate(item,name)]));
  return value;
};
const englishPatterns = chinesePatterns.map(pattern => translate(pattern));
let patterns = chinesePatterns;
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories = {creational:{name:'创建型',en:'CREATIONAL',note:'对象如何诞生'},structural:{name:'结构型',en:'STRUCTURAL',note:'对象如何组合'},behavioral:{name:'行为型',en:'BEHAVIORAL',note:'对象如何协作'}};
const state = {id:'builder',variant:0,step:0,category:'all',query:'',yaw:-28,pitch:28,playing:false,lang:'zh'};
const english = () => state.lang === 'en';
const copy = (zh, en) => english() ? en : zh;
const staticStrings = [...document.querySelectorAll('[data-i18n], [data-i18n-aria], [data-i18n-placeholder], [data-i18n-content]')].map(element => ({
  element,
  text: element.textContent,
  aria: element.getAttribute('aria-label'),
  placeholder: element.getAttribute('placeholder'),
  content: element.getAttribute('content'),
}));
function applyStaticLanguage() {
  for (const {element,text,aria,placeholder,content} of staticStrings) {
    if (element.dataset.i18n) element.textContent=english() ? staticTranslations[element.dataset.i18n] || text : text;
    if (element.dataset.i18nAria) element.setAttribute('aria-label',english() ? staticTranslations[element.dataset.i18nAria] || aria : aria);
    if (element.dataset.i18nPlaceholder) element.setAttribute('placeholder',english() ? staticTranslations[element.dataset.i18nPlaceholder] || placeholder : placeholder);
    if (element.dataset.i18nContent) element.setAttribute('content',english() ? staticTranslations[element.dataset.i18nContent] || content : content);
  }
}
let timer = null, animationFrame = null, copyTimer = null, drag = null;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = window.matchMedia('(max-width: 700px)');
const current = () => patterns.find(p => p.id === state.id);
const variant = () => current().demo.variants[state.variant];
const frame = () => variant().frames[state.step];
function stop() {clearTimeout(timer); timer=null;state.playing=false;$('play').textContent=copy('▶ 播放过程','▶ Play');}
function renderNav() {
  const filtered = patterns.filter((p,i) => (state.category === 'all' || p.category===state.category) && [p.name,p.en,p.intent,p.problem,p.when,chinesePatterns[i].name,chinesePatterns[i].intent,chinesePatterns[i].problem,chinesePatterns[i].when].join(' ').toLowerCase().includes(state.query.toLowerCase()));
  $('pattern-list').innerHTML = Object.entries(categories).map(([key,category]) => {
    const list=filtered.filter(p=>p.category===key);
    return list.length?`<div class="nav-group"><div class="nav-category">${english()?category.en:category.name}<small>${list.length.toString().padStart(2,'0')}</small></div>${list.map(p=>`<button class="pattern-link ${p.id===state.id?'active':''}" data-pattern="${p.id}" ${p.id===state.id?'aria-current="page"':''}><span class="num">${(patterns.indexOf(p)+1).toString().padStart(2,'0')}</span><span class="nav-label">${escape(english()?p.en:p.name)}</span>${p.demo.kind==='3d'?'<span class="spatial-mark">3D</span>':''}</button>`).join('')}</div>`:'';
  }).join('') || copy('<p class="empty-nav">没有找到匹配的模式。<br>试试「通知」「创建」或英文名称。</p>','<p class="empty-nav">No matching patterns.<br>Try “notification”, “creation”, or a pattern name.</p>');
}
function highlightCode(code) {
 return code.split('\n').map((line,i)=>{
   let html='',index=0;
   const re=/(#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:class|def|return|if|else|elif|for|in|import|from|as|with|assert|True|False|None|lambda|yield|pass|raise|not|and|or|is|while|try|except|super)\b)/g;
   for(const m of line.matchAll(re)){html+=escape(line.slice(index,m.index));html+=`<span class="${m[0].startsWith('#')?'comment':/^["']/.test(m[0])?'str':'kw'}">${escape(m[0])}</span>`;index=m.index+m[0].length;}
   return `<span class="code-line"><span class="number" aria-hidden="true">${i+1}</span>${html+escape(line.slice(index))}</span>`;
 }).join('\n');
}
function setTab(name) {
 const names=['code','decision'];
 names.forEach(n=>{$(`${n}-tab`).setAttribute('aria-selected',String(n===name));$(`${n}-tab`).tabIndex=n===name?0:-1;$(`${n}-panel`).hidden=n!==name;});
 $('copy-code').hidden=name!=='code';
}
function selectPattern(id, fromHash=false, preserve=false) {
 if(!patterns.some(p=>p.id===id))id='builder';
 stop();state.id=id;if(!preserve){state.variant=0;state.step=0;state.yaw=-28;state.pitch=28;}
 const p=current(),index=patterns.indexOf(p),category=categories[p.category];
 if(!fromHash && location.hash!=='#'+id)history.replaceState(null,'','#'+id);
 $('pattern-no').textContent=String(index+1).padStart(2,'0')+' / 24';
 $('pattern-category').textContent=english()?category.en:category.name+' · '+category.en;
 $('bonus-tag').hidden=id!=='simple-factory';
 $('pattern-heading').innerHTML=english()?escape(p.en):`${escape(p.name)}模式 <span>${escape(p.en)}</span>`;
 document.title=english()?`${p.en} · Pattern Atlas`:`${p.name}模式 · Pattern Atlas 设计模式速查`;
 $('pattern-intent').textContent=p.intent;
 $('render-kind').textContent=p.demo.kind==='3d'?'3D STRUCTURE':'2D PROCESS';
 $('scenario').textContent=p.demo.metaphor;
 $('stage').classList.toggle('spatial',p.demo.kind==='3d');
 $('view-controls').hidden=p.demo.kind!=='3d';$('reset-view').hidden=p.demo.kind!=='3d';
 $('stage-hint').textContent=p.demo.kind==='3d'?copy('拖动旋转 · 滑块调整视角','Drag to rotate · adjust the view with sliders'):copy('箭头表示引用 / 消息方向','Arrows show references / message flow');
 $('variant').innerHTML=p.demo.variants.map((v,i)=>`<option value="${i}">${escape(v.label)}</option>`).join('');
 $('variant').value=String(state.variant);
 $('experiment-prompt').textContent=english()?`Predict how “${p.demo.variants[0].label}” and “${p.demo.variants[1].label}” differ, then step through the demo to check.`:'试着预测「'+p.demo.variants[0].label+'」与「'+p.demo.variants[1].label+'」的结果有何不同，再逐步验证。';
 ['problem','when','tradeoff','avoid'].forEach(key=>$(key).textContent=p[key]);
 $('decision-when').textContent=p.when;
 $('transfer').textContent=english()?`Try another familiar problem: ${p.problem} Identify what changes, how ${p.en} isolates it, and what it costs.`:'换一个你熟悉的业务：'+p.problem+' 先指出变化的是哪一部分，再说明为什么「'+p.name+'」能隔离这种变化，以及它增加了什么成本。';
 $('compare-copy').textContent=p.compare.difference;
 $('compare-link').textContent=copy('对照阅读：','Compare: ')+p.compare.name+' →';
 $('compare-link').dataset.pattern=p.compare.id;
 $('model-caveat').textContent=p.demo.caveat;
 $('python-code').innerHTML=highlightCode(p.code);
 $('next-bottom').textContent=copy('下一个：','Next: ')+(english()?patterns[(index+1)%patterns.length].en:patterns[(index+1)%patterns.length].name)+' →';
 $('yaw').value=state.yaw;$('pitch').value=state.pitch;
 if(!preserve)setTab('code');renderNav();renderFrame();
}
const palette={neutral:{top:'#edf0e4',front:'#d3ddc8',side:'#b6c5a9',stroke:'#8d9e7e'},accent:{top:'#f2c6a6',front:'#dba27a',side:'#b97651',stroke:'#a56747'},blue:{top:'#d3dcf0',front:'#b0c0df',side:'#889fc9',stroke:'#748ab3'}};
function nodeTone(n){return palette[n.tone]||palette.neutral;}
function defs() {return '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#9eaf92" stroke-width="1.5"/></marker><marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#b3684e" stroke-width="1.5"/></marker></defs>';}
function render2D(f) {
 const byId=new Map(f.nodes.map(n=>[n.id,n]));const active=new Set(f.active||[]);
 const edges=f.edges.map(e=>{
  const a=byId.get(e.from),b=byId.get(e.to);if(!a||!b)return '';
  const dx=b.x-a.x,dy=b.y-a.y;const al=Math.max(Math.abs(dx)/((a.w||125)/2+8),Math.abs(dy)/((a.h||55)/2+8))||1;const bl=Math.max(Math.abs(dx)/((b.w||125)/2+8),Math.abs(dy)/((b.h||55)/2+8))||1;
  const sx=a.x+dx/al,sy=a.y+dy/al,tx=b.x-dx/bl,ty=b.y-dy/bl;
  const hot=active.has(e.to)&&active.has(e.from);
  // Parallel or reverse messages use a small bend to remain distinguishable.
  const reverse=f.edges.some(other=>other!==e&&other.from===e.to&&other.to===e.from);
  const bend=reverse?20:0,mx=(sx+tx)/2-dy/(Math.hypot(dx,dy)||1)*bend,my=(sy+ty)/2+dx/(Math.hypot(dx,dy)||1)*bend;
  const path=reverse?`M${sx},${sy} Q${mx},${my} ${tx},${ty}`:`M${sx},${sy} L${tx},${ty}`;
  return `<g><path class="scene-edge ${hot?'active':''}" d="${path}" marker-end="url(#${hot?'arrow-active':'arrow'})"/>${e.label?`<text class="edge-label" x="${mx}" y="${my-10}" text-anchor="middle">${escape(e.label)}</text>`:''}</g>`;
 }).join('');
 const nodes=f.nodes.map(n=>{const c=nodeTone(n),hot=active.has(n.id);const w=n.w||125,h=n.h||55;
 return `<g class="node ${hot?'focused':''}" data-part="${escape(n.id)}" aria-label="${escape(n.label+': '+(n.sub||''))}" transform="translate(${n.x-w/2} ${n.y-h/2})"><title>${escape(n.label+' '+(n.sub||''))}</title><rect x="3" y="5" width="${w}" height="${h}" rx="4" fill="#d5dccb" opacity=".38"/><rect width="${w}" height="${h}" rx="4" fill="${hot?'#fae8d9':c.top}" stroke="${hot?'#b56c4c':c.stroke}" stroke-width="${hot?1.7:1}"/><circle class="node-dot" cx="11" cy="11" r="2"/><text class="node-label" x="${w/2}" y="${h/2+(n.sub?-2:6)}" text-anchor="middle">${escape(n.label)}</text>${n.sub?`<text class="node-sub" x="${w/2}" y="${h/2+17}" text-anchor="middle">${escape(n.sub)}</text>`:''}</g>`;
 }).join('');
 return defs()+edges+nodes;
}
function render3D(f) {
 const yr=state.yaw*Math.PI/180,pr=state.pitch*Math.PI/180,cy=Math.cos(yr),sy=Math.sin(yr),cp=Math.cos(pr),sp=Math.sin(pr);
 const project=([x,y,z])=>{const rx=x*cy+z*sy,rz=-x*sy+z*cy;return {x:400+rx*1.08,y:285+(-y*cp+rz*sp)*1.08,depth:rz*cp+y*sp};};
 const points=arr=>arr.map(v=>{const p=project(v);return p.x.toFixed(2)+','+p.y.toFixed(2);}).join(' ');
 let floor='';for(let n=-300;n<=300;n+=50){floor+=`<path class="floor-line" d="M${points([[n,-38,-160],[n,-38,160]]).replace(' ',' L')}"/>`;}
 for(let n=-150;n<=150;n+=50){floor+=`<path class="floor-line" d="M${points([[-300,-38,n],[300,-38,n]]).replace(' ',' L')}"/>`;}
 const active=new Set(f.active||[]),byId=new Map(f.nodes.map(n=>[n.id,n]));
 const edges=f.edges.map(e=>{const a=byId.get(e.from),b=byId.get(e.to);if(!a||!b)return '';const pa=project([a.x,a.y,a.z]),pb=project([b.x,b.y,b.z]);const hot=active.has(e.from)&&active.has(e.to);return `<g><path class="scene-edge ${hot?'active':''}" d="M${pa.x},${pa.y} L${pb.x},${pb.y}" marker-end="url(#${hot?'arrow-active':'arrow'})"/>${e.label?`<text class="edge-label" text-anchor="middle" x="${(pa.x+pb.x)/2}" y="${(pa.y+pb.y)/2-9}">${escape(e.label)}</text>`:''}</g>`;}).join('');
 const faces=[],labels=[];
 f.nodes.forEach(n=>{
  const x=n.x,y=n.y,z=n.z||0,w=(n.w||110)/2,h=(n.h||48)/2,d=(n.d||65)/2,c=nodeTone(n),hot=active.has(n.id);
  const verts=[[-w,-h,-d],[w,-h,-d],[w,-h,d],[-w,-h,d],[-w,h,-d],[w,h,-d],[w,h,d],[-w,h,d]].map(v=>[v[0]+x,v[1]+y,v[2]+z]);
  const sides=[{i:[4,5,6,7],normal:[0,1,0],color:c.top},{i:[3,2,6,7],normal:[0,0,1],color:c.front},{i:[0,1,5,4],normal:[0,0,-1],color:c.side},{i:[1,2,6,5],normal:[1,0,0],color:c.side},{i:[0,3,7,4],normal:[-1,0,0],color:c.front}];
  sides.forEach(face=>{const [nx,ny,nz]=face.normal;const dot=-nx*sy*cp+ny*sp+nz*cy*cp;if(dot<=0)return;const vs=face.i.map(i=>verts[i]),depth=vs.reduce((sum,v)=>sum+project(v).depth,0)/4;
   faces.push({depth,svg:`<polygon points="${points(vs)}" fill="${face.color}" stroke="${hot?'#a45937':c.stroke}" stroke-width="${hot?1.8:1}" stroke-linejoin="round"/>`});
  });
  const p=project([x,y,z]);labels.push({depth:p.depth,svg:`<g class="node ${hot?'focused':''}" data-part="${escape(n.id)}" aria-label="${escape(n.label+': '+(n.sub||''))}"><title>${escape(n.label+' '+(n.sub||''))}</title><text class="geometry-label" x="${p.x}" y="${p.y+(n.sub?-1:5)}" text-anchor="middle">${escape(n.label)}</text>${n.sub?`<text class="geometry-sub" x="${p.x}" y="${p.y+16}" text-anchor="middle">${escape(n.sub)}</text>`:''}</g>`});
 });
 faces.sort((a,b)=>a.depth-b.depth);labels.sort((a,b)=>a.depth-b.depth);
 return defs()+floor+edges+faces.map(f=>f.svg).join('')+labels.map(l=>l.svg).join('');
}
function drawScene(animate=false) {
 if(animationFrame){cancelAnimationFrame(animationFrame);animationFrame=null;}
 const f=frame(),p=current(),markup=p.demo.kind==='3d'?render3D(f):render2D(f);
 $('scene').innerHTML=`<title id="scene-title">${escape((english()?p.en:p.name+'模式')+copy('：', ' · ')+f.title)}</title><desc id="scene-description">${escape(f.description+copy('。','. ')+f.stats.map(s=>s.label+': '+s.value).join(copy('；','; ')))}</desc><g ${animate&&!reduced.matches?'class="scene-enter"':''}>${markup}</g>`;
 $('scene').setAttribute('viewBox','0 0 800 440');
 if(p.demo.kind==='3d'){
  const boxes=[...$('scene').querySelectorAll('polygon')].map(el=>el.getBBox());
  if(boxes.length){const x0=Math.min(...boxes.map(b=>b.x)),x1=Math.max(...boxes.map(b=>b.x+b.width)),y0=Math.min(...boxes.map(b=>b.y)),y1=Math.max(...boxes.map(b=>b.y+b.height));if(mobile.matches){const w=Math.max(420,x1-x0+70),h=Math.max(280,y1-y0+70);$('scene').setAttribute('viewBox',`${(x0+x1-w)/2} ${(y0+y1-h)/2} ${w} ${h}`);}else{const left=Math.min(0,x0-24),top=Math.min(0,y0-24),right=Math.max(800,x1+24),bottom=Math.max(440,y1+24);$('scene').setAttribute('viewBox',`${left} ${top} ${right-left} ${bottom-top}`);}}
 }
 if(animate&&!reduced.matches)animateSignals();
}
function animateSignals(){
 const paths=[...$('scene').querySelectorAll('.scene-edge.active')];if(!paths.length)return;
 const ns='http://www.w3.org/2000/svg',dots=paths.map(path=>{const dot=document.createElementNS(ns,'circle');dot.setAttribute('r','3');dot.setAttribute('class','signal');$('scene').appendChild(dot);return {dot,path,len:path.getTotalLength()};});
 let start=null;
 const tick=now=>{if(start===null)start=now;const phase=Math.min((now-start)/800,1);dots.forEach(({dot,path,len})=>{const p=path.getPointAtLength(len*phase);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);});if(phase<1&&!document.hidden)animationFrame=requestAnimationFrame(tick);else{dots.forEach(({dot})=>dot.remove());animationFrame=null;}};
 animationFrame=requestAnimationFrame(tick);
}
function renderFrame(animate=false){
 const f=frame(),count=variant().frames.length;
 $('readouts').innerHTML=f.stats.map(s=>`<div class="readout"><span>${escape(s.label)}</span><strong>${escape(s.value)}</strong></div>`).join('');
 $('step-counter').textContent=String(state.step+1).padStart(2,'0')+' / '+String(count).padStart(2,'0');
 $('step-title').textContent=f.title;$('step-description').textContent=f.description;
 $('trace-log').textContent=f.log;
 $('parts-legend').innerHTML=f.nodes.map(n=>`<span class="part-key ${(f.active||[]).includes(n.id)?'active':''}"><b>${escape(n.label)}</b><span>${escape(n.sub)}</span></span>`).join('');
 $('step-dots').innerHTML=variant().frames.map((f,i)=>`<button data-step="${i}" class="${i<state.step?'passed':i===state.step?'current':''}" aria-label="${english()?`Step ${i+1}: `:`第 ${i+1} 步：`}${escape(f.title)}" ${i===state.step?'aria-current="step"':''}></button>`).join('');
 $('step-next').disabled=state.step===count-1;
 $('play').textContent=state.playing?copy('Ⅱ 暂停过程','Ⅱ Pause'):state.step===count-1?copy('↺ 重播过程','↺ Replay'):copy('▶ 播放过程','▶ Play');
 $('yaw-value').textContent=state.yaw+'°';$('pitch-value').textContent=state.pitch+'°';
 drawScene(animate);
}
function advance(){if(state.step<variant().frames.length-1){state.step++;renderFrame(true);}else stop();}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(!state.playing)return;advance();if(state.step===variant().frames.length-1)stop();else schedule();},1800);}
function cycle(delta){const index=patterns.indexOf(current());selectPattern(patterns[(index+delta+patterns.length)%patterns.length].id);}
$('pattern-list').addEventListener('click',e=>{const button=e.target.closest('[data-pattern]');if(button){selectPattern(button.dataset.pattern);$('pattern-heading').focus({preventScroll:true});}});
$('search').addEventListener('input',e=>{state.query=e.target.value.trim();renderNav();});
document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{state.category=button.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});renderNav();}));
$('variant').addEventListener('change',e=>{stop();state.variant=Number(e.target.value);state.step=0;renderFrame(true);});
$('step-next').addEventListener('click',()=>{stop();advance();});
$('step-dots').addEventListener('click',e=>{const button=e.target.closest('[data-step]');if(button){stop();state.step=Number(button.dataset.step);renderFrame(true);}});
$('play').addEventListener('click',()=>{if(state.playing){stop();return;}if(state.step===variant().frames.length-1){state.step=0;renderFrame();}state.playing=true;$('play').textContent=copy('Ⅱ 暂停过程','Ⅱ Pause');schedule();});
$('reset').addEventListener('click',()=>{stop();state.step=0;renderFrame();});
$('previous-pattern').addEventListener('click',()=>cycle(-1));$('next-pattern').addEventListener('click',()=>cycle(1));$('next-bottom').addEventListener('click',()=>{cycle(1);$('pattern-heading').scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});});
$('compare-link').addEventListener('click',e=>selectPattern(e.currentTarget.dataset.pattern));
function updateView(){state.yaw=Number($('yaw').value);state.pitch=Number($('pitch').value);$('yaw-value').textContent=state.yaw+'°';$('pitch-value').textContent=state.pitch+'°';drawScene();}
$('yaw').addEventListener('input',updateView);$('pitch').addEventListener('input',updateView);
$('reset-view').addEventListener('click',()=>{$('yaw').value=-28;$('pitch').value=28;updateView();});
$('stage').addEventListener('pointerdown',e=>{if(current().demo.kind!=='3d'||e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch};$('stage').setPointerCapture(e.pointerId);$('stage').classList.add('dragging');});
$('stage').addEventListener('pointermove',e=>{if(!drag)return;state.yaw=Math.round(Math.max(-75,Math.min(75,drag.yaw+(e.clientX-drag.x)*.28)));state.pitch=Math.round(Math.max(15,Math.min(65,drag.pitch+(e.clientY-drag.y)*.2)));$('yaw').value=state.yaw;$('pitch').value=state.pitch;updateView();});
function endDrag(){drag=null;$('stage').classList.remove('dragging');}
$('stage').addEventListener('pointerup',endDrag);$('stage').addEventListener('pointercancel',endDrag);$('stage').addEventListener('lostpointercapture',endDrag);
$('stage').addEventListener('keydown',e=>{if(current().demo.kind!=='3d')return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')$('yaw').value=state.yaw-5;if(e.key==='ArrowRight')$('yaw').value=state.yaw+5;if(e.key==='ArrowUp')$('pitch').value=state.pitch+5;if(e.key==='ArrowDown')$('pitch').value=state.pitch-5;updateView();});
['code','decision'].forEach(name=>{
 $(`${name}-tab`).addEventListener('click',()=>setTab(name));
 $(`${name}-tab`).addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const names=['code','decision'];const i=names.indexOf(name),next=e.key==='Home'?0:e.key==='End'?names.length-1:(i+(e.key==='ArrowRight'?1:names.length-1))%names.length;setTab(names[next]);$(`${names[next]}-tab`).focus();});
});
$('copy-code').addEventListener('click',async()=>{
 let copied=false;try{if(navigator.clipboard){await navigator.clipboard.writeText(current().code);copied=true;}}catch{}
 if(!copied){const textarea=document.createElement('textarea');textarea.value=current().code;textarea.style.cssText='position:fixed;top:0;left:-10000px';document.body.appendChild(textarea);textarea.select();copied=document.execCommand('copy');textarea.remove();$('copy-code').focus();}
 $('copy-code').textContent=copied?copy('已复制 ✓','Copied ✓'):copy('请选中代码复制','Select the code to copy');clearTimeout(copyTimer);copyTimer=setTimeout(()=>$('copy-code').textContent=copy('复制代码 ⧉','Copy code ⧉'),2000);
});
const dialog=$('reading-dialog');$('open-reading').addEventListener('click',()=>dialog.showModal());$('close-reading').addEventListener('click',()=>dialog.close());$('start-reading').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('hashchange',()=>selectPattern(location.hash.slice(1),true));
document.addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('search').focus();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();if(animationFrame){cancelAnimationFrame(animationFrame);animationFrame=null;}}});
const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){stop();if(animationFrame){cancelAnimationFrame(animationFrame);animationFrame=null;}}},{threshold:.05});observer.observe($('stage'));
mobile.addEventListener('change',()=>drawScene());
function setBookletLanguage(lang) {
 if(!['zh','en'].includes(lang)||lang===state.lang)return;
 stop();state.lang=lang;patterns=english()?englishPatterns:chinesePatterns;
 document.documentElement.lang=english()?'en':'zh-CN';
 applyStaticLanguage();
 const toggle=$('language-toggle');
 if(toggle){toggle.textContent=english()?'中文':'EN';toggle.setAttribute('aria-label',english()?'切换为中文':'Switch to English');toggle.lang=english()?'zh-CN':'en';}
 try{localStorage.setItem('pattern-atlas-language',lang);}catch{}
 selectPattern(state.id,true,true);
}
window.setBookletLanguage=setBookletLanguage;
$('language-toggle')?.addEventListener('click',()=>setBookletLanguage(english()?'zh':'en'));
selectPattern(location.hash.slice(1)||'builder',true);
try{if(localStorage.getItem('pattern-atlas-language')==='en')setBookletLanguage('en');}catch{}
})();
