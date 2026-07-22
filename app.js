/* Shared engine for the 10-day IELTS sprint — speaking + writing. */
const VERSION='40';
const DAY=window.DAY_CONFIG?window.DAY_CONFIG.day:'x';
const KEY='ielts_sprint_20260715_day'+DAY+'_v3';
const PROGRESS_KEY='ielts_sprint_20260715_progress';
const P1_EDIT_KEY='ielts_daily_trainer_p1_answer_overrides_v1';
const CONTENT_EDIT_KEY='ielts_daily_trainer_content_overrides_v1';
const IDEA_NOTE_KEY='ielts_daily_trainer_idea_notes_v1';
function loadState(){ try{ const value=JSON.parse(localStorage.getItem(KEY)||'{}'); return value&&typeof value==='object'&&!Array.isArray(value)?value:{}; }catch(_){ return {}; } }
function loadP1AnswerEdits(){ try{ const value=JSON.parse(localStorage.getItem(P1_EDIT_KEY)||'{}'); return value&&typeof value==='object'&&!Array.isArray(value)?value:{}; }catch(_){ return {}; } }
function loadContentEdits(){ try{ const value=JSON.parse(localStorage.getItem(CONTENT_EDIT_KEY)||'{}'); return value&&typeof value==='object'&&!Array.isArray(value)?value:{}; }catch(_){ return {}; } }
function loadIdeaNotes(){ try{ const value=JSON.parse(localStorage.getItem(IDEA_NOTE_KEY)||'{}'); return value&&typeof value==='object'&&!Array.isArray(value)?value:{}; }catch(_){ return {}; } }
let state=loadState();
let p1AnswerEdits=loadP1AnswerEdits();
let contentEdits=loadContentEdits();
let ideaNotes=loadIdeaNotes();
function save(){ localStorage.setItem(KEY,JSON.stringify(state)); syncProgress(); }
function st(id){ return state[id]||(state[id]={}); }
let hide=false, annot=false, view={name:'list',id:null};
let P1=[],P3=[],P2={},REF={},WRITING={},ITEMS=[];
const app=document.getElementById('app');
const aud=n=>`../${n}.m4a?v=${VERSION}`;
const asset=n=>`../${n}?v=${VERSION}`;
const SPD='<select class="spd" onchange="spdSel(this)"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>';
function player(src){ return `<audio controls preload="auto" src="${src}"></audio><button class="btn loop" onclick="lp(this)">🔁</button>${SPD}`; }
function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(t){ return esc(t).replace(/"/g,'&quot;'); }
function stars(t){ return t==='A'?'★★★':t==='B'?'★★':'★'; }
function wordCount(t){ return (t.match(/[A-Za-z0-9'’\-]+/g)||[]).length; }
function p1QuestionIndexes(cfg,idx){
  const mapped=cfg.p1QuestionMap&&cfg.p1QuestionMap[String(idx)];
  return Array.isArray(mapped)&&mapped.length?mapped:P1[idx].qa.map((_,questionIndex)=>questionIndex);
}

function cleanLiveQuestion(raw){
  const text=String(raw||'Part 1 question');
  const alternative=text.match(/^(.+?\?)\s*\/\s*.+$/);
  return alternative?alternative[1]:text;
}

function liveP1Pool(cfg,indices){
  return (indices||[]).flatMap(idx=>{
    const topic=P1[idx];
    if(!topic)return [];
    return p1QuestionIndexes(cfg,idx).map(questionIndex=>{
      const qa=topic.qa&&topic.qa[questionIndex];
      return qa?{topic:`${topic.topic}（${topic.cn}）`,question:cleanLiveQuestion(qa.q)}:null;
    }).filter(Boolean);
  });
}

function liveScope(){
  const cfg=window.DAY_CONFIG;
  const p1NewQuestions=liveP1Pool(cfg,cfg.p1New||[]);
  const legacyReview=[...(cfg.p1||[]),...(cfg.p1Optional||[])];
  const p1ReviewQuestions=liveP1Pool(cfg,[...(cfg.p1Review||[]),...legacyReview]);
  const p2ids=[cfg.newP2,...(cfg.reviewP2||[])].filter((id,index,list)=>id&&list.indexOf(id)===index);
  const p2Items=p2ids.map(id=>({id,m:P2[id],isNew:id===cfg.newP2})).filter(item=>item.m);
  const p3Indices=[cfg.p3,...(cfg.p3Review||[])].filter((value,index,list)=>value!==null&&value!==undefined&&list.indexOf(value)===index);
  const p3Items=p3Indices.map(index=>({index,m:P3[index]})).filter(item=>item.m);
  const p3Questions=p3Items.flatMap(item=>(item.m.qa||[]).map(q=>({topic:item.m.cn,question:q.q})));
  const p1NewCount=Math.min(p1NewQuestions.length,Math.max(0,Number(cfg.liveP1NewCount??8)));
  const p1ReviewCount=Math.min(p1ReviewQuestions.length,Math.max(0,Number(cfg.liveP1ReviewCount??4)));
  const p2Count=Math.min(p2Items.length,Math.max(0,Number(cfg.liveP2Count??1)));
  const p3Count=Math.min(p3Questions.length,Math.max(0,Number(cfg.liveP3Count??3)));
  const liveMinutes=Math.max(10,Number(cfg.liveMinutes||12));
  const label=`P1 新学 ${p1NewQuestions.length}题池 + 已背复习 ${p1ReviewQuestions.length}题池 · P2 ${p2Items.length}篇题池${p3Items.length?` · P3 ${p3Items.length}类题池`:''}`;
  return {cfg,p1NewQuestions,p1ReviewQuestions,p2Items,p3Items,p3Questions,p1NewCount,p1ReviewCount,p2Count,p3Count,liveMinutes,label};
}

function livePrompt(){
  const x=liveScope();
  const formatPool=questions=>questions.length?questions.map((q,n)=>`${n+1}. [${q.topic}] ${q.question}`).join('\n'):'（今天没有这一类题）';
  const p2=x.p2Items.length?x.p2Items.map((item,n)=>{
    const cuePoints=Array.isArray(item.m.cuePoints)&&item.m.cuePoints.length?`\n   Cue points: ${item.m.cuePoints.join(' / ')}`:'';
    return `${n+1}. ${item.isNew?'[今日新学，优先] ':'[复习] '}母题 ${item.id}: ${item.m.cue}${cuePoints}`;
  }).join('\n'):'（今天没有 Part 2）';
  const p3Block=x.p3Questions.length?`\n\nPart 3 题池（随机抽${x.p3Count}题）：\n${x.p3Questions.map((q,n)=>`${n+1}. [${q.topic}] ${q.question}`).join('\n')}`:'';
  return `你是大陆考区雅思口语考官。我的目标是6.5，实际语速偏慢。这是一场约${x.liveMinutes}分钟的随机抽问与诊断，不是教学课。\n\n训练日期是 ${x.cfg.date}。只从以下题池抽题，不要按清单顺序全问。\n\nPart 1 新学题池（随机抽${x.p1NewCount}题）：\n${formatPool(x.p1NewQuestions)}\n\nPart 1 已背复习题池（随机抽${x.p1ReviewCount}题）：\n${formatPool(x.p1ReviewQuestions)}\n\nPart 2 题池：\n${p2}${p3Block}\n\n规则：\n1. 全程用英语提问，不要先给答案、提示或示范。\n2. Part 1 从新学池抽${x.p1NewCount}题、复习池抽${x.p1ReviewCount}题，混合顺序且不要重复；数量为0的题池跳过。每次只问一题，等我回答后再继续。\n3. Part 2做${x.p2Count}题：若题池标有“今日新学”，第一题必须选它；其余从复习母题随机抽取且不重复。每题给我1分钟准备；我开始后目标回答90–120秒。期间保持安静，即使我停顿也不要接话，直到我说 Done；不要声称计时绝对精确。\n4. ${x.p3Count?`Part 3只从上面题池随机问${x.p3Count}题，一次一题，不生成新题。`:'今天没有安排Part 3，不要自行增加Part 3。'}\n5. 全部结束后，用简短中文正好反馈最影响6.5的3点；优先看是否切题、是否卡顿、基础语法和发音。每点只给最小修改，然后从刚才的问题中选最弱的1题让我重答。不要承诺精确分数。\n6. 重答结束后，最后输出以下固定4行，供我粘贴回复习页面：\nP1弱题：<话题和问题；没有则写无>\nP2漏掉的cue：<缺失点；没有则写无>\n最影响6.5的3点：1)<问题+最小修改>；2)<问题+最小修改>；3)<问题+最小修改>\n重答结果：<改善了什么，仍卡在哪里>\n7. 不要增加新背诵材料，不要重写我的整段答案，也不要提供完整范文。\n\n现在从今天实际安排的第一个部分开始提问。`;
}

function renderPending(){
  const cfg=window.DAY_CONFIG;
  app.innerHTML=`<div class="top"><a class="home" href="../">← 冲刺首页</a></div>
    <div class="dayeyebrow">${cfg.date||''}</div><h1>${cfg.title}</h1>
    <section class="pending-page"><span>待安排</span><strong>${esc(cfg.newLabel||'等待下一次进度导出')}</strong><p>${esc(cfg.note||'先完成当前日期，导出后再滚动安排。')}</p></section>
    <div class="foot">页面按实际日期更新</div>`;
}

function fallbackCopy(text){
  const ta=document.createElement('textarea');
  ta.value=text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; ta.style.fontSize='16px';
  document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0,ta.value.length);
  const ok=document.execCommand('copy'); ta.remove(); if(!ok)throw new Error('copy failed');
}
async function copyLivePrompt(btn,event){
  if(event)event.stopPropagation();
  const text=livePrompt(),base=btn.dataset.base||btn.textContent; btn.dataset.base=base;
  try{
    if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text); else fallbackCopy(text);
    btn.textContent='已复制 ✓'; btn.classList.add('copied');
    setTimeout(()=>{btn.textContent=base;btn.classList.remove('copied');},1800);
  }catch(err){
    window.prompt('复制下面的提示词，再粘贴到 ChatGPT：',text);
    btn.textContent='请手动复制'; setTimeout(()=>{btn.textContent=base;},1800);
  }
}

async function boot(){
  const cfg=window.DAY_CONFIG;
  if(cfg.status==='pending'){ renderPending(); return; }
  const [a,b,c,d,e]=await Promise.all([
    fetch('../data-p1.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-p2.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-p3.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-ref.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-writing.json?v='+VERSION).then(r=>r.json())]);
  P1=a; P3=c; b.forEach(m=>P2[m.id]=m); d.forEach(r=>REF[r.id]=r); e.forEach(w=>WRITING[w.id]=w);
  ITEMS=[];
  if((cfg.newP2?1:0)+(cfg.newWriting?1:0)>1) throw new Error('A date cannot contain two new memorisation items');
  if(cfg.newP2){ const m=P2[cfg.newP2],targets=cfg.newP2Targets||{read:3,recall:2,dictate:1}; const labels={read:'听读',recall:'关键词复述',dictate:'默写检验',record:'90–120秒录音'}; const sub=Object.entries(targets).map(([key,target])=>`${labels[key]||key}×${target}`).join(' → '); ITEMS.push({type:'memo',tier:'core',weight:4,targets,id:'new_'+m.id,m,title:`今日唯一长背诵 · 母题 ${m.id} ${m.cn}`,icon:'🎤',sub}); }
  if(cfg.newWriting){ const w=WRITING[cfg.newWriting],finalReview=!!cfg.moduleOrder; const sub=finalReview?'看题说结构 → 核对核心句 → 完成一个提纲':w.task==='Task 1'?'通用框架 → 简单句块 → 看范文落地 → 换图仿写':'范文学习 → 闭卷逻辑链 → 核心句 → 换题仿写'; ITEMS.push({type:'writingmemo',tier:'core',weight:finalReview?1:4,finalReview,id:'wnew_'+w.id,w,title:`${finalReview?'作文总复习':'今日唯一长背诵'} · ${w.task} ${w.type} · ${w.cn}`,icon:'✍️',sub}); }
  (cfg.p1New||[]).forEach(idx=>{ const t=P1[idx],qidxs=p1QuestionIndexes(cfg,idx); ITEMS.push({type:'p1learn',tier:'core',id:'p1new_'+idx,idxs:[idx],qidxs,title:`P1 新学 · ${t.topic}（${t.cn}）`,icon:'＋',sub:`${stars(t.tier)} · 全部 ${qidxs.length} 道问题已列出 · 自由选择练习`}); });
  (cfg.reviewP2||[]).forEach(id=>{ const m=P2[id]; ITEMS.push({type:'review',tier:'core',id:'rev_'+id,m,title:`母题 ${id} · ${m.cn}（复习）`,icon:'🔁',sub:'只看关键词链说 60–90 秒；卡住再听，不重背全文'}); });
  (cfg.p1Review||[]).forEach(idx=>{ const t=P1[idx],qidxs=p1QuestionIndexes(cfg,idx); ITEMS.push({type:'p1review',tier:'core',id:'p1rev_'+idx,idxs:[idx],qidxs,title:`P1 已背复习 · ${t.topic}（${t.cn}）`,icon:'↺',sub:`${stars(t.tier)} · 全部 ${qidxs.length} 道问题已列出 · 自由选择复习`}); });
  (cfg.p1||[]).forEach(idx=>{ const t=P1[idx],qidxs=p1QuestionIndexes(cfg,idx); ITEMS.push({type:'p1review',tier:'core',id:'p1_'+idx,idxs:[idx],qidxs,title:`P1 · ${t.topic}（${t.cn}）`,icon:'🗣️',sub:`${stars(t.tier)} · 全部 ${qidxs.length} 道问题已列出 · 自由选择复习`}); });
  (cfg.p1Optional||[]).forEach(idx=>{ const t=P1[idx],qidxs=p1QuestionIndexes(cfg,idx); ITEMS.push({type:'p1review',tier:'bonus',id:'p1opt_'+idx,idxs:[idx],qidxs,title:`可选 P1 · ${t.topic}（${t.cn}）`,icon:'＋',sub:`有余力再做 · ${qidxs.length} 道重点题 · 不挤占核心任务`}); });
  (cfg.p1prev||[]).forEach(idx=>{ const t=P1[idx]; ITEMS.push({type:'p1quick',tier:'bonus',id:'p1q_'+idx,idxs:[idx],title:`P1 快速回扫 · ${t.topic}`,icon:'🔁',sub:'快速扫题和答案；需要时直接修改'}); });
  if(cfg.reviewWriting&&cfg.reviewWriting.length){ const ws=cfg.reviewWriting.map(id=>WRITING[id]).filter(Boolean),firstPass=new Set(cfg.firstPassWriting||[]); if(cfg.reviewWritingSeparate){ ws.forEach(w=>{ const isFirst=firstPass.has(w.id); ITEMS.push({type:'writingreview',tier:'core',firstPass:isFirst,id:'wrev_'+w.id,ws:[w],title:`${isFirst?'剩余新内容速过':'写作复习'} · ${w.task} ${w.type} · ${w.cn}`,icon:isFirst?'＋':'↺',sub:isFirst?'框架 → 核心句 → 一个输出段；不逐字背全文':'单独打勾：先闭卷复原，再核核心句'}); }); }else{ ITEMS.push({type:'writingreview',tier:'core',weight:ws.length,id:'wrev',ws,title:`写作到期复习 · ${ws.length} 张`,icon:'↺',sub:'不看原文先复原结构，再核核心句'}); } }
  if(cfg.p3!=null){ const t=P3[cfg.p3]; ITEMS.push({type:'p3',tier:'bonus',id:'p3',t,idx:cfg.p3,title:'P3 · '+t.cn,icon:'💬',sub:'四步法:观点+because+例子+让步'}); }
  (cfg.p3Review||[]).forEach(idx=>{ const t=P3[idx]; ITEMS.push({type:'p3',tier:'bonus',id:'p3_'+idx,t,idx,title:'P3 · '+t.cn,icon:'💬',sub:'四步法:观点+because+例子+让步'}); });
  if(cfg.ref&&cfg.ref.length){ ITEMS.push({type:'refcard',tier:'bonus',id:'REFC',ids:cfg.ref,title:'套用速查卡 · '+cfg.ref.length+' 张',icon:'🗂️',sub:'考前翻:开头+关键词链+短版'}); }
  if(cfg.outputs&&cfg.outputs.length){ ITEMS.push({type:'output',tier:'core',id:'OUT',outputs:cfg.outputs,title:cfg.moduleOrder?'本轮输出':'今日输出验收',icon:'✓',sub:'完成一个可见输出，避免只看不练'}); }
  if(cfg.live!==false)ITEMS.push({type:'record',tier:'bonus',id:'REC',title:'ChatGPT 随机抽问 / 口语诊断',icon:'🎙️',sub:`一键复制今日题池 → 练约 ${cfg.liveMinutes||12} 分钟；没有语音模式就录音回听`});
  syncProgress();
  renderList();
}

function itemWeight(i){ const value=Number(i.weight||1); return Number.isFinite(value)&&value>0?value:1; }
function weightedPercent(items){ const total=items.reduce((sum,i)=>sum+itemWeight(i),0); return total?Math.round(items.reduce((sum,i)=>sum+frac(i)*itemWeight(i),0)/total*100):0; }
function isDone(i){ const s=st(i.id);
  if(i.type==='memo') return Object.entries(i.targets||{read:3,recall:2,dictate:1}).every(([key,target])=>(s[key]||0)>=target);
  if(i.type==='writingmemo') return i.finalReview?!!s.done:(s.read||0)>=2&&(s.outline||0)>=2&&(s.core||0)>=1&&(s.transfer||0)>=1;
  return !!s.done; }
function frac(i){ const s=st(i.id);
  if(i.type==='memo'){ const targets=i.targets||{read:3,recall:2,dictate:1}; const total=Object.values(targets).reduce((sum,target)=>sum+target,0); return total?Object.entries(targets).reduce((sum,[key,target])=>sum+Math.min(s[key]||0,target),0)/total:0; }
  if(i.type==='writingmemo') return i.finalReview?(s.done?1:0):(Math.min(s.read||0,2)+Math.min(s.outline||0,2)+Math.min(s.core||0,1)+Math.min(s.transfer||0,1))/6;
  return isDone(i)?1:0; }

function progressPercent(){ return weightedPercent(ITEMS.filter(i=>i.tier==='core')); }
function syncProgress(){ if(!ITEMS.length||DAY==='x')return; const p=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}'); p[DAY]=progressPercent(); localStorage.setItem(PROGRESS_KEY,JSON.stringify(p)); }

function contentEditKey(m){ return `${m.task?'writing':'p2'}:${m.id}:script`; }
function effectiveScript(m){
  const record=contentEdits[contentEditKey(m)],text=record&&typeof record==='object'?record.text:null;
  return typeof text==='string'&&text.trim()?text.trim().split(/\n\s*\n/):m.script;
}
function saveContentScript(key,fieldId){
  const area=document.getElementById(fieldId); if(!area)return;
  contentEdits=loadContentEdits();
  contentEdits[key]={text:area.value.trim(),sourceVersion:VERSION,updatedAt:new Date().toISOString()};
  localStorage.setItem(CONTENT_EDIT_KEY,JSON.stringify(contentEdits));
  const status=document.getElementById(fieldId+'-status'); if(status)status.textContent='已保存到本机 · 导出会包含此版本';
}
function resetContentScript(key){
  contentEdits=loadContentEdits(); delete contentEdits[key]; localStorage.setItem(CONTENT_EDIT_KEY,JSON.stringify(contentEdits)); renderDetail();
}
function saveP3Answer(index,questionIndex){
  const key=`p3:${index}:${questionIndex}`,area=document.getElementById(`p3-answer-${index}-${questionIndex}`); if(!area)return;
  contentEdits=loadContentEdits(); contentEdits[key]={text:area.value,sourceVersion:VERSION,updatedAt:new Date().toISOString()};
  localStorage.setItem(CONTENT_EDIT_KEY,JSON.stringify(contentEdits));
}
function resetP3Answer(index,questionIndex){
  contentEdits=loadContentEdits(); delete contentEdits[`p3:${index}:${questionIndex}`]; localStorage.setItem(CONTENT_EDIT_KEY,JSON.stringify(contentEdits)); renderDetail();
}
function ideaPadHTML(key,label='我的想法与句子'){
  const fieldId='idea-'+key.replace(/[^A-Za-z0-9_-]/g,'-'),record=ideaNotes[key],text=record&&typeof record==='object'?record.text:'',has=!!String(text||'').trim();
  return `<details class="idea-pad" ${has?'open':''}><summary><span>＋ ${esc(label)}</span><small>${has?'已保存':'自由记录'}</small></summary><div class="idea-pad-body"><textarea id="${fieldId}" placeholder="关键词、真实例子或可用句子…\n例如：provide more shared bikes\nencourage the use of electric vehicles" oninput="saveIdeaNote('${key}','${fieldId}')">${esc(text||'')}</textarea><div class="idea-pad-status" id="${fieldId}-status">${has?'已保存在本机 · 会随复习详情导出':'输入即自动保存；不改变标准答案'}</div></div></details>`;
}
function saveIdeaNote(key,fieldId){
  const area=document.getElementById(fieldId); if(!area)return;
  ideaNotes=loadIdeaNotes();
  if(area.value.trim())ideaNotes[key]={text:area.value,sourceVersion:VERSION,updatedAt:new Date().toISOString()}; else delete ideaNotes[key];
  localStorage.setItem(IDEA_NOTE_KEY,JSON.stringify(ideaNotes));
  const status=document.getElementById(fieldId+'-status'); if(status)status.textContent=area.value.trim()?'已保存在本机 · 会随复习详情导出':'输入即自动保存；不改变标准答案';
}
function contentEditorHTML(m){
  const editKey=contentEditKey(m),fieldId=`content-script-editor-${m.id}`,edited=Object.prototype.hasOwnProperty.call(contentEdits,editKey),paragraphs=effectiveScript(m);
  return `<details class="content-editor" ${edited?'open':''}><summary>修改我的背诵版本${edited?' · 已修改':''}</summary>
    <div class="hint">只保存在当前浏览器；段落之间空一行。音频仍播放标准稿，导出会包含你的修改。</div>
    <textarea id="${fieldId}" class="content-answer-text" oninput="saveContentScript('${editKey}','${fieldId}')">${esc(paragraphs.join('\n\n'))}</textarea>
    <div class="p1-edit-meta"><span id="${fieldId}-status" class="p1-save-status">${edited?'已保存到本机 · 导出会包含此版本':'当前为标准稿'}</span><button class="btn p1-reset" type="button" onclick="resetContentScript('${editKey}')" ${edited?'':'disabled'}>恢复标准稿</button></div>
  </details>`;
}

function scriptHTML(m,id){
  const s=st(id); const set=new Set(s.hl||[]),paragraphs=effectiveScript(m);
  let segs='<div class="hint" style="margin-top:8px">🎧 分段听读（每段可单独播放 / 倍速 / 循环）</div>';
  m.script.forEach((p,pi)=>{ segs+=`<div class="row seg"><span class="segn">第${pi+1}段</span>${player(aud(m.audio+'-'+(pi+1)))}</div>`; });
  const ps=paragraphs.map((para,pi)=>{ let wi=0;
    const html=esc(para).replace(/[A-Za-z0-9'’\-]+/g,(w)=>{ const k=pi+'-'+wi; wi++; const on=set.has(k)?' hl':'';
      return `<span class="w-tok${on}" ${annot?`onclick="hl('${id}','${k}',this)"`:''}>${w}</span>`; });
    return `<p>${html}</p>`; }).join('');
  return `${segs}<div class="tools">
    <button class="btn ${annot?'on':''}" onclick="toggleAnnot()">✏️ 标注关键词 ${annot?'(开)':'(关)'}</button>
    <button class="btn ghost" onclick="toggleHide()">${hide?'👁 显示原文':'🙈 隐藏原文'}</button></div>
   <div class="hint">${annot?'点单词高亮/取消,自动保存。':'复述/默写时点"隐藏原文"。'}</div>
   <div class="script ${hide?'hidden':''}">${ps}</div>${contentEditorHTML(m)}`;
}
function hl(id,k,el){ const s=st(id); const set=new Set(s.hl||[]);
  if(set.has(k)){set.delete(k);el.classList.remove('hl');}else{set.add(k);el.classList.add('hl');}
  s.hl=[...set]; save(); }
function toggleAnnot(){ annot=!annot; if(annot)hide=false; renderDetail(); }
function toggleHide(){ hide=!hide; if(hide)annot=false; renderDetail(); }

function norm(a){ return a.map(w=>w.toLowerCase().replace(/’/g,"'")); }
function toks(t){ return (t.match(/[A-Za-z0-9'’\-]+/g)||[]); }
function lcs(o,u){ const n=o.length,m=u.length; const dp=Array.from({length:n+1},()=>new Int16Array(m+1));
  for(let a=n-1;a>=0;a--)for(let b=m-1;b>=0;b--)dp[a][b]=o[a]===u[b]?dp[a+1][b+1]+1:Math.max(dp[a+1][b],dp[a][b+1]);
  const mt=new Array(n).fill(false); let a=0,b=0;
  while(a<n&&b<m){ if(o[a]===u[b]){mt[a]=true;a++;b++;} else if(dp[a+1][b]>=dp[a][b+1])a++; else b++; } return mt; }
function checkDict(id,m){ const ta=document.getElementById('dict'); st(id).dictText=ta.value; save();
  const full=m.script.join(' '); const oRaw=toks(full),oN=norm(oRaw),uN=norm(toks(ta.value));
  if(!uN.length){ document.getElementById('dictRes').innerHTML='<div class="hint">先写点东西再对照~</div>'; return; }
  const mt=lcs(oN,uN); const correct=mt.filter(Boolean).length,total=oRaw.length,missed=total-correct,extra=Math.max(0,uN.length-correct);
  let wi=0; const disp=esc(full).replace(/[A-Za-z0-9'’\-]+/g,(w)=>{ const c=mt[wi]?'':' class="miss"'; wi++; return `<span${c}>${w}</span>`; });
  document.getElementById('dictRes').innerHTML=`<div class="diff"><div class="sum">对了 <span class="g">${correct}/${total}</span> 词 · 漏或错 <span class="r">${missed}</span>${extra?` · 多写约 ${extra}`:''}</div>${disp}<div class="hint" style="margin-top:8px">红波浪=漏/错。考试用自己的话说就行。</div></div>`; }
function saveDict(id){ st(id).dictText=document.getElementById('dict').value; save(); }
function saveDiagnosis(id){ st(id).notes=document.getElementById('diagnosis').value; save(); }

function p1AnswerEditKey(topicIndex,questionIndex){ return `${topicIndex}:${questionIndex}`; }
function p1AnswerEditRecord(topicIndex,questionIndex){
  const key=p1AnswerEditKey(topicIndex,questionIndex);
  if(!Object.prototype.hasOwnProperty.call(p1AnswerEdits,key))return null;
  const value=p1AnswerEdits[key];
  if(typeof value==='string')return {answer:value,updatedAt:null};
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.answer!=='string')return null;
  const source=P1[topicIndex]&&P1[topicIndex].qa&&P1[topicIndex].qa[questionIndex];
  if(!source)return null;
  if(typeof value.topic==='string'&&value.topic!==P1[topicIndex].topic)return null;
  if(typeof value.question==='string'&&value.question!==source.q)return null;
  return value;
}
function p1AnswerValue(topicIndex,questionIndex){
  const edited=p1AnswerEditRecord(topicIndex,questionIndex);
  return edited?edited.answer:P1[topicIndex].qa[questionIndex].a;
}
function p1AnswerEditor(topicIndex,questionIndex){
  const edited=p1AnswerEditRecord(topicIndex,questionIndex);
  const value=edited?edited.answer:P1[topicIndex].qa[questionIndex].a;
  const count=wordCount(value);
  const statusId=`p1-answer-status-${topicIndex}-${questionIndex}`;
  return `<div class="p1-answer-editor${edited?' edited':''}">
    <textarea class="p1-answer-text" name="p1-answer-${topicIndex}-${questionIndex}" lang="en" autocomplete="off" aria-label="编辑 Q${questionIndex+1} 答案" aria-describedby="${statusId}" spellcheck="true" autocapitalize="sentences" autocorrect="on" oninput="saveP1Answer(${topicIndex},${questionIndex},this)">${esc(value)}</textarea>
    <div class="p1-edit-meta"><span class="p1-save-status" id="${statusId}" aria-live="polite">${edited?'已保存本机修改':'当前为题库原答案'} · ${count} 词</span><button type="button" class="btn p1-reset" onclick="restoreP1Answer(${topicIndex},${questionIndex},this)" ${edited?'':'disabled'}>恢复原答案</button></div>
  </div>`;
}
function saveP1Answer(topicIndex,questionIndex,textarea){
  const key=p1AnswerEditKey(topicIndex,questionIndex),latest=loadP1AnswerEdits();
  const editor=textarea.closest('.p1-answer-editor'),status=editor&&editor.querySelector('.p1-save-status'),reset=editor&&editor.querySelector('.p1-reset');
  const source=P1[topicIndex].qa[questionIndex],isOriginal=textarea.value===source.a;
  if(isOriginal)delete latest[key];
  else latest[key]={
    topicIndex,questionIndex,topic:P1[topicIndex].topic,topicCn:P1[topicIndex].cn,
    question:source.q,answer:textarea.value,sourceVersion:VERSION,updatedAt:new Date().toISOString()
  };
  try{
    localStorage.setItem(P1_EDIT_KEY,JSON.stringify(latest));p1AnswerEdits=latest;
    if(editor)editor.classList.toggle('edited',!isOriginal);
    if(status){status.textContent=`${isOriginal?'当前为题库原答案':'已自动保存'} · ${wordCount(textarea.value)} 词`;status.classList.remove('error');}
    if(reset)reset.disabled=isOriginal;
  }catch(_){
    p1AnswerEdits=loadP1AnswerEdits();
    if(status){status.textContent='保存失败，请先复制当前答案';status.classList.add('error');}
  }
}
function restoreP1Answer(topicIndex,questionIndex,button){
  if(!window.confirm('恢复为题库原答案？当前浏览器中的这条修改会被删除。'))return;
  const key=p1AnswerEditKey(topicIndex,questionIndex),latest=loadP1AnswerEdits();
  delete latest[key];
  try{
    localStorage.setItem(P1_EDIT_KEY,JSON.stringify(latest));p1AnswerEdits=latest;
    const editor=button.closest('.p1-answer-editor'),textarea=editor.querySelector('.p1-answer-text'),status=editor.querySelector('.p1-save-status');
    const original=P1[topicIndex].qa[questionIndex].a;
    textarea.value=original;editor.classList.remove('edited');button.disabled=true;
    status.textContent=`已恢复题库原答案 · ${wordCount(original)} 词`;status.classList.remove('error');
  }catch(_){
    p1AnswerEdits=loadP1AnswerEdits();
    const status=button.closest('.p1-answer-editor').querySelector('.p1-save-status');
    status.textContent='恢复失败，原修改仍保留';status.classList.add('error');
  }
}

function checkWriting(id,w){ const ta=document.getElementById('wcore'); st(id).coreText=ta.value; save();
  const full=w.keySentences.join(' '),oRaw=toks(full),oN=norm(oRaw),uN=norm(toks(ta.value));
  if(!uN.length){ document.getElementById('wcoreRes').innerHTML='<div class="hint">先凭记忆写核心句，再对照。</div>'; return; }
  const mt=lcs(oN,uN),correct=mt.filter(Boolean).length,total=oRaw.length,missed=total-correct;
  let wi=0; const disp=esc(full).replace(/[A-Za-z0-9'’\-]+/g,(word)=>{ const c=mt[wi]?'':' class="miss"'; wi++; return `<span${c}>${word}</span>`; });
  document.getElementById('wcoreRes').innerHTML=`<div class="diff"><div class="sum">核心句匹配 <span class="g">${correct}/${total}</span> 词 · 待修 <span class="r">${missed}</span></div>${disp}<div class="hint" style="margin-top:8px">不要求逐字复制整篇；只修会迁移到新题的核心句。</div></div>`; }
function saveWritingCore(id){ st(id).coreText=document.getElementById('wcore').value; save(); }
function saveTransfer(id){ st(id).transferText=document.getElementById('transfer').value; save(); }

function writingImageSheet(w,v,transfer=false){
  const src=asset(v.image),alt=escAttr(v.alt||v.prompt||w.prompt),instruction=esc(v.instruction||'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.');
  const prompt=esc(v.prompt||w.prompt),width=v.imageWidth||1536,height=v.imageHeight||1024;
  const heading=transfer?`<p class="transfer-kicker">${esc(v.label||'Task 1 迁移题')}</p>`:'<p class="task-time">You should spend about 20 minutes on this task.</p>';
  const minimum=transfer?'':'<p><b>Write at least 150 words.</b></p>';
  const caption=transfer?'原创迁移练习题图 · 点图可放大缩放':'原创训练题图 · 点图可放大缩放';
  return `<section class="task-sheet${transfer?' transfer-sheet':''}" aria-label="${transfer?'Task 1 transfer practice':'IELTS Academic Writing Task 1 training question'}">
    ${heading}
    <p>${prompt}</p>
    <p>${instruction}</p>
    ${minimum}
    <figure class="task-figure"><a href="${src}" target="_blank" rel="noopener" aria-label="打开并放大题图"><img src="${src}" width="${width}" height="${height}" alt="${alt}" decoding="async"></a><figcaption>${caption}</figcaption></figure>
  </section>`;
}

function writingVisual(w){ const v=w.visual; if(!v)return '';
  let fallback='';
  if(v.type==='map') fallback=`<div class="visualbox"><div class="lab">训练用文字化地图信息</div>${v.fixed?`<div class="mapfixed"><b>固定方位</b>${v.fixed.join(' · ')}</div>`:''}<div class="mapcompare"><section><b>2000</b>${v.before.map(x=>`<span>${x}</span>`).join('')}</section><section><b>现在</b>${v.after.map(x=>`<span>${x}</span>`).join('')}</section></div></div>`;
  if(!v.image)return fallback;
  return writingImageSheet(w,v,false);
}

function writingTransferVisual(w){ const v=w.transferVisual;
  if(!v||!v.image)return '';
  if(v.day&&Number(window.DAY_CONFIG.day)!==Number(v.day))return '';
  return writingImageSheet(w,v,true);
}

function writingMethodHTML(w,collapsed=false){ const m=w.method; if(!m)return '';
  const rows=(m.paragraphs||[]).map(p=>`<li><b>${esc(p.label)}</b><span>${esc(p.text)}</span></li>`).join('');
  const body=`<div class="method-body"><ol class="method-steps">${rows}</ol>${m.transfer?`<div class="method-transfer"><b>使用提醒</b><span>${esc(m.transfer)}</span></div>`:''}</div>`;
  if(collapsed)return `<details class="writing-method method-review"><summary><span><b>题型通用模板</b><small>${esc(m.title||'通用四段法')} · ${esc(m.source||'')}</small></span><i class="method-toggle" aria-hidden="true"></i></summary>${body}</details>`;
  const lead=w.task==='Task 1'?'先背通用框架，再看范文如何落地':'先看通用模板，再学范文';
  return `<section class="writing-method" aria-label="题型通用模板"><div class="method-head"><div><span>${lead}</span><strong>${esc(m.title||'通用四段法')}</strong></div><small>${esc(m.source||'')}</small></div>${body}</section>`;
}

function renderList(){
  const cfg=window.DAY_CONFIG;
  const done=ITEMS.filter(isDone).length, ov=weightedPercent(ITEMS);
  const guidance=window.DAY_CONFIG.moduleOrder?'<b>最终复习：</b>主动回答或复述 → 核对材料 → 记录弱点 → 完成一次输出。每项只打一个完成勾。':ITEMS.length===1?`<b>今天只做这一件：</b>${esc(ITEMS[0].title)}，不追加其他任务。`:'<b>顺序：</b>先完成新内容 → P1 短回答 → P2 看链复述 → 作文框架回忆 → 输出。';
  let h=`<div class="top"><a class="home" href="../">← 总复习首页</a></div>
   <div class="dayeyebrow">${esc(cfg.moduleKicker||'模块训练')} · 建议 ${cfg.minutes||90} 分钟</div><h1>${esc(cfg.displayTitle||cfg.newLabel||cfg.title)}</h1><div class="muted">${cfg.note||''}</div>
   <div class="overall"><div class="ov-top"><div class="ov-num"><b>${done}</b> / ${ITEMS.length} 完成</div><div class="muted">${cfg.moduleOrder?'本轮':'今日'} ${ov}%</div></div><div class="bar"><i style="width:${ov}%"></i></div></div>
   <div class="tierhint">${guidance}</div>`;
  ITEMS.forEach((i,x)=>{
    if(i.type==='record'){
      const scope=liveScope();
      h+=`<section class="livebar ${isDone(i)?'done':''}" onclick="open_(${x})">
        <div class="livecopy"><div class="live-kicker">${i.icon} GPT 抽问 · ${isDone(i)?'已完成':`约 ${scope.liveMinutes} 分钟`}</div><div class="live-title">${i.title}</div><div class="live-sub">${esc(scope.label)} · 随机抽题，不把整张清单问完</div></div>
        <div class="live-actions"><button class="btn primary" aria-live="polite" onclick="copyLivePrompt(this,event)">复制今日抽问提示词</button><a class="btn live-open" href="https://chatgpt.com/" target="_blank" rel="noopener" onclick="event.stopPropagation()">打开 ChatGPT ↗</a></div>
      </section>`;
      return;
    }
    h+=`<div class="card ${i.type} ${isDone(i)?'done':''}" onclick="open_(${x})"><div class="badge">${i.icon}</div>
      <div class="c-body"><div class="c-title">${i.title} <span class="t2 ${i.tier}">${i.tier==='core'?'核心':'加分'}</span></div><div class="c-sub">${i.sub}</div><div class="bar" style="height:6px"><i style="width:${Math.round(frac(i)*100)}%"></i></div></div>
      <div class="tick">${isDone(i)?'✓':Math.round(frac(i)*100)+'%'}</div></div>`;
  });
  h+=`<div class="foot">进度按模块自动保存在当前浏览器，并同步回总复习首页</div>`;
  app.innerHTML=h;
}
function open_(x){ view={name:'detail',id:x}; hide=false; annot=false; renderDetail(); scrollTo(0,0); }
function goList(){ view={name:'list'}; renderList(); scrollTo(0,0); }

function renderDetail(){
  const i=ITEMS[view.id]; const s=st(i.id);
  let h=`<button class="back" onclick="goList()">← 返回模块</button><div class="d-title">${i.icon} ${i.title}</div>`;
  if(i.m&&i.m.cue)h+=`<div class="d-cue">${i.m.cue}</div>`;
  if(i.m&&Array.isArray(i.m.cuePoints)&&i.m.cuePoints.length)h+=`<ul class="cue-points">${i.m.cuePoints.map(point=>`<li>${esc(point)}</li>`).join('')}</ul>`;
  if(i.w&&i.w.prompt&&!(i.w.visual&&i.w.visual.image))h+=`<div class="d-cue">${i.w.prompt}</div>`;
  h+=`<div class="bar"><i style="width:${Math.round(frac(i)*100)}%"></i></div>`;

  if(i.type==='memo'){ const m=i.m;
    const targets=i.targets||{read:3,recall:2,dictate:1};
    const stepLabels={read:['听读全文','边听边出声'],recall:['看关键词链复述','盖住原文'],dictate:['默写检验','可对照改错'],record:['90–120秒录音','四个cue点无遗漏']};
    h+=`<div class="row">${player(aud(m.audio))}<span class="hint">边听边读</span></div>`;
    h+=`<div class="chain"><span class="lab">关键词链(背这串)</span>${m.chain}</div>`;
    h+=ideaPadHTML(`p2:${m.id}`,'这篇P2的想法与句子');
    if(isDone(i))h+=`<div class="congrats">🎉 这篇练熟了!</div>`;
    Object.entries(targets).forEach(([k,t])=>{ const [n,sub]=stepLabels[k]||[k,'完成一次'];
      const v=s[k]||0,full=v>=t; let d=''; for(let x=0;x<t;x++)d+=`<span class="dot ${x<v?'on':''}"></span>`;
      h+=`<div class="step ${full?'full':''}"><div class="step-top"><div class="step-name">${full?'✓ ':''}${n} <span class="sub">· ${sub}</span></div><div class="dots">${d}<button class="plus" ${full?'disabled':''} onclick="inc('${i.id}','${k}',${t})">+</button></div></div></div>`; });
    if(targets.dictate)h+=`<div class="step"><div class="step-name">✍️ 默写框(自动改错)</div><div class="hint">凭记忆写,点"对照改错"。</div>
      <textarea id="dict" placeholder="在这里默写…" oninput="saveDict('${i.id}')">${s.dictText||''}</textarea>
      <div class="row"><button class="btn primary" onclick="checkDict('${i.id}',ITEMS[${view.id}].m)">对照改错</button></div><div id="dictRes"></div></div>`;
    h+=scriptHTML(m,i.id);
  }
  else if(i.type==='writingmemo'){ const w=i.w;
    const task1=w.task==='Task 1';
    h+=`<div class="row">${player(aud(w.audio))}<span class="hint">先听懂结构，不追求逐字死背</span></div>`;
    h+=`<div class="wordmeta">${w.task} · ${wordCount(w.script.join(' '))} words · 目标 6.5</div>`;
    h+=writingVisual(w);
    h+=writingMethodHTML(w);
    h+=`<div class="chain writingchain"><span class="lab">${task1?'本题信息链（看图会填，不背原句）':'段落逻辑链（先背这个）'}</span>${w.chain}</div>`;
    h+=ideaPadHTML(`writing:${w.id}`,'这篇作文的想法与句子');
    h+=`<div class="notice"><b>6.5 目标：</b>${w.note}</div>`;
    h+=`<details class="keybox"><summary>${task1?'查看要背的通用句块':'查看可迁移核心句'}</summary><ul>${w.keySentences.map(x=>`<li>${x}</li>`).join('')}</ul></details>`;
    h+=`<div class="transferq"><b>换题检查：</b>${w.transfer}</div>`;
    if(!i.finalReview){
      const writingSteps=task1?[['read','看框架并听范文','只标四段功能',2],['outline','闭卷写四段框架','具体信息现场看图填',2],['core','默写通用句块','不默写整篇',1]]:[['read','精读并听范文','标出每段功能',2],['outline','闭卷复原逻辑链','只看题目说出四段',2],['core','默写核心句','不默写整篇',1]];
      writingSteps.forEach(([k,n,sub,t])=>{ const v=s[k]||0,full=v>=t; let d=''; for(let x=0;x<t;x++)d+=`<span class="dot ${x<v?'on':''}"></span>`; h+=`<div class="step ${full?'full':''}"><div class="step-top"><div class="step-name">${full?'✓ ':''}${n} <span class="sub">· ${sub}</span></div><div class="dots">${d}<button class="plus" ${full?'disabled':''} onclick="inc('${i.id}','${k}',${t})">+</button></div></div></div>`; });
    }
    h+=scriptHTML(w,i.id);
    if(i.finalReview)h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 本轮已复习（取消）':'本轮复习完成 ✓'}</button></div>`;
  }
  else if(i.type==='review'){ const m=i.m;
    h+=`<div class="row">${player(aud(m.audio))}<span class="hint">边听边读</span></div>`;
    h+=`<div class="chain"><span class="lab">关键词链</span>${m.chain}</div><div class="hint">先盖住原文复述一遍,卡了再看。</div>`;
    h+=ideaPadHTML(`p2:${m.id}`,'这篇P2的想法与句子');
    h+=scriptHTML(m,i.id);
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已复述(取消)':'复述完了 ✓'}</button></div>`;
  }
  else if(i.type==='writingreview'){
    h+=`<div class="hint">先看题目说出结构与可用句，再展开核对。折线/柱状是已背短模板；饼图直接迁移柱状框架。真实考试仍须写到 150 词以上。</div>`;
    i.ws.forEach(w=>{
      const label=i.firstPass?'剩余新内容':w.learned?'已背模板复习':'到期范文复习';
      h+=`<div class="p1t writingrev"><div class="p1t-h">${w.task} · ${w.type} <span class="cn">${label}</span></div>
        ${w.visual&&w.visual.image?writingVisual(w):`<div class="d-cue">${w.prompt}</div>`}${writingMethodHTML(w,true)}<div class="chain"><span class="lab">结构与逻辑链</span>${w.chain}</div>
        <div class="row seg">${player(aud(w.audio))}<span class="hint">核对后再听</span></div>
        <details class="keybox"><summary>展开核心句与原文</summary><ul>${w.keySentences.map(x=>`<li>${x}</li>`).join('')}</ul><div class="script">${effectiveScript(w).map(p=>`<p>${esc(p)}</p>`).join('')}</div></details>${contentEditorHTML(w)}
        ${writingTransferVisual(w)}<div class="transferq"><b>迁移：</b>${w.transfer}</div>${ideaPadHTML(`writing:${w.id}`,'这篇作文的想法与句子')}${w.note?`<div class="hint">${w.note}</div>`:''}</div>`;
    });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 本轮已复习（取消）':'本轮复习完成 ✓'}</button></div>`;
  }
  else if(i.type==='p1review'||i.type==='p1learn'){
    const isLearning=i.type==='p1learn';
    h+=`<div class="hint">${isLearning?'新学短回答：先读题，再把每题说成“直接回答 + 一个原因或例子”；答案可以直接修改，输入即保存到当前浏览器。':'已背话题复习：全部问题都保留；答案可以直接修改，输入即保存到当前浏览器。'}</div>`;
    i.idxs.forEach(idx=>{ const t=P1[idx];
      h+=`<div class="p1t"><div class="p1t-h">📌 ${t.topic} <span class="cn">${t.cn}</span> <span class="tier">${stars(t.tier)}</span></div>
        <div class="p1-edit-intro">全部 ${i.qidxs.length} 道问题已列出 · 自由选择 · 修改会跨模块同步</div>${ideaPadHTML(`p1topic:${idx}`,'整个话题的素材')}<div class="qa">`;
      i.qidxs.forEach(questionIndex=>{ const x=t.qa[questionIndex]; h+=`<div class="q">Q${questionIndex+1} · ${x.q}</div>${p1AnswerEditor(idx,questionIndex)}${ideaPadHTML(`p1:${idx}:${questionIndex}`,'这道题的想法与句子')}`; });
      h+=`</div></div>`; });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?`✓ ${isLearning?'已学完':'已复习'}`:`${isLearning?'学完':'复习完'} ✓`}</button></div>`;
  }
  else if(i.type==='p1quick'){
    h+=`<div class="hint">快速扫题和答案；发现不自然的表达可以直接修改，输入即保存。</div>`;
    i.idxs.forEach(idx=>{ const t=P1[idx];
      h+=`<div class="p1t"><div class="p1t-h">📌 ${t.topic} <span class="cn">${t.cn}</span></div>
        ${ideaPadHTML(`p1topic:${idx}`,'整个话题的素材')}<div class="qa"><div class="q">Q1 · ${t.qa[0].q}</div>${p1AnswerEditor(idx,0)}${ideaPadHTML(`p1:${idx}:0`,'这道题的想法与句子')}</div></div>`; });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已回扫':'回扫完成 ✓'}</button></div>`;
  }
  else if(i.type==='p3'){ const t=i.t;
    h+=`<div class="hint">P3 = 观点 + <b>because</b> 理由 + <b>for example</b> 例子 + <b>that said</b> 让步。每题 30–60 秒,别背整段。</div>`;
    h+=`<div class="chain" style="background:#eff6ff;border-color:#bfdbfe"><span class="lab" style="color:#1d4ed8">词块(穿插用,别堆)</span>${t.chunks}</div>`;
    h+=ideaPadHTML(`p3topic:${i.idx}`,'这类P3的通用素材');
    h+=`<div class="row seg">${player(aud('audio-p3-'+i.idx))}<span class="hint">听示范答</span></div><div class="qa">`;
    t.qa.forEach((x,questionIndex)=>{ const key=`p3:${i.idx}:${questionIndex}`,record=contentEdits[key],edited=record&&typeof record==='object',answer=edited?record.text:x.a; h+=`<div class="q">${x.q}</div><div class="p1-answer-editor ${edited?'edited':''}"><textarea id="p3-answer-${i.idx}-${questionIndex}" class="p1-answer-text" oninput="saveP3Answer(${i.idx},${questionIndex})">${esc(answer)}</textarea><div class="p1-edit-meta"><span class="p1-save-status">${edited?'已保存到本机 · 导出会包含':'可直接修改，输入即保存'}</span><button class="btn p1-reset" type="button" onclick="resetP3Answer(${i.idx},${questionIndex})" ${edited?'':'disabled'}>恢复标准稿</button></div></div>${ideaPadHTML(`p3:${i.idx}:${questionIndex}`,'这道题的想法与句子')}`; }); h+=`</div>`;
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已练':'练完了 ✓'}</button></div>`;
  }
  else if(i.type==='refcard'){
    h+=`<div class="hint">「套用速查卡」——题库里的低频题都能套这些。考前翻,只记 <b>换题开头 + 关键词链</b>,能说 60–90 秒即可,<b>不用全背</b>。</div>`;
    i.ids.forEach(id=>{ const r=REF[id]; if(!r)return;
      h+=`<div class="p1t"><div class="p1t-h">🗂️ ${r.cn}</div>
        <div class="hint" style="margin:2px 2px 6px">套:${r.covers}</div>
        <div class="chain"><span class="lab">关键词链</span>${r.chain}</div>
        <div class="row seg">${player(aud(r.audio))}<span class="hint">听短版</span></div>
        <div class="script" style="font-size:14px;margin-top:6px">${r.short}</div>${ideaPadHTML(`ref:${r.id}`,'这张套用卡的补充素材')}</div>`; });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已过一遍':'过一遍 ✓'}</button></div>`;
  }
  else if(i.type==='output'){
    h+=`<div class="hint">完成这些可见产出后再打勾。质量标准：回应题目、结构完整、只修最影响理解的 1–2 个错误。</div><ol class="outputlist">${i.outputs.map(x=>`<li>${x}</li>`).join('')}</ol>`;
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 本轮输出完成（取消）':'完成本轮输出 ✓'}</button></div>`;
  }
  else if(i.type==='record'){
    const scope=liveScope();
    h+=`<div class="livebrief"><span>今日抽问范围</span>${esc(scope.label)}</div>
      <div class="notice"><b>用途：</b>它替代额外录音自查。先完成核心背诵，再让 ChatGPT 从今天的题池随机抽问；不会把几十道题一次问完，也不会凭空增加 Part 3。</div>
      <div class="row live-detail-actions"><button class="btn primary" aria-live="polite" onclick="copyLivePrompt(this,event)">复制今日抽问提示词</button><a class="btn live-open" href="https://chatgpt.com/" target="_blank" rel="noopener">打开 ChatGPT ↗</a></div>
      <ol class="live-steps"><li>复制提示词，打开 ChatGPT 网页或手机端的语音模式。</li><li>按今天页面设定的P1/P2/P3数量随机抽问，不额外出题。</li><li>最后只改最影响6.5的3点，并重答1题。</li></ol>
      <details class="keybox"><summary>查看 / 手动复制今日提示词</summary><pre class="liveprompt">${esc(livePrompt())}</pre></details>
      <div class="step"><div class="step-name">粘贴 GPT 的4行诊断摘要</div><div class="hint">把对话最后的“P1弱题 / P2漏cue / 3个问题 / 重答结果”粘贴到这里；7月19日晚一键导出会带上它。</div><textarea id="diagnosis" placeholder="P1弱题：…&#10;P2漏掉的cue：…&#10;最影响6.5的3点：…&#10;重答结果：…" oninput="saveDiagnosis('${i.id}')">${esc(s.notes||'')}</textarea></div>
      <details class="keybox"><summary>没有语音模式？改用普通录音自查</summary><ol class="live-steps"><li>随机挑4道P1和1篇P2并录音。</li><li>回听卡顿超过3秒、明显偏题和基础语法错误。</li><li>只修最卡的1–2句，再录一次。</li></ol></details>`;
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已完成（取消）':'抽问 / 录音练习完成 ✓'}</button></div>`;
  }
  app.innerHTML=h;
}
function inc(id,k,t){ const s=st(id); s[k]=Math.min((s[k]||0)+1,t); save(); renderDetail(); }
function toggleDone(id){ const s=st(id); s.done=!s.done; save(); renderDetail(); }
function lp(b){ const a=b.parentNode.querySelector('audio'); if(!a)return; a.loop=!a.loop; b.textContent=a.loop?'🔁 循环中':'🔁'; b.classList.toggle('on',a.loop); if(a.loop&&a.paused)a.play(); }
function spdSel(s){ const a=s.parentNode.querySelector('audio'); if(a)a.playbackRate=parseFloat(s.value); }
window.addEventListener('storage',event=>{
  if(event.key!==P1_EDIT_KEY&&event.key!==CONTENT_EDIT_KEY&&event.key!==IDEA_NOTE_KEY)return;
  p1AnswerEdits=loadP1AnswerEdits();
  contentEdits=loadContentEdits();
  ideaNotes=loadIdeaNotes();
  if(view.name==='detail'&&!(document.activeElement&&document.activeElement.matches('textarea')))renderDetail();
});
boot();
