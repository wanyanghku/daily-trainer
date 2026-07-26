const VERSION='44';
const STATE_KEY='english_lab_cycle_v1';
let days=[];
let activeIndex=0;
let state=loadState();

function todayISO(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function loadState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch(_){return {};}
}
function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(state));}
function esc(value){
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function dayState(id){
  state.days=state.days||{};
  return state.days[id]||(state.days[id]={chunks:[],listening:false,output:false,notes:''});
}
function defaultIndex(){
  if(!state.startDate){state.startDate=todayISO();saveState();}
  const start=new Date(`${state.startDate}T00:00:00`);
  const now=new Date(`${todayISO()}T00:00:00`);
  return Math.max(0,Math.floor((now-start)/86400000))%7;
}
function selectedIndex(){
  const requested=Number(new URLSearchParams(location.search).get('day'));
  return Number.isInteger(requested)&&requested>=1&&requested<=7?requested-1:defaultIndex();
}
function progress(record){
  const chunkCount=new Set(record.chunks||[]).size;
  const completed=chunkCount+(record.listening?1:0)+(record.output?1:0);
  return {completed,total:7,percent:Math.round(completed/7*100)};
}
function fullDayDone(id){return progress(dayState(id)).completed===7;}
function chunkHTML(item,index,record){
  const checked=(record.chunks||[]).includes(index);
  return `<label class="chunk" data-chunk="${index}">
    <input class="chunk-check" type="checkbox" data-chunk-check="${index}" ${checked?'checked':''} aria-label="已能脱口说出：${esc(item.en)}">
    <span><strong class="chunk-en">${esc(item.en)}</strong><span class="chunk-zh">${esc(item.zh)}</span><span class="chunk-use">${esc(item.use)}</span></span>
    <button class="speak" type="button" data-speak="${esc(item.en)}" aria-label="播放词块">▶</button>
  </label>`;
}
function gptPrompt(day){
  return `You are my English conversation and academic speaking partner. My goal is to communicate fluently with international colleagues, give clear academic presentations, and understand lectures. Today I am practising: ${day.focus}.

Target chunks:
${day.chunks.map((item,index)=>`${index+1}. ${item.en}`).join('\n')}

Output task:
${day.output.prompt}

Run the practice in English:
1. Give me the situation and ask one question at a time.
2. Do not provide a model answer before I speak.
3. Let me finish even if I pause.
4. Ask natural follow-up questions and make me use the target chunks.
5. After the task, identify only three problems that most affect clarity or fluency.
6. Give minimal corrections, then ask me to record the whole answer one more time.
7. Compare the second attempt with the first and tell me whether the three problems improved.
Do not turn this into an IELTS test.`;
}
function render(){
  activeIndex=selectedIndex();
  const day=days[activeIndex],record=dayState(day.id),p=progress(record);
  const date=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'short'}).format(new Date());
  document.title=`English Lab · ${day.focus}`;
  document.getElementById('app').innerHTML=`
    <header class="topline"><a class="brand" href="./">English Lab</a><a class="archive-link" href="#archive">旧雅思材料 ↓</a></header>
    <section class="hero">
      <div class="eyebrow">REAL COMMUNICATION · ACADEMIC ENGLISH</div>
      <h1>今日英语<br>训练实验室</h1>
      <p>每天背5个可调用词块，完成一段可核对的听力，再把输入转成真实表达。</p>
      <div class="hero-meta"><i></i><span>${esc(date)} · ${esc(day.type)} · 45–60分钟</span></div>
    </section>
    <nav class="week-nav" aria-label="七天训练循环">
      ${days.map((item,index)=>`<a class="day-tab ${index===activeIndex?'current':''} ${fullDayDone(item.id)?'done':''}" href="?day=${index+1}"><span>D${index+1}</span><strong>${fullDayDone(item.id)?'✓':index+1}</strong></a>`).join('')}
    </nav>
    <section class="progress-zone">
      <div><div class="eyebrow">${esc(day.label)} · ${esc(day.type)}</div><h2>${esc(day.focus)}</h2><p>${esc(day.goal)}</p><div class="daily-brief"><p><strong>PhD 节点</strong>${esc(day.anchor)}</p><p><strong>旧词块复习</strong>${esc(day.review)}</p></div><div class="track"><i style="width:${p.percent}%"></i></div></div>
      <div class="progress-number"><strong>${p.completed}/7</strong><span>今日完成</span></div>
    </section>
    <section class="section" id="chunks">
      <header class="section-head"><span class="section-no">01</span><div><h2>复习旧词块，再练5个新词块</h2></div><button class="minor-button" id="recall-toggle" type="button">闭卷模式</button><p>先完成上方8分钟复习，再做跟读与关键词替换；不背整段。</p></header>
      <div class="chunks">${day.chunks.map((item,index)=>chunkHTML(item,index,record)).join('')}</div>
    </section>
    <section class="section" id="listening">
      <header class="section-head"><span class="section-no">02</span><div><h2>听力输入</h2></div><span></span><p>受控短听力负责精听与跟读，真实讲座负责适应自然语速。</p></header>
      <div class="listening-block">
        <div class="listening-label">Controlled input · 约2分钟</div>
        <h3>${esc(day.listening.title)}</h3>
        <p>盲听两遍 → 打开原稿核对 → 选4句跟读 → 60秒复述。</p>
        <div class="actions"><button class="action" type="button" data-speech="${esc(day.listening.text)}" data-rate="0.88">▶ 0.88×</button><button class="action secondary" type="button" data-speech="${esc(day.listening.text)}" data-rate="1">▶ 1.0×</button><button class="action ghost" id="stop-speech" type="button">停止</button></div>
        <details class="transcript"><summary>完成盲听后打开英文稿</summary><p>${esc(day.listening.text)}</p></details>
      </div>
      <div class="listening-block">
        <div class="listening-label">Authentic input · 10–15分钟</div>
        <h3>${esc(day.listening.sourceTitle)}</h3>
        <p>${esc(day.listening.sourceTask)}</p>
        <div class="actions"><a class="action secondary" href="${esc(day.listening.sourceUrl)}" target="_blank" rel="noopener">打开真实材料 ↗</a></div>
      </div>
      <div class="finish-row"><span>能说出主题、结构和一个关键点即可。</span><button class="check-button ${record.listening?'done':''}" type="button" data-finish="listening">${record.listening?'✓ 已完成':'完成听力'}</button></div>
    </section>
    <section class="section" id="output">
      <header class="section-head"><span class="section-no">03</span><div><h2>把输入说出来</h2></div><span></span><p>不写逐字稿；录音 → 回听 → 只记3个问题 → 完整重录一次。</p></header>
      <div class="eyebrow">TODAY'S OUTPUT · ${esc(day.output.target)}</div>
      <p class="prompt">${esc(day.output.prompt)}</p>
      <ol class="structure">${day.output.structure.map(item=>`<li>${esc(item)}</li>`).join('')}</ol>
      <div class="actions"><button class="action" id="copy-prompt" type="button">复制今日对话提示词</button><a class="action secondary" href="https://chatgpt.com/" target="_blank" rel="noopener">打开 ChatGPT ↗</a></div>
      <label class="notes-label" for="notes">回听后只记3个待修错误</label>
      <textarea class="notes" id="notes" placeholder="1. ……&#10;2. ……&#10;3. ……">${esc(record.notes||'')}</textarea>
      <div class="finish-row"><span>完成重录并只保存最佳一遍后再勾选。</span><button class="check-button ${record.output?'done':''}" type="button" data-finish="output">${record.output?'✓ 已完成':'完成输出'}</button></div>
    </section>
    <section class="library" id="archive">
      <h2>训练资料与雅思归档</h2>
      <p>旧题库和答案全部保留，但不再占据每日首页。</p>
      <a class="library-row" href="speaking.html"><span class="library-code">S</span><span><strong>雅思口语归档</strong><span>Part 1、Part 2、Part 3与强化包</span></span><span class="library-arrow">→</span></a>
      <a class="library-row" href="writing.html"><span class="library-code">W</span><span><strong>雅思写作归档</strong><span>全部范文、题型方法与迁移材料</span></span><span class="library-arrow">→</span></a>
      <a class="library-row" href="listening.html"><span class="library-code">L</span><span><strong>原雅思听力专项</strong><span>数字、时间与旧训练记录保持不变</span></span><span class="library-arrow">→</span></a>
      <a class="library-row" href="audio-guides/listening.html"><span class="library-code">G</span><span><strong>听力方法音频</strong><span>原系统方法音频继续保留</span></span><span class="library-arrow">→</span></a>
    </section>`;
  bind();
}
function speak(text,rate=1){
  if(!('speechSynthesis' in window)){toast('当前浏览器不支持系统朗读');return;}
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='en-US';utterance.rate=Number(rate)||1;utterance.pitch=1;
  const voices=speechSynthesis.getVoices();
  utterance.voice=voices.find(voice=>voice.lang.startsWith('en')&&/Samantha|Ava|Daniel|Karen/i.test(voice.name))||voices.find(voice=>voice.lang.startsWith('en'))||null;
  speechSynthesis.speak(utterance);
}
async function copyText(text){
  if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);
  const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
}
function toast(message){
  let node=document.querySelector('.toast');
  if(!node){node=document.createElement('div');node.className='toast';document.body.appendChild(node);}
  node.textContent=message;node.classList.add('show');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>node.classList.remove('show'),1800);
}
function bind(){
  const day=days[activeIndex],record=dayState(day.id);
  document.querySelectorAll('[data-chunk-check]').forEach(input=>input.addEventListener('change',()=>{
    const index=Number(input.dataset.chunkCheck),set=new Set(record.chunks||[]);
    input.checked?set.add(index):set.delete(index);record.chunks=[...set].sort((a,b)=>a-b);saveState();render();
  }));
  document.querySelectorAll('[data-speak]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();speak(button.dataset.speak,.9);}));
  document.querySelectorAll('[data-speech]').forEach(button=>button.addEventListener('click',()=>speak(button.dataset.speech,button.dataset.rate)));
  document.getElementById('stop-speech').addEventListener('click',()=>{if('speechSynthesis' in window)speechSynthesis.cancel();});
  document.getElementById('recall-toggle').addEventListener('click',()=>{
    document.getElementById('chunks').classList.toggle('recall-mode');
    document.getElementById('recall-toggle').textContent=document.getElementById('chunks').classList.contains('recall-mode')?'显示英文':'闭卷模式';
  });
  document.querySelectorAll('.chunk').forEach(row=>row.addEventListener('click',event=>{if(event.target.closest('button,input'))return;row.classList.toggle('revealed');}));
  document.querySelectorAll('[data-finish]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.finish;record[key]=!record[key];saveState();render();}));
  document.getElementById('notes').addEventListener('input',event=>{record.notes=event.target.value;saveState();});
  document.getElementById('copy-prompt').addEventListener('click',async()=>{try{await copyText(gptPrompt(day));toast('今日对话提示词已复制');}catch(_){toast('复制失败，请长按手动选择');}});
}
async function boot(){
  try{
    const response=await fetch(`data-fluency.json?v=${VERSION}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    days=await response.json();
    if(!Array.isArray(days)||days.length!==7||days.some(day=>!Array.isArray(day.chunks)||day.chunks.length!==5))throw new Error('七天训练数据不完整');
    render();
  }catch(error){
    document.getElementById('app').innerHTML=`<div class="error"><strong>每日英语训练加载失败</strong><br>${esc(error.message)}</div>`;
  }
}
boot();
