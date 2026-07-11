/* Shared engine for daily speaking apps — data-driven from data-p1/p2/p3.json */
const VERSION='18';
const KEY='ielts_'+(window.DAY_CONFIG?('day'+window.DAY_CONFIG.day):'x')+'_v2';
let state=JSON.parse(localStorage.getItem(KEY)||'{}');
function save(){ localStorage.setItem(KEY,JSON.stringify(state)); }
function st(id){ return state[id]||(state[id]={}); }
let hide=false, annot=false, view={name:'list',id:null};
let P1=[],P3=[],P2={},REF={},ITEMS=[];
const app=document.getElementById('app');
const aud=n=>`../${n}.m4a?v=${VERSION}`;
const SPD='<select class="spd" onchange="spdSel(this)"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>';
function player(src){ return `<audio controls preload="auto" src="${src}"></audio><button class="btn loop" onclick="lp(this)">🔁</button>${SPD}`; }
function esc(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function stars(t){ return t==='A'?'★★★':t==='B'?'★★':'★'; }

async function boot(){
  const cfg=window.DAY_CONFIG;
  const [a,b,c,d]=await Promise.all([
    fetch('../data-p1.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-p2.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-p3.json?v='+VERSION).then(r=>r.json()),
    fetch('../data-ref.json?v='+VERSION).then(r=>r.json())]);
  P1=a; P3=c; b.forEach(m=>P2[m.id]=m); d.forEach(r=>REF[r.id]=r);
  ITEMS=[];
  if(cfg.newP2){ const m=P2[cfg.newP2]; ITEMS.push({type:'memo',tier:'core',id:'new_'+m.id,m,title:`母题 ${m.id} · ${m.cn}（主背·新）`,icon:'🎤',sub:'读×3 → 关键词×2 → 默写×1'}); }
  (cfg.reviewP2||[]).forEach(id=>{ const m=P2[id]; ITEMS.push({type:'review',tier:'core',id:'rev_'+id,m,title:`母题 ${id} · ${m.cn}（复习）`,icon:'🔁',sub:'看关键词链复述 + 听'}); });
  if(cfg.p1&&cfg.p1.length){ ITEMS.push({type:'p1review',tier:'core',id:'p1',idxs:cfg.p1,title:'P1 复习 · '+cfg.p1.length+' 个话题',icon:'🗣️',sub:'你的手册 · 读+听,答2-3句像聊天'}); }
  if(cfg.p1prev&&cfg.p1prev.length){ ITEMS.push({type:'p1quick',tier:'bonus',id:'p1q',idxs:cfg.p1prev,title:'P1 快速回扫 · 昨日 '+cfg.p1prev.length+' 题',icon:'🔁',sub:'只听+扫开头,防遗忘'}); }
  if(cfg.p3!=null){ const t=P3[cfg.p3]; ITEMS.push({type:'p3',tier:'bonus',id:'p3',t,idx:cfg.p3,title:'P3 · '+t.cn,icon:'💬',sub:'四步法:观点+because+例子+让步'}); }
  if(cfg.ref&&cfg.ref.length){ ITEMS.push({type:'refcard',tier:'bonus',id:'REFC',ids:cfg.ref,title:'套用速查卡 · '+cfg.ref.length+' 张',icon:'🗂️',sub:'考前翻:开头+关键词链+短版'}); }
  if(cfg.chart){ ITEMS.push({type:'chartrev',tier:'bonus',id:'CR',title:'小作文复习 · 折线图 + 柱状图',icon:'📊',sub:'读范文+听,记结构与趋势词'}); }
  ITEMS.push({type:'record',tier:'bonus',id:'REC',title:'今日母题录音自查',icon:'🎙️',sub:'录一遍 → 回放挑错(替代跟读)'});
  renderList();
}

function isDone(i){ const s=st(i.id);
  if(i.type==='memo') return (s.read||0)>=3&&(s.recall||0)>=2&&(s.dictate||0)>=1;
  return !!s.done; }
function frac(i){ const s=st(i.id);
  if(i.type==='memo') return (Math.min(s.read||0,3)+Math.min(s.recall||0,2)+Math.min(s.dictate||0,1))/6;
  return isDone(i)?1:0; }

function scriptHTML(m,id){
  const s=st(id); const set=new Set(s.hl||[]);
  let segs='<div class="hint" style="margin-top:8px">🎧 分段跟读(每段可单独播放/倍速/循环):</div>';
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

function renderList(){
  const cfg=window.DAY_CONFIG;
  const done=ITEMS.filter(isDone).length, ov=Math.round(ITEMS.reduce((a,i)=>a+frac(i),0)/ITEMS.length*100);
  let h=`<div class="top"><a class="home" href="../plan.html">🎯 总览</a><a class="home" href="../m.html">菜单</a></div>
   <h1>📍 ${cfg.title} · 今日口语</h1><div class="muted">${cfg.note||''}</div>
   <div class="overall"><div class="ov-top"><div class="ov-num"><b>${done}</b> / ${ITEMS.length} 完成</div><div class="muted">今日 ${ov}%</div></div><div class="bar"><i style="width:${ov}%"></i></div></div>
   <div class="tierhint">🔋 累了?只做 <b>核心</b>(新母题 + 复习 + P1)也不掉链子;有精力再做 <b>加分</b>。</div>`;
  ITEMS.forEach((i,x)=>{ h+=`<div class="card ${isDone(i)?'done':''}" onclick="open_(${x})"><div class="badge">${i.icon}</div>
    <div class="c-body"><div class="c-title">${i.title} <span class="t2 ${i.tier}">${i.tier==='core'?'核心':'加分'}</span></div><div class="c-sub">${i.sub}</div><div class="bar" style="height:6px"><i style="width:${Math.round(frac(i)*100)}%"></i></div></div>
    <div class="tick">${isDone(i)?'✓':Math.round(frac(i)*100)+'%'}</div></div>`; });
  h+=`<div class="foot">进度自动存本机 · 每天做完回总览打勾</div>`;
  app.innerHTML=h;
}
function open_(x){ view={name:'detail',id:x}; hide=false; annot=false; renderDetail(); scrollTo(0,0); }
function goList(){ view={name:'list'}; renderList(); scrollTo(0,0); }

function renderDetail(){
  const i=ITEMS[view.id]; const s=st(i.id);
  let h=`<button class="back" onclick="goList()">← 返回今日</button><div class="d-title">${i.icon} ${i.title}</div>`;
  if(i.m&&i.m.cue)h+=`<div class="d-cue">${i.m.cue}</div>`;
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
  else if(i.type==='review'){ const m=i.m;
    h+=`<div class="row">${player(aud(m.audio))}<span class="hint">边听边读</span></div>`;
    h+=`<div class="chain"><span class="lab">关键词链</span>${m.chain}</div><div class="hint">先盖住原文复述一遍,卡了再看。</div>`;
    h+=scriptHTML(m,i.id);
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已复述(取消)':'复述完了 ✓'}</button></div>`;
  }
  else if(i.type==='p1review'){
    h+=`<div class="hint">你自己准备的答案(手册)。每个话题:点音频听一遍 + 扫读答案。答 2–3 句、像聊天。</div>`;
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
  else if(i.type==='chartrev'){
    const CH=[{l:'📈 折线图',au:'essay-line',m:"The line graph illustrates the number of visitors to three museums in London between 2010 and 2020. Overall, it is clear that all three museums saw an increase, with the British Museum remaining the most popular throughout. In 2010, the British Museum received around 5 million visitors, and this figure rose steadily to about 6.5 million in 2020. The Science Museum, meanwhile, started at just 2 million and climbed gradually to 3.5 million, while the Natural History Museum fluctuated around 3 million before ending at roughly 4 million."},
      {l:'📊 柱状图',au:'essay-bar',m:"The bar chart compares the percentage of households with internet access in four countries — the UK, Germany, France and Italy — in 2010 and 2020. Overall, it is clear that internet access increased in all four countries over the decade, with the UK having the highest level in both years. In 2010, around 70% of UK households had internet access, and this rose to roughly 95% by 2020. Germany followed a similar pattern, climbing from about 65% to 90%. France and Italy started lower, at approximately 55% and 50% respectively, but both saw significant growth, reaching around 80% and 75% by the end of the period."}];
    h+=`<div class="hint">复习:读范文+听,记结构(改写题目 → Overview → 细节2段)和趋势/比较词。</div>`;
    CH.forEach(c=>{ h+=`<div class="script"><b style="color:#0f766e">${c.l} · 范文</b><div class="row seg">${player(aud(c.au))}<span class="hint">🐢 慢速</span></div><p style="margin-top:6px">${c.m}</p></div>`; });
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已复习':'复习完成 ✓'}</button></div>`;
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
  else if(i.type==='record'){
    h+=`<div class="hint">研究证实:自己录音+回放,是提升口语流利度最直接的方法(比跟读更贴考试)。</div>
      <ol style="font-size:14px;line-height:1.8;padding-left:20px">
      <li>用手机把<b>今天的新母题</b>(或复习母题)完整说一遍并录音。</li>
      <li>回放,只听 3 件事:① 有没有卡顿超过 3 秒 ② 有没有太长(超 2 分)③ 有没有明显中式翻译腔。</li>
      <li>只修最卡的 1–2 句,别推翻重背。</li>
      <li>再录一遍,对比是否更顺。</li></ol>`;
    h+=`<div class="row"><button class="btn ${isDone(i)?'':'primary'}" onclick="toggleDone('${i.id}')">${isDone(i)?'✓ 已录音自查':'录音自查完成 ✓'}</button></div>`;
  }
  app.innerHTML=h;
}
function inc(id,k,t){ const s=st(id); s[k]=Math.min((s[k]||0)+1,t); save(); renderDetail(); }
function toggleDone(id){ const s=st(id); s.done=!s.done; save(); renderDetail(); }
function lp(b){ const a=b.parentNode.querySelector('audio'); if(!a)return; a.loop=!a.loop; b.textContent=a.loop?'🔁 循环中':'🔁'; b.classList.toggle('on',a.loop); if(a.loop&&a.paused)a.play(); }
function spdSel(s){ const a=s.parentNode.querySelector('audio'); if(a)a.playbackRate=parseFloat(s.value); }
boot();
