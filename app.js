/* Shared engine for the 10-day IELTS sprint — speaking + writing. */
const VERSION='22';
const DAY=window.DAY_CONFIG?window.DAY_CONFIG.day:'x';
const KEY='ielts_sprint_20260712_day'+DAY+'_v1';
const PROGRESS_KEY='ielts_sprint_20260712_progress';
let state=JSON.parse(localStorage.getItem(KEY)||'{}');
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

function liveScope(){
  const cfg=window.DAY_CONFIG;
  const p1Questions=(cfg.p1||[]).slice(0,5).map(idx=>{ const t=P1[idx];
    const qa=t&&t.qa&&t.qa.length?t.qa[0]:null;
    const raw=qa?String(qa.q):(t?t.topic:'Part 1 question');
    const alternative=raw.match(/^(.+?\?)\s*\/\s*.+$/);
    const question=alternative?alternative[1]:raw;
    return {topic:t?`${t.topic}（${t.cn}）`:'Part 1',question};
  });
  const p2id=cfg.newP2||((cfg.reviewP2||[])[0]);
  const p2=p2id?P2[p2id]:null;
  const p3=cfg.p3!=null?P3[cfg.p3]:null;
  const label=`P1 ${p1Questions.length}题 · P2 ${p2id||'今日复习题'} · P3 ${p3?p3.cn:'今日主题'}`;
  return {cfg,p1Questions,p2id,p2,p3,label};
}

function livePrompt(){
  const x=liveScope();
  const p1=x.p1Questions.map((q,n)=>`${n+1}. ${q.question}`).join('\n');
  const p3=x.p3&&x.p3.qa?x.p3.qa.slice(0,3).map((q,n)=>`${n+1}. ${q.q}`).join('\n'):'1. Ask one relevant Part 3 question.\n2. Ask a second relevant question.\n3. Ask a third relevant question.';
  const p2=x.p2?x.p2.cue:'Choose one Part 2 topic from today’s review.';
  return `你是大陆雅思口语考官。我的目标是6.5。这是一场10–12分钟的模拟考，不是教学课。\n\n今天是 Day ${x.cfg.day}，只使用以下题目：\n\nPart 1（逐题问，问完等我回答）：\n${p1}\n\nPart 2：\n${p2}\n\nPart 3（逐题问）：\n${p3}\n\n规则：\n1. 全程用英语提问，不要先给示范答案。\n2. Part 1 每次只问一题，等我回答后再继续。\n3. Part 2 给我1分钟准备；我开始后目标回答2分钟。期间保持安静，即使我停顿也不要接话，直到我说 Done；不要声称计时绝对精确。\n4. Part 3 只问上面列出的3题，一次一题，不要生成新题。\n5. 全部结束后，用简短中文正好反馈最影响6.5的3点，覆盖流利度、词汇、语法或发音；每点给最小修改。然后从刚才的问题中选最弱的1题让我重答。不要承诺精确分数。\n6. 不要增加新背诵材料，不要重写我的整段答案，也不要提供完整范文。\n\n现在只说：Let's begin with Part 1.`;
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
    window.prompt('复制下面的提示词，再粘贴到 ChatGPT Live：',text);
    btn.textContent='请手动复制'; setTimeout(()=>{btn.textContent=base;},1800);
  }
}

async function boot(){
  const cfg=window.DAY_CONFIG;
  const [a,b,c,d,e]=await Promise.all([
    fetch('../data-p1.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-p2.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-p3.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-ref.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-writing.json?v='+VERSION).then(r=>r.json())]);
  P1=a; P3=c; b.forEach(m=>P2[m.id]=m); d.forEach(r=>REF[r.id]=r); e.forEach(w=>WRITING[w.id]=w);
  ITEMS=[];
  if((cfg.newP2?1:0)+(cfg.newWriting?1:0)!==1) throw new Error('Each sprint day must have exactly one new item');
  if(cfg.newP2){ const m=P2[cfg.newP2]; ITEMS.push({type:'memo',tier:'core',id:'new_'+m.id,m,title:`今日唯一新内容 · 母题 ${m.id} ${m.cn}`,icon:'🎤',sub:'朗读×3 → 关键词复述×2 → 默写检验×1'}); }
  if(cfg.newWriting){ const w=WRITING[cfg.newWriting]; ITEMS.push({type:'writingmemo',tier:'core',id:'wnew_'+w.id,w,title:`今日唯一新内容 · ${w.task} ${w.type} · ${w.cn}`,icon:'✍️',sub:'范文学习 → 闭卷逻辑链 → 核心句 → 换题仿写'}); }
  (cfg.reviewP2||[]).forEach(id=>{ const m=P2[id]; ITEMS.push({type:'review',tier:'core',id:'rev_'+id,m,title:`母题 ${id} · ${m.cn}（复习）`,icon:'🔁',sub:'看关键词链复述 + 听'}); });
  if(cfg.reviewWriting&&cfg.reviewWriting.length){ const ws=cfg.reviewWriting.map(id=>WRITING[id]).filter(Boolean); ITEMS.push({type:'writingreview',tier:'core',id:'wrev',ws,title:`写作到期复习 · ${ws.length} 张`,icon:'↺',sub:'不看原文先复原结构，再核核心句'}); }
  if(cfg.p1&&cfg.p1.length){ ITEMS.push({type:'p1review',tier:'core',id:'p1',idxs:cfg.p1,title:'P1 复习/口答 · '+cfg.p1.length+' 个话题',icon:'🗣️',sub:'3 个 A 级间隔复习 + 2 个 B/C 级口答，不背全文'}); }
  if(cfg.p1prev&&cfg.p1prev.length){ ITEMS.push({type:'p1quick',tier:'bonus',id:'p1q',idxs:cfg.p1prev,title:'P1 快速回扫 · 昨日 '+cfg.p1prev.length+' 题',icon:'🔁',sub:'只听+扫开头,防遗忘'}); }
  if(cfg.p3!=null){ const t=P3[cfg.p3]; ITEMS.push({type:'p3',tier:'bonus',id:'p3',t,idx:cfg.p3,title:'P3 · '+t.cn,icon:'💬',sub:'四步法:观点+because+例子+让步'}); }
  if(cfg.ref&&cfg.ref.length){ ITEMS.push({type:'refcard',tier:'bonus',id:'REFC',ids:cfg.ref,title:'套用速查卡 · '+cfg.ref.length+' 张',icon:'🗂️',sub:'考前翻:开头+关键词链+短版'}); }
  if(cfg.outputs&&cfg.outputs.length){ ITEMS.push({type:'output',tier:'core',id:'OUT',outputs:cfg.outputs,title:'今日输出验收',icon:'✓',sub:'完成可见产出，避免只看不练'}); }
  ITEMS.push({type:'record',tier:'bonus',id:'REC',title:'Live 模拟考 / 录音自查',icon:'🎙️',sub:'复制今日题单 → 练 10–12 分钟；没有 Live 就录音回听'});
  syncProgress();
  renderList();
}

function isDone(i){ const s=st(i.id);
  if(i.type==='memo') return (s.read||0)>=3&&(s.recall||0)>=2&&(s.dictate||0)>=1;
  if(i.type==='writingmemo') return (s.read||0)>=2&&(s.outline||0)>=2&&(s.core||0)>=1&&(s.transfer||0)>=1;
  return !!s.done; }
function frac(i){ const s=st(i.id);
  if(i.type==='memo') return (Math.min(s.read||0,3)+Math.min(s.recall||0,2)+Math.min(s.dictate||0,1))/6;
  if(i.type==='writingmemo') return (Math.min(s.read||0,2)+Math.min(s.outline||0,2)+Math.min(s.core||0,1)+Math.min(s.transfer||0,1))/6;
  return isDone(i)?1:0; }

function progressPercent(){ const core=ITEMS.filter(i=>i.tier==='core'); return core.length?Math.round(core.reduce((a,i)=>a+frac(i),0)/core.length*100):0; }
function syncProgress(){ if(!ITEMS.length||DAY==='x')return; const p=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}'); p[DAY]=progressPercent(); localStorage.setItem(PROGRESS_KEY,JSON.stringify(p)); }

function scriptHTML(m,id){
  const s=st(id); const set=new Set(s.hl||[]);
  let segs='<div class="hint" style="margin-top:8px">🎧 分段听读（每段可单独播放 / 倍速 / 循环）</div>';
  m.script.forEach((p,pi)=>{ segs+=`<div class="row seg"><span class="segn">第${pi+1}段</span>${player(aud(m.audio+'-'+(pi+1)))}</div>`; });
  const ps=m.script.map((para,pi)=>{ let wi=0;
    const html=esc(para).replace(/[A-Za-z0-9'’\-]+/g,(w)=>{ const k=pi+'-'+wi; wi++; const on=set.has(k)?' hl':'';
      return `<span class="w-tok${on}" ${annot?`onclick="hl('${id}','${k}',this)"`:''}>${w}</span>`; });
    return `<p>${html}</p>`; }).join('');
  return `${segs}<div class="tools">
    <button class="btn ${annot?'on':''}" onclick="toggleAnnot()">✏️ 标注关键词 ${annot?'(开)':'(关)'}</button>
    <button class="btn ghost" onclick="toggleHide()">${hide?'👁 显示原文':'🙈 隐藏原文'}</button></div>
   <div class="hint">${annot?'点单词高亮/取消,自动保存。':'复述/默写时点"隐藏原文"。'}</div>
   <div class="script ${hide?'hidden':''}">${ps}</div>`;
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

function checkWriting(id,w){ const ta=document.getElementById('wcore'); st(id).coreText=ta.value; save();
  const full=w.keySentences.join(' '),oRaw=toks(full),oN=norm(oRaw),uN=norm(toks(ta.value));
  if(!uN.length){ document.getElementById('wcoreRes').innerHTML='<div class="hint">先凭记忆写核心句，再对照。</div>'; return; }
  const mt=lcs(oN,uN),correct=mt.filter(Boolean).length,total=oRaw.length,missed=total-correct;
  let wi=0; const disp=esc(full).replace(/[A-Za-z0-9'’\-]+/g,(word)=>{ const c=mt[wi]?'':' class="miss"'; wi++; return `<span${c}>${word}</span>`; });
  document.getElementById('wcoreRes').innerHTML=`<div class="diff"><div class="sum">核心句匹配 <span class="g">${correct}/${total}</span> 词 · 待修 <span class="r">${missed}</span></div>${disp}<div class="hint" style="margin-top:8px">不要求逐字复制整篇；只修会迁移到新题的核心句。</div></div>`; }
function saveWritingCore(id){ st(id).coreText=document.getElementById('wcore').value; save(); }
function saveTransfer(id){ st(id).transferText=document.getElementById('transfer').value; save(); }

function writingVisual(w){ const v=w.visual; if(!v)return '';
  let fallback='';
  if(v.type==='process') fallback=`<div class="visualbox"><div class="lab">中文流程核对 · 先看题图作答，卡住再展开</div><div class="processflow">${v.steps.map((x,n)=>`<div class="processstep"><b>${n+1}</b><span>${x}</span></div>`).join('<i>→</i>')}</div></div>`;
  if(v.type==='map') fallback=`<div class="visualbox"><div class="lab">训练用文字化地图信息</div>${v.fixed?`<div class="mapfixed"><b>固定方位</b>${v.fixed.join(' · ')}</div>`:''}<div class="mapcompare"><section><b>2000</b>${v.before.map(x=>`<span>${x}</span>`).join('')}</section><section><b>现在</b>${v.after.map(x=>`<span>${x}</span>`).join('')}</section></div></div>`;
  if(!v.image)return fallback;
  const src=asset(v.image),alt=escAttr(v.alt||w.prompt),instruction=esc(v.instruction||'Summarise the information by selecting and reporting the main features.');
  const sheet=`<section class="task-sheet" aria-label="IELTS Academic Writing Task 1 training question">
    <p class="task-time">You should spend about 20 minutes on this task.</p>
    <p>${esc(w.prompt)}</p>
    <p>${instruction}</p>
    <p><b>Write at least 150 words.</b></p>
    <figure class="task-figure"><a href="${src}" target="_blank" rel="noopener" aria-label="打开并放大流程图"><img src="${src}" width="${v.imageWidth||1536}" height="${v.imageHeight||1024}" alt="${alt}" decoding="async"></a><figcaption>原创训练题图 · 点图可放大缩放</figcaption></figure>
  </section>`;
  return sheet+(fallback?`<details class="visual-fallback"><summary>卡住时查看中文流程步骤</summary>${fallback}</details>`:'');
}

function renderList(){
  const cfg=window.DAY_CONFIG;
  const done=ITEMS.filter(isDone).length, ov=Math.round(ITEMS.reduce((a,i)=>a+frac(i),0)/ITEMS.length*100);
  let h=`<div class="top"><a class="home" href="../">← 10 天冲刺</a></div>
   <div class="dayeyebrow">${cfg.date||''} · 建议 ${cfg.minutes||90} 分钟</div><h1>${cfg.title} · 今日冲刺</h1><div class="muted">${cfg.note||''}</div>
   <div class="overall"><div class="ov-top"><div class="ov-num"><b>${done}</b> / ${ITEMS.length} 完成</div><div class="muted">今日 ${ov}%</div></div><div class="bar"><i style="width:${ov}%"></i></div></div>
   <div class="tierhint"><b>先做核心：</b>今日唯一新内容 → 到期复习 → P1 → 输出；P3 / Live 按精力完成。</div>`;
  ITEMS.forEach((i,x)=>{
    if(i.type==='record'){
      const scope=liveScope();
      h+=`<section class="livebar ${isDone(i)?'done':''}" onclick="open_(${x})">
        <div class="livecopy"><div class="live-kicker">${i.icon} LIVE · ${isDone(i)?'已完成':'10–12 分钟'}</div><div class="live-title">${i.title}</div><div class="live-sub">${esc(scope.label)} · 替代额外录音，不增加时长</div></div>
        <div class="live-actions"><button class="btn primary" aria-live="polite" onclick="copyLivePrompt(this,event)">复制 Live 提示词</button><a class="btn live-open" href="https://chatgpt.com/" target="_blank" rel="noopener" onclick="event.stopPropagation()">打开 ChatGPT ↗</a></div>
      </section>`;
      return;
    }
    h+=`<div class="card ${i.type} ${isDone(i)?'done':''}" onclick="open_(${x})"><div class="badge">${i.icon}</div>
      <div class="c-body"><div class="c-title">${i.title} <span class="t2 ${i.tier}">${i.tier==='core'?'核心':'加分'}</span></div><div class="c-sub">${i.sub}</div><div class="bar" style="height:6px"><i style="width:${Math.round(frac(i)*100)}%"></i></div></div>
      <div class="tick">${isDone(i)?'✓':Math.round(frac(i)*100)+'%'}</div></div>`;
  });
  h+=`<div class="foot">进度自动存手机浏览器，并同步回 10 天首页</div>`;
  app.innerHTML=h;
}
function open_(x){ view={name:'detail',id:x}; hide=false; annot=false; renderDetail(); scrollTo(0,0); }
function goList(){ view={name:'list'}; renderList(); scrollTo(0,0); }

function renderDetail(){
  const i=ITEMS[view.id]; const s=st(i.id);
  let h=`<button class="back" onclick="goList()">← 返回今日</button><div class="d-title">${i.icon} ${i.title}</div>`;
  if(i.m&&i.m.cue)h+=`<div class="d-cue">${i.m.cue}</div>`;
  if(i.w&&i.w.prompt&&!(i.w.visual&&i.w.visual.image))h+=`<div class="d-cue">${i.w.prompt}</div>`;
  h+=`<div class="bar"><i style="width:${Math.round(frac(i)*100)}%"></i></div>`;

  if(i.type==='memo'){ const m=i.m;
    h+=`<div class="row">${player(aud(m.audio))}<span class="hint">边听边读</span></div>`;
    h+=`<div class="chain"><span class="lab">关键词链(背这串)</span>${m.chain}</div>`;
    if(isDone(i))h+=`<div class="congrats">🎉 这篇练熟了!</div>`;
    [['read','朗读全文','出声读',3],['recall','看关键词链复述','盖住原文',2],['dictate','默写检验','写完点+',1]].forEach(([k,n,sub,t])=>{
      const v=s[k]||0,full=v>=t; let d=''; for(let x=0;x<t;x++)d+=`<span class="dot ${x<v?'on':''}"></span>`;
      h+=`<div class="step ${full?'full':''}"><div class="step-top"><div class="step-name">${full?'✓ ':''}${n} <span class="sub">· ${sub}</span></div><div class="dots">${d}<button class="plus" ${full?'disabled':''} onclick="inc('${i.id}','${k}',${t})">+</button></div></div></div>`; });
    h+=`<div class="step"><div class="step-name">✍️ 默写框(自动改错)</div><div class="hint">凭记忆写,点"对照改错"。</div>
      <textarea id="dict" placeholder="在这里默写…" oninput="saveDict('${i.id}')">${s.dictText||''}</textarea>
      <div class="row"><button class="btn primary" onclick="checkDict('${i.id}',ITEMS[${view.id}].m)">对照改错</button></div><div id="dictRes"></div></div>`;
    h+=scriptHTML(m,i.id);
  }
  else if(i.type==='writingmemo'){ const w=i.w;
    h+=`<div class="row">${player(aud(w.audio))}<span class="hint">先听懂结构，不追求逐字死背</span></div>`;
    h+=`<div class="wordmeta">${w.task} · ${wordCount(w.script.join(' '))} words · 目标 6.5</div>`;
    h+=writingVisual(w);
    h+=`<div class="chain writingchain"><span class="lab">段落逻辑链（先背这个）</span>${w.chain}</div>`;
    h+=`<div class="notice"><b>6.5 目标：</b>${w.note}</div>`;
    [['read','精读并听范文','标出每段功能',2],['outline','闭卷复原逻辑链','只看题目说出四段',2],['core','默写核心句','不默写整篇',1]].forEach(([k,n,sub,t])=>{
      const v=s[k]||0,full=v>=t; let d=''; for(let x=0;x<t;x++)d+=`<span class="dot ${x<v?'on':''}"></span>`;
      h+=`<div class="step ${full?'full':''}"><div class="step-top"><div class="step-name">${full?'✓ ':''}${n} <span class="sub">· ${sub}</span></div><div class="dots">${d}<button class="plus" ${full?'disabled':''} onclick="inc('${i.id}','${k}',${t})">+</button></div></div></div>`;
    });
    h+=`<div class="step"><div class="step-name">核心句检验</div><div class="hint">凭记忆写 3–5 句，再点对照；允许同义表达。</div>
      <textarea id="wcore" placeholder="在这里写核心句…" oninput="saveWritingCore('${i.id}')">${s.coreText||''}</textarea>
      <div class="row"><button class="btn primary" onclick="checkWriting('${i.id}',ITEMS[${view.id}].w)">对照核心句</button></div><div id="wcoreRes"></div></div>`;
    h+=`<details class="keybox"><summary>查看可迁移核心句</summary><ul>${w.keySentences.map(x=>`<li>${x}</li>`).join('')}</ul></details>`;
    const transferDone=(s.transfer||0)>=1;
    h+=`<div class="step ${transferDone?'full':''}"><div class="step-name">${transferDone?'✓ ':''}换题仿写 <span class="sub">· 当天完成迁移</span></div><div class="transferq">${w.transfer}</div>
      <textarea id="transfer" placeholder="先列提纲；Task 2 写一个主体段，Task 1 写 Overview + 一个细节段…" oninput="saveTransfer('${i.id}')">${s.transferText||''}</textarea>
      <div class="row"><button class="btn ${transferDone?'':'primary'}" onclick="inc('${i.id}','transfer',1)">${transferDone?'✓ 已完成':'完成仿写 ✓'}</button></div></div>`;
    h+=scriptHTML(w,i.id);
  }
  else if(i.type==='review'){ const m=i.m;
    h+=`<div class="row">${player(aud(m.audio))}<span class="hint">边听边读</span></div>`;
    h+=`<div class="chain"><span class="lab">关键词链</span>${m.chain}</div><div class="hint">先盖住原文复述一遍,卡了再看。</div>`;
    h+=scriptHTML(m,i.id);
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已复述(取消)':'复述完了 ✓'}</button></div>`;
  }
  else if(i.type==='writingreview'){
    h+=`<div class="hint">主动回忆（retrieval）：先只看题目说出结构，再展开查看。折线/柱状是已背短模板，真实考试仍须写到 150 词以上。</div>`;
    i.ws.forEach(w=>{
      const label=w.learned?'已背模板复习':'到期范文复习';
      h+=`<div class="p1t writingrev"><div class="p1t-h">${w.task} · ${w.type} <span class="cn">${label}</span></div>
        ${w.visual&&w.visual.image?writingVisual(w):`<div class="d-cue">${w.prompt}</div>`}<div class="chain"><span class="lab">闭卷复原</span>${w.chain}</div>
        <div class="row seg">${player(aud(w.audio))}<span class="hint">核对后再听</span></div>
        <details class="keybox"><summary>展开核心句与原文</summary><ul>${w.keySentences.map(x=>`<li>${x}</li>`).join('')}</ul><div class="script">${w.script.map(p=>`<p>${p}</p>`).join('')}</div></details>
        <div class="transferq"><b>迁移：</b>${w.transfer}</div>${w.note?`<div class="hint">${w.note}</div>`:''}</div>`;
    });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已闭卷复原':'复习完成 ✓'}</button></div>`;
  }
  else if(i.type==='p1review'){
    h+=`<div class="hint">A 级是已背重点，先不看答案口答；B/C 级只练 2–3 句自然回答，不占“今日唯一新内容”。</div>`;
    i.idxs.forEach(idx=>{ const t=P1[idx];
      h+=`<div class="p1t"><div class="p1t-h">📌 ${t.topic} <span class="cn">${t.cn}</span> <span class="tier">${stars(t.tier)}</span></div>
        <div class="row seg">${player(aud('audio-p1-'+idx))}</div><div class="qa">`;
      t.qa.forEach(x=>{ h+=`<div class="q">${x.q}</div><div class="a">${x.a}</div>`; });
      h+=`</div></div>`; });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已过一遍':'都过了 ✓'}</button></div>`;
  }
  else if(i.type==='p1quick'){
    h+=`<div class="hint">昨天学过的 P1,快速听一遍 + 扫一眼开头,防遗忘。想不起来的回昨天的卡再看。</div>`;
    i.idxs.forEach(idx=>{ const t=P1[idx];
      h+=`<div class="p1t"><div class="p1t-h">📌 ${t.topic} <span class="cn">${t.cn}</span></div>
        <div class="row seg">${player(aud('audio-p1-'+idx))}</div>
        <div class="qa"><div class="a">${t.qa[0].a}</div></div></div>`; });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已回扫':'回扫完成 ✓'}</button></div>`;
  }
  else if(i.type==='p3'){ const t=i.t;
    h+=`<div class="hint">P3 = 观点 + <b>because</b> 理由 + <b>for example</b> 例子 + <b>that said</b> 让步。每题 30–60 秒,别背整段。</div>`;
    h+=`<div class="chain" style="background:#eff6ff;border-color:#bfdbfe"><span class="lab" style="color:#1d4ed8">词块(穿插用,别堆)</span>${t.chunks}</div>`;
    h+=`<div class="row seg">${player(aud('audio-p3-'+i.idx))}<span class="hint">听示范答</span></div><div class="qa">`;
    t.qa.forEach(x=>{ h+=`<div class="q">${x.q}</div><div class="a">${x.a}</div>`; }); h+=`</div>`;
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已练':'练完了 ✓'}</button></div>`;
  }
  else if(i.type==='refcard'){
    h+=`<div class="hint">「套用速查卡」——题库里的低频题都能套这些。考前翻,只记 <b>换题开头 + 关键词链</b>,能说 60–90 秒即可,<b>不用全背</b>。</div>`;
    i.ids.forEach(id=>{ const r=REF[id]; if(!r)return;
      h+=`<div class="p1t"><div class="p1t-h">🗂️ ${r.cn}</div>
        <div class="hint" style="margin:2px 2px 6px">套:${r.covers}</div>
        <div class="chain"><span class="lab">关键词链</span>${r.chain}</div>
        <div class="row seg">${player(aud(r.audio))}<span class="hint">听短版</span></div>
        <div class="script" style="font-size:14px;margin-top:6px">${r.short}</div></div>`; });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已过一遍':'过一遍 ✓'}</button></div>`;
  }
  else if(i.type==='output'){
    h+=`<div class="hint">完成这些可见产出后再打勾。质量标准：回应题目、结构完整、只修最影响理解的 1–2 个错误。</div><ol class="outputlist">${i.outputs.map(x=>`<li>${x}</li>`).join('')}</ol>`;
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 今日输出完成':'完成输出 ✓'}</button></div>`;
  }
  else if(i.type==='record'){
    const scope=liveScope();
    h+=`<div class="livebrief"><span>今日模拟范围</span>${esc(scope.label)}</div>
      <div class="notice"><b>用途：</b>它替代今天的额外录音自查。先完成核心背诵，再用 Live 做 10–12 分钟真实输出；不要让它增加新范文。</div>
      <div class="row live-detail-actions"><button class="btn primary" aria-live="polite" onclick="copyLivePrompt(this,event)">复制今日 Live 模拟考提示词</button><a class="btn live-open" href="https://chatgpt.com/" target="_blank" rel="noopener">打开 ChatGPT ↗</a></div>
      <ol class="live-steps"><li>复制提示词，打开 ChatGPT 网页或手机端的 Voice → Live。</li><li>粘贴后直接开始；Part 2 停顿时让它保持安静，直到你说 Done。</li><li>最后只改最影响 6.5 的 3 点，并重答 1 题。</li></ol>
      <details class="keybox"><summary>查看 / 手动复制今日提示词</summary><pre class="liveprompt">${esc(livePrompt())}</pre></details>
      <details class="keybox"><summary>没有 Live？改用普通录音自查</summary><ol class="live-steps"><li>把今天的 P2 完整说一遍并录音。</li><li>回听卡顿超过 3 秒、超 2 分钟和明显翻译腔。</li><li>只修最卡的 1–2 句，再录一次。</li></ol></details>`;
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已完成（取消）':'Live / 录音练习完成 ✓'}</button></div>`;
  }
  app.innerHTML=h;
}
function inc(id,k,t){ const s=st(id); s[k]=Math.min((s[k]||0)+1,t); save(); renderDetail(); }
function toggleDone(id){ const s=st(id); s.done=!s.done; save(); renderDetail(); }
function lp(b){ const a=b.parentNode.querySelector('audio'); if(!a)return; a.loop=!a.loop; b.textContent=a.loop?'🔁 循环中':'🔁'; b.classList.toggle('on',a.loop); if(a.loop&&a.paused)a.play(); }
function spdSel(s){ const a=s.parentNode.querySelector('audio'); if(a)a.playbackRate=parseFloat(s.value); }
boot();
