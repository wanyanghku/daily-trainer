const VERSION='25';
const STORE_KEY='ielts_listening_weekend_20260718_v1';
const LEGACY_STORE_KEY='ielts_listening_methods_v1';
const app=document.getElementById('listening-app');
let data={weekend:[],answerRules:[],official:[],days:[]};
let view='home';
let selectedDay=1;
let state=loadState();

function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};
    return {
      doneTasks:Array.isArray(raw.doneTasks)?raw.doneTasks:[],
      doneMethods:Array.isArray(raw.doneMethods)?raw.doneMethods:[]
    };
  }catch(_){return {doneTasks:[],doneMethods:[]};}
}
function saveState(){localStorage.setItem(STORE_KEY,JSON.stringify(state));}
function esc(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function methodFor(day){return data.days.find(item=>item.day===day);}
function dateLabel(value){
  const date=new Date(`${value}T00:00:00`);
  return `${date.getMonth()+1}月${date.getDate()}日`;
}
function goHome(){view='home';render();scrollTo(0,0);}
function openDay(day){selectedDay=day;view='detail';render();scrollTo(0,0);}
function openRules(){view='rules';render();scrollTo(0,0);}
function toggleMethod(){
  const done=new Set(state.doneMethods);
  if(done.has(selectedDay))done.delete(selectedDay);else done.add(selectedDay);
  state.doneMethods=[...done].sort((a,b)=>a-b);saveState();render();
}
function toggleTask(id){
  const done=new Set(state.doneTasks);
  if(done.has(id))done.delete(id);else done.add(id);
  state.doneTasks=[...done];saveState();render();
}

function topLine(back){
  return `<div class="topline">${back?'<button class="back" type="button" onclick="goHome()">← 周末安排</button>':'<a class="back" href="./">← 10天计划</a>'}<div class="brand">LISTENING · WEEKEND</div></div>`;
}
function taskHtml(task){
  const done=state.doneTasks.includes(task.id);
  return `<div class="plan-task ${done?'done':''} ${task.core?'core':'optional'}">
    <button class="task-check" type="button" onclick="toggleTask('${esc(task.id)}')" aria-label="${done?'取消完成':'标记完成'}：${esc(task.title)}"><span>${done?'✓':''}</span></button>
    <div class="task-copy"><div class="task-meta">${task.core?'核心':'可选'} · ${task.minutes} 分钟</div><strong>${esc(task.title)}</strong><p>${esc(task.detail)}</p>${task.href?`<a href="${esc(task.href)}">${esc(task.action||'打开专项')} →</a>`:''}</div>
  </div>`;
}
function scheduleHtml(day){
  return `<section class="weekend-day"><header><div><small>${esc(day.label)} · ${dateLabel(day.date)}</small><h2>${esc(day.title)}</h2></div><b>${esc(day.minutes)} 分钟</b></header><div class="plan-list">${day.tasks.map(taskHtml).join('')}</div></section>`;
}
function renderHome(){
  const allTasks=data.weekend.flatMap(day=>day.tasks);
  const coreTasks=allTasks.filter(task=>task.core);
  const coreDone=coreTasks.filter(task=>state.doneTasks.includes(task.id)).length;
  const percent=Math.round((coreDone/coreTasks.length)*100);
  const rows=data.days.map(method=>{
    const done=state.doneMethods.includes(method.day);
    return `<button class="day-row ${done?'done':''}" type="button" onclick="openDay(${method.day})"><span class="day-no">技巧 ${method.day}</span><span><strong>${esc(method.title)}</strong><small>${method.minutes} 分钟 · ${esc(method.summary)}</small></span><span class="status">${done?'✓':'→'}</span></button>`;
  }).join('');
  app.innerHTML=`${topLine(false)}<div class="eyebrow">IELTS LISTENING · 7.18–7.19</div><h1>周末救援<br>听力与阅读</h1><p class="intro">旧的 Day 1–10 日期安排已经停用。这里只保留两天核心任务、答题规则与技巧速查；口语和作文训练继续独立。</p>
    <section class="progress-block"><div class="progress-copy"><strong>${coreDone} / ${coreTasks.length} 核心任务</strong><span>${percent}%</span></div><div class="progress"><i style="width:${percent}%"></i></div></section>
    <button class="rules-entry" type="button" onclick="openRules()"><span><small>考前固定口径</small><strong>机考答题规则 7 条</strong><span>字数 · 大小写 · 空格 · 拼写 · 单复数 · 最后两分钟</span></span><i>查看 →</i></button>
    ${data.weekend.map(scheduleHtml).join('')}
    <h2 class="section-title practice-title">专项训练</h2><div class="practice-grid">
      <a class="practice practice-card" href="listening-time.html"><span><small>DICTATION</small><strong>时间系列 50 题</strong><span>保留你原来的错题记录</span></span><i>开始 →</i></a>
      <a class="practice practice-card" href="listening-number.html"><span><small>NUMBERS</small><strong>数字专项 20 题</strong><span>电话 · 价格 · 数量 · 年份</span></span><i>开始 →</i></a>
    </div>
    <h2 class="section-title">答题技巧速查</h2><div class="day-list">${rows}</div>`;
}
function rulesHtml(){
  return data.answerRules.map(rule=>`<div class="rule"><b>${esc(rule.label)}</b><span>${esc(rule.text)}</span></div>`).join('');
}
function sourcesHtml(){
  return data.official.map(link=>`<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)} ↗</a>`).join('');
}
function renderRules(){
  app.innerHTML=`${topLine(true)}<header class="method-head"><div class="eyebrow">COMPUTER-DELIVERED IELTS</div><h1>机考答题规则</h1><div class="meta"><span>7 条固定口径</span><span>考前不再更换</span></div></header>
    <section class="focus"><small>最后两分钟顺序</small><strong>先补空题，再查字数、拼写、单复数和日期时间格式。</strong></section>
    <div class="rules-body standalone-rules">${rulesHtml()}</div>
    <div class="sources">${sourcesHtml()}</div>`;
}
function renderDetail(){
  const method=methodFor(selectedDay)||data.days[0];
  const steps=method.steps.map((step,index)=>`<li><i>${index+1}</i><div><b>${esc(step.label)}</b><span>${esc(step.text)}</span></div></li>`).join('');
  const checks=method.checks.map(check=>`<li>${esc(check)}</li>`).join('');
  const done=state.doneMethods.includes(method.day);
  app.innerHTML=`${topLine(true)}<header class="method-head"><div class="eyebrow">技巧 ${method.day} · ${method.minutes} 分钟</div><h1>${esc(method.title)}</h1><div class="meta"><span>${esc(method.summary)}</span><span>${esc(method.source)}</span></div></header>
    <section class="focus"><small>只记这一句</small><strong>${esc(method.focus)}</strong></section>
    <details class="rules"><summary><span><b>机考答题规则</b><small>一个空几个词 · 大小写 · 空格 · 单复数 · 两分钟检查</small></span><i></i></summary><div class="rules-body">${rulesHtml()}</div></details>
    <ol class="steps">${steps}</ol>
    <section class="example"><small>落笔示例</small><p>${esc(method.example.prompt)}</p><strong>${esc(method.example.answer)}</strong><span>${esc(method.example.why)}</span></section>
    <section class="check"><b>读完能做到</b><ul>${checks}</ul></section>
    <div class="actions">${method.practice?`<a class="btn" href="${esc(method.practice.href)}">${esc(method.practice.label)} →</a>`:''}<button class="btn primary" type="button" onclick="toggleMethod()">${done?'✓ 已复习（取消）':'读完并能复述 ✓'}</button></div>
    ${done?'<div class="done-note">这张卡已计入技巧复习记录。</div>':''}<div class="sources">${sourcesHtml()}</div>`;
}
function render(){if(view==='detail')renderDetail();else if(view==='rules')renderRules();else renderHome();}

async function boot(){
  try{
    localStorage.removeItem(LEGACY_STORE_KEY);
    const response=await fetch(`data-listening-methods.json?v=${VERSION}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    data=await response.json();
    if(!Array.isArray(data.weekend)||data.weekend.length!==2)throw new Error('周末安排不是 2 天');
    if(!Array.isArray(data.days)||data.days.length!==10)throw new Error('技巧卡不是 10 张');
    const validTasks=new Set(data.weekend.flatMap(day=>day.tasks.map(task=>task.id)));
    state.doneTasks=state.doneTasks.filter(id=>validTasks.has(id));
    state.doneMethods=state.doneMethods.filter(day=>methodFor(day));
    saveState();
    const requested=Number(new URLSearchParams(location.search).get('method'));
    if(Number.isInteger(requested)&&requested>=1&&requested<=10){selectedDay=requested;view='detail';}
    render();
  }catch(error){app.innerHTML=`<div class="loading"><b>听力周末卡载入失败</b><br>${esc(error.message)}</div>`;}
}
boot();
