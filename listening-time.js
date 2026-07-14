const VERSION='24';
const STORE_KEY='ielts_listening_time_v1';
const CATEGORIES={
  month:{label:'月份',total:12},
  weekday:{label:'星期',total:7},
  ordinal:{label:'序数词',total:21},
  date:{label:'日期',total:5},
  clock:{label:'时间',total:5}
};
const app=document.getElementById('time-app');
const audio=document.getElementById('prompt-audio');
let items=[];
let byId={};
let state=loadState();
let graded=false;

function loadState(){
  try{
    const value=JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};
    return {wrongIds:Array.isArray(value.wrongIds)?value.wrongIds:[],lastResult:value.lastResult||null,session:value.session||null};
  }catch(_){return {wrongIds:[],lastResult:null,session:null};}
}
function saveState(){localStorage.setItem(STORE_KEY,JSON.stringify(state));}
function esc(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function shuffle(values){
  const a=[...values];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function activeSession(){return state.session&&state.session.index<state.session.ids.length;}
function currentItem(){return activeSession()?byId[state.session.ids[state.session.index]]:null;}
function normalize(value){
  return String(value||'').normalize('NFKC').toLowerCase()
    .replace(/[’']/g,'')
    .replace(/a\.?m\.?/g,'am').replace(/p\.?m\.?/g,'pm')
    .replace(/(\d)\.(\d)/g,'$1:$2')
    .replace(/[-–—]/g,' ')
    .replace(/[,]/g,' ')
    .replace(/\s+/g,' ').trim();
}
function isCorrect(item,value){
  const accepted=[item.answer,...(item.aliases||[])].map(normalize);
  return accepted.includes(normalize(value));
}
function scoreFor(results){
  const values=Object.values(results||{});
  return {correct:values.filter(x=>x.correct).length,total:values.length};
}
function icon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3.5v17a1 1 0 0 1-1.62.78L7.4 16.9H4a2 2 0 0 1-2-2V9.1a2 2 0 0 1 2-2h3.4l5.48-4.38a1 1 0 0 1 1.62.78Zm3.2 3.2a1 1 0 0 1 1.42 0 7.5 7.5 0 0 1 0 10.6 1 1 0 1 1-1.42-1.42 5.5 5.5 0 0 0 0-7.76 1 1 0 0 1 0-1.42Z"/></svg>';
}

function startSession(mode='full'){
  const ids=mode==='wrong'?state.wrongIds.filter(id=>byId[id]):items.map(x=>x.id);
  if(!ids.length)return;
  state.session={mode,ids:shuffle(ids),index:0,results:{},startedAt:Date.now()};
  saveState();graded=false;renderTest();playAudio();
}
function continueSession(){graded=!!state.session.results[currentItem()?.id];renderTest();if(!graded)playAudio();}
function resetSession(){
  if(!confirm('重新开始会清除本轮进度，但保留历史错题。继续吗？'))return;
  state.session=null;saveState();renderIntro();
}

function renderIntro(){
  const hasActive=activeSession();
  const last=state.lastResult;
  const lastText=last?`上次 ${last.correct}/${last.total} · ${new Date(last.finishedAt).toLocaleDateString('zh-CN')}`:'还没有完成记录';
  app.innerHTML=`<section class="intro">
    <p class="intro-kicker">今天的听写任务</p>
    <h1>时间系列<br>50题一次过</h1>
    <p class="intro-copy">听音后直接输入答案。月份、星期和序数词要求完整拼写；日期与时间接受常见 IELTS 写法。所有题目随机出现。</p>
    <div class="coverage" aria-label="题目构成">
      <div><strong>12</strong><span>月份</span></div><div><strong>7</strong><span>星期</span></div><div><strong>21</strong><span>序数词</span></div><div><strong>5</strong><span>日期</span></div><div><strong>5</strong><span>时间</span></div>
    </div>
    <div class="intro-actions">
      <button class="primary" type="button" onclick="${hasActive?'continueSession()':'startSession()'}">${hasActive?`继续本轮 · ${state.session.index+1}/${state.session.ids.length}`:'开始 50 题'}</button>
      <button class="secondary" type="button" onclick="startSession('wrong')" ${state.wrongIds.length?'':'disabled'}>错题 ${state.wrongIds.length}</button>
    </div>
    <p class="intro-note">默认 1× 英音 · 大小写不敏感 · 每题可重复播放</p>
    <div class="last-result"><span>本机进度自动保存</span><strong>${lastText}</strong></div>
  </section>`;
}

function renderTest(){
  const item=currentItem();
  if(!item){finishSession();return;}
  const s=state.session;
  const existing=s.results[item.id];
  graded=!!existing;
  const progress=Math.round((s.index/s.ids.length)*100);
  app.innerHTML=`<section class="test">
    <div class="test-head"><div><small>${s.mode==='wrong'?'错题重练':'时间系列 50题'}</small><strong>${s.index+1} / ${s.ids.length}</strong></div><span class="test-kind">${esc(item.label)}</span></div>
    <div class="progress" aria-label="答题进度"><i style="width:${progress}%"></i></div>
    <div class="listen-panel">
      <div class="prompt-label">听音并输入答案</div>
      <button class="sound-button" id="sound-button" type="button" onclick="playAudio()" aria-label="重播本题">${icon()}</button>
      <div class="replay-note" id="audio-status">点圆形按钮可重复播放</div>
      <input class="answer-input" id="answer-input" type="text" inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="输入你听到的内容" value="${existing?esc(existing.value):''}" ${graded?'disabled':''} aria-label="听写答案">
      <div class="submit-row" id="submit-row">
        ${graded?`<button class="primary" type="button" onclick="nextQuestion()">${s.index===s.ids.length-1?'查看结果':'下一题'}</button>`:`<button class="primary" type="button" onclick="submitAnswer()">提交答案</button>`}
        <button class="ghost" type="button" onclick="resetSession()">重开</button>
      </div>
      <div id="feedback">${graded?feedbackHtml(item,existing):''}</div>
      <p class="keyboard-tip">${graded?'确认正确写法后进入下一题':'按 Enter 提交'}</p>
    </div>
  </section>`;
  const input=document.getElementById('answer-input');
  if(input&&!graded){input.focus();input.addEventListener('keydown',onInputKey);}
  if(input&&graded)input.addEventListener('keydown',onInputKey);
}

function feedbackHtml(item,result){
  if(result.correct)return `<div class="feedback good"><strong>正确 ✓</strong><code>${esc(item.answer)}</code></div>`;
  return `<div class="feedback bad"><strong>本题需要回炉</strong>你的答案：${esc(result.value||'（空白）')}<br>正确写法：<code>${esc(item.answer)}</code></div>`;
}
function onInputKey(event){
  if(event.key!=='Enter')return;
  event.preventDefault();
  if(graded)nextQuestion();else submitAnswer();
}
function submitAnswer(){
  const input=document.getElementById('answer-input');
  if(!input)return;
  const value=input.value.trim();
  if(!value){input.focus();input.classList.remove('shake');return;}
  const item=currentItem();
  const correct=isCorrect(item,value);
  state.session.results[item.id]={value,correct,category:item.category};
  const wrong=new Set(state.wrongIds);
  if(correct)wrong.delete(item.id);else wrong.add(item.id);
  state.wrongIds=[...wrong];
  saveState();graded=true;renderTest();
}
function nextQuestion(){
  state.session.index+=1;saveState();graded=false;
  if(state.session.index>=state.session.ids.length){finishSession();return;}
  renderTest();playAudio();
}
function finishSession(){
  const s=state.session;
  if(!s){renderIntro();return;}
  const score=scoreFor(s.results);
  const byCategory={};
  Object.keys(CATEGORIES).forEach(key=>byCategory[key]={correct:0,total:0});
  Object.values(s.results).forEach(result=>{byCategory[result.category].total+=1;if(result.correct)byCategory[result.category].correct+=1;});
  state.lastResult={...score,byCategory,finishedAt:Date.now(),mode:s.mode};
  state.session=null;saveState();renderResult(state.lastResult,s.results);
}
function renderResult(result,results){
  const wrong=Object.entries(results).filter(([,x])=>!x.correct).map(([id,x])=>({item:byId[id],value:x.value}));
  const lines=Object.entries(CATEGORIES).filter(([key])=>result.byCategory[key].total).map(([key,meta])=>{
    const row=result.byCategory[key];return `<div class="score-line"><span>${meta.label}</span><strong>${row.correct}/${row.total}</strong></div>`;
  }).join('');
  app.innerHTML=`<section class="result">
    <div class="result-kicker">本轮完成</div><h1>${result.correct} / ${result.total}</h1>
    <p class="result-summary">${wrong.length?`已把 ${wrong.length} 题加入错题重练。目标是同一小类连续两轮达到 95%。`:'本轮全对。今天的时间系列可以停止。'}</p>
    ${lines}
    ${wrong.length?`<ul class="wrong-list">${wrong.map(x=>`<li><b>${esc(x.item.label)}</b><span>${esc(x.item.answer)} <small>← ${esc(x.value||'空白')}</small></span></li>`).join('')}</ul>`:''}
    <div class="result-actions"><button class="primary" type="button" onclick="startSession('wrong')" ${state.wrongIds.length?'':'disabled'}>重练错题 ${state.wrongIds.length}</button><button class="secondary" type="button" onclick="startSession()">再做 50 题</button></div>
  </section>`;
}

function playAudio(){
  const item=currentItem();
  if(!item)return;
  const button=document.getElementById('sound-button');
  const status=document.getElementById('audio-status');
  audio.pause();audio.currentTime=0;audio.src=`${item.audio}.m4a?v=${VERSION}`;
  if(button)button.classList.add('playing');
  if(status)status.textContent='正在播放…';
  const p=audio.play();
  if(p&&p.catch)p.catch(()=>{if(status)status.textContent='自动播放被拦截，请点圆形按钮';if(button)button.classList.remove('playing');});
}
audio.addEventListener('ended',()=>{document.getElementById('sound-button')?.classList.remove('playing');const s=document.getElementById('audio-status');if(s)s.textContent='可重复播放';});
audio.addEventListener('error',()=>{document.getElementById('sound-button')?.classList.remove('playing');const s=document.getElementById('audio-status');if(s)s.textContent='音频载入失败，请刷新重试';});

async function boot(){
  try{
    const response=await fetch(`data-listening-time.json?v=${VERSION}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    items=await response.json();
    if(!Array.isArray(items)||items.length!==50)throw new Error('题库不是 50 题');
    items.forEach(item=>byId[item.id]=item);
    state.wrongIds=state.wrongIds.filter(id=>byId[id]);
    if(state.session){
      state.session.ids=state.session.ids.filter(id=>byId[id]);
      if(!state.session.ids.length)state.session=null;
    }
    saveState();renderIntro();
  }catch(error){
    app.innerHTML=`<div class="error-state"><strong>时间系列载入失败</strong><p>${esc(error.message)}</p><button class="secondary" onclick="location.reload()">重新加载</button></div>`;
  }
}
boot();
