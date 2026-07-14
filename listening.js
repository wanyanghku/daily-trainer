const VERSION='24';
const STORE_KEY='ielts_listening_methods_v1';
const app=document.getElementById('listening-app');
let data={answerRules:[],official:[],days:[]};
let view='home';
let selectedDay=1;
let state=loadState();

function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};
    return {doneDays:Array.isArray(raw.doneDays)?raw.doneDays:[]};
  }catch(_){return {doneDays:[]};}
}
function saveState(){localStorage.setItem(STORE_KEY,JSON.stringify(state));}
function esc(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function dayFromToday(){
  const now=new Date(),start=new Date(2026,6,14);
  const current=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.min(10,Math.max(1,Math.floor((current-start)/86400000)+1));
}
function methodFor(day){return data.days.find(item=>item.day===day);}
function dateLabel(value){
  const date=new Date(`${value}T00:00:00`);
  return `${date.getMonth()+1}月${date.getDate()}日`;
}
function goHome(){view='home';render();scrollTo(0,0);}
function openDay(day){selectedDay=day;view='detail';render();scrollTo(0,0);}
function toggleDone(){
  const done=new Set(state.doneDays);
  if(done.has(selectedDay))done.delete(selectedDay);else done.add(selectedDay);
  state.doneDays=[...done].sort((a,b)=>a-b);saveState();render();
}

function topLine(back){
  return `<div class="topline">${back?'<button class="back" type="button" onclick="goHome()">← 听力专项</button>':'<a class="back" href="./">← 10天计划</a>'}<div class="brand">LISTENING · METHOD</div></div>`;
}
function renderHome(){
  const today=methodFor(dayFromToday())||data.days[0];
  selectedDay=today.day;
  const percent=Math.round((state.doneDays.length/data.days.length)*100);
  const rows=data.days.map(method=>{
    const done=state.doneDays.includes(method.day);
    return `<button class="day-row ${done?'done':''}" type="button" onclick="openDay(${method.day})"><span class="day-no">DAY ${method.day}</span><span><strong>${esc(method.title)}</strong><small>${dateLabel(method.date)} · ${method.minutes} 分钟</small></span><span class="status">${done?'✓':'→'}</span></button>`;
  }).join('');
  app.innerHTML=`${topLine(false)}<div class="eyebrow">IELTS LISTENING · 10 DAYS</div><h1>听力专项<br>规则与题型</h1><p class="intro">每天只学一张方法卡。规则来自耕伟学长讲义，并按当前 IELTS 官方说明校准；口语和作文训练保持独立。</p>
    <section class="progress-block"><div class="progress-copy"><strong>${state.doneDays.length} / 10 已掌握</strong><span>${percent}%</span></div><div class="progress"><i style="width:${percent}%"></i></div></section>
    <section class="today"><div class="today-label">今天 · DAY ${today.day} · ${dateLabel(today.date)}</div><button class="today-card" type="button" onclick="openDay(${today.day})"><span><small>${today.minutes} 分钟方法卡</small><strong>${esc(today.title)}</strong><span>${esc(today.summary)}</span></span><i class="today-arrow">→</i></button></section>
    <a class="practice" href="listening-time.html"><span><small>DICTATION</small><strong>时间系列 50 题</strong><span>月份 · 星期 · 序数词 · 日期 · 时间</span></span><i>开始 →</i></a>
    <h2 class="section-title">10 天方法索引</h2><div class="day-list">${rows}</div>`;
}
function renderDetail(){
  const method=methodFor(selectedDay)||data.days[0];
  const rules=data.answerRules.map(rule=>`<div class="rule"><b>${esc(rule.label)}</b><span>${esc(rule.text)}</span></div>`).join('');
  const steps=method.steps.map((step,index)=>`<li><i>${index+1}</i><div><b>${esc(step.label)}</b><span>${esc(step.text)}</span></div></li>`).join('');
  const checks=method.checks.map(check=>`<li>${esc(check)}</li>`).join('');
  const sources=data.official.map(link=>`<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)} ↗</a>`).join('');
  const done=state.doneDays.includes(method.day);
  app.innerHTML=`${topLine(true)}<header class="method-head"><div class="eyebrow">DAY ${method.day} · ${dateLabel(method.date)}</div><h1>${esc(method.title)}</h1><div class="meta"><span>${method.minutes} 分钟</span><span>${esc(method.source)}</span></div></header>
    <section class="focus"><small>今天只记这一句</small><strong>${esc(method.focus)}</strong></section>
    <details class="rules" ${method.day===1?'open':''}><summary><span><b>机考答题规则</b><small>一个空几个词 · 大小写 · 空格 · 单复数 · 两分钟检查</small></span><i></i></summary><div class="rules-body">${rules}</div></details>
    <ol class="steps">${steps}</ol>
    <section class="example"><small>落笔示例</small><p>${esc(method.example.prompt)}</p><strong>${esc(method.example.answer)}</strong><span>${esc(method.example.why)}</span></section>
    <section class="check"><b>读完能做到</b><ul>${checks}</ul></section>
    <div class="actions">${method.practice?`<a class="btn" href="${esc(method.practice.href)}">${esc(method.practice.label)} →</a>`:''}<button class="btn primary" type="button" onclick="toggleDone()">${done?'✓ 已掌握（取消）':'读完并能复述 ✓'}</button></div>
    ${done?'<div class="done-note">这张卡已经计入听力专项进度。</div>':''}<div class="sources">${sources}</div>`;
}
function render(){if(view==='detail')renderDetail();else renderHome();}

async function boot(){
  try{
    const response=await fetch(`data-listening-methods.json?v=${VERSION}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    data=await response.json();
    if(!Array.isArray(data.days)||data.days.length!==10)throw new Error('方法卡不是 10 天');
    const requested=Number(new URLSearchParams(location.search).get('day'));
    if(Number.isInteger(requested)&&requested>=1&&requested<=10){selectedDay=requested;view='detail';}
    render();
  }catch(error){app.innerHTML=`<div class="loading"><b>听力方法卡载入失败</b><br>${esc(error.message)}</div>`;}
}
boot();
