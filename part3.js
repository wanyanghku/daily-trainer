const VERSION=window.IELTS_VERSION||'43';
const CONTENT_EDIT_KEY='ielts_daily_trainer_content_overrides_v1';
const {esc,load,save,wordCount,toast,copy,ideaHTML,bindIdeaNotes}=window.IELTSBank;
let topics=[];
const rawTopic=new URLSearchParams(location.search).get('topic');
const requestedTopic=rawTopic!==null&&/^\d+$/.test(rawTopic)?Number(rawTopic):-1;
let selectedTopic=-1;

function topicURL(index){return `part3.html?topic=${index}`;}
function savedAnswer(topicIndex,questionIndex,fallback){
  const record=load(CONTENT_EDIT_KEY)[`p3:${topicIndex}:${questionIndex}`];return record&&typeof record.text==='string'?record.text:fallback;
}
function saveAnswer(target){
  const topicIndex=Number(target.dataset.p3Topic),questionIndex=Number(target.dataset.p3Question),qa=topics[topicIndex]&&topics[topicIndex].qa[questionIndex];if(!qa)return;
  const key=`p3:${topicIndex}:${questionIndex}`,value=target.value,store=load(CONTENT_EDIT_KEY);
  if(value.trim()===qa.a.trim())delete store[key];else store[key]={text:value,sourceVersion:String(VERSION),updatedAt:new Date().toISOString()};
  save(CONTENT_EDIT_KEY,store);const node=target.closest('.qa').querySelector('[data-p3-count]');if(node)node.textContent=`${wordCount(value)} words · 已自动保存`;
}
function restoreAnswer(topicIndex,questionIndex){
  const qa=topics[topicIndex].qa[questionIndex],target=document.querySelector(`[data-p3-topic="${topicIndex}"][data-p3-question="${questionIndex}"]`);if(!target)return;
  target.value=qa.a;const store=load(CONTENT_EDIT_KEY);delete store[`p3:${topicIndex}:${questionIndex}`];save(CONTENT_EDIT_KEY,store);
  target.closest('.qa').querySelector('[data-p3-count]').textContent=`${wordCount(qa.a)} words · 标准答案`;toast('已恢复这道Part 3的标准答案');
}
function tabsHTML(){
  return `<nav class="jump-nav group-tabs" aria-label="Part 3话题目录">${topics.map((topic,index)=>`<a href="${topicURL(index)}" ${index===selectedTopic?'aria-current="page"':''}>${esc(topic.cn)}</a>`).join('')}</nav>`;
}
function directoryHTML(){
  return `<header class="bank-hero"><div><div class="eyebrow">IELTS SPEAKING · PART 3</div><h1>Part 3<br>话题目录</h1><p>先选一个话题，本页只显示该类3道追问；观点尽量使用可迁移到作文的中性表达。</p></div><div class="hero-stat"><strong>5</strong><span>TOPICS · 15 QUESTIONS</span></div></header>
    <div class="action-bar single-action"><button class="primary" id="copy-all" type="button">复制全部15道P3题目到GPT模考</button></div>
    <section class="directory" aria-label="Part 3话题分组"><div class="directory-head"><h2>选择话题</h2><p>每类3问，进入后可从上方切换</p></div><div class="directory-list">${topics.map((topic,index)=>`<a class="directory-row" href="${topicURL(index)}"><span class="directory-code">${index+1}</span><span class="directory-copy"><strong>${esc(topic.cn)}</strong><small>${esc(topic.topic)}</small></span><span class="directory-count">${topic.qa.length}问&nbsp; →</span></a>`).join('')}</div></section>
    <section class="directory"><div class="directory-head"><h2>继续强化</h2><p>P3与大作文共用</p></div><div class="directory-list"><a class="directory-row" href="reinforcement.html"><span class="directory-code">强化</span><span class="directory-copy"><strong>P3 × Task 2 高迁移强化包</strong><small>先过本页15题，再练论证模块和弱话题补缺</small></span><span class="directory-count">12节&nbsp; →</span></a></div></section>
    <footer class="page-foot">Part 3与Part 2分开练习；强化包只作迁移查漏，答案修改仍随首页导出</footer>`;
}
function questionHTML(qa,questionIndex){
  const answer=savedAnswer(selectedTopic,questionIndex,qa.a),edited=answer.trim()!==qa.a.trim();
  return `<article class="qa"><p class="question">${questionIndex+1}. ${esc(qa.q)}</p><textarea class="answer-edit" data-p3-topic="${selectedTopic}" data-p3-question="${questionIndex}">${esc(answer)}</textarea><div class="edit-meta"><span data-p3-count>${wordCount(answer)} words · ${edited?'已自动保存':'标准答案'}</span><button class="text-button" type="button" data-restore-p3="${selectedTopic}:${questionIndex}">恢复标准答案</button></div>${ideaHTML(`p3:${selectedTopic}:${questionIndex}`,'本题自由素材')}</article>`;
}
function detailHTML(){
  const topic=topics[selectedTopic];
  return `<header class="bank-hero compact-hero"><div><div class="eyebrow">IELTS SPEAKING · PART 3 · TOPIC ${selectedTopic+1}</div><h1>${esc(topic.cn)}</h1><p>${esc(topic.topic)}。本页只显示这一类追问。</p></div><div class="hero-stat"><strong>${topic.qa.length}</strong><span>QUESTIONS</span></div></header>
    <div class="view-bar"><a href="part3.html">← Part 3 题库首页</a><span>当前：${esc(topic.cn)}</span></div>
    <div class="action-bar single-action"><button class="primary" id="copy-all" type="button">复制全部P3题目</button></div>${tabsHTML()}
    <section class="group single-group"><header class="group-head"><div><h2>${esc(topic.cn)}</h2><p>${esc(topic.topic)}</p></div><strong>${topic.qa.length}问</strong></header><article class="topic"><div class="topic-meta"><span class="tag">P3</span><span>答案可修改</span><span>适合整理作文观点</span></div>${ideaHTML(`p3topic:${selectedTopic}`,'整组论点与作文语料')}${topic.qa.map(questionHTML).join('')}</article></section>
    <a class="return-home" href="part3.html">← 返回 Part 3 题库首页</a><footer class="page-foot">切换话题不会清除当前浏览器中的答案修改</footer>`;
}
function render(){
  document.getElementById('app').innerHTML=selectedTopic>=0?detailHTML():directoryHTML();
  const tabs=document.querySelector('.group-tabs'),active=tabs&&tabs.querySelector('[aria-current="page"]');if(tabs&&active)tabs.scrollLeft=Math.max(0,active.offsetLeft-tabs.clientWidth/2+active.clientWidth/2);
}
function mockPrompt(){
  const bank=topics.map((topic,index)=>`## P3-${index+1}. ${topic.topic} / ${topic.cn}\n${topic.qa.map((qa,i)=>`${i+1}. ${qa.q}`).join('\n')}`).join('\n\n');
  return `You are my IELTS Speaking Part 3 examiner for the Mainland China test. My target is Band 6.5.\n\nBelow is my complete Part 3 bank. Randomly choose TWO different topics and ask all six questions ONE at a time. Do not show a model answer, hint, correction or Chinese translation before I answer.\n\nAfter all six answers, give concise feedback on fluency, vocabulary, grammar and idea development. Prefer simple, neutral English that can also support IELTS Writing Task 2. Give exactly 3 priority improvements, then ask me to answer my weakest question again.\n\nCOMPLETE PART 3 BANK (${topics.reduce((sum,topic)=>sum+topic.qa.length,0)} questions):\n\n${bank}`;
}
document.addEventListener('input',event=>{if(event.target.matches('.answer-edit[data-p3-topic]'))saveAnswer(event.target);});
document.addEventListener('click',async event=>{
  const restore=event.target.closest('[data-restore-p3]');if(restore){const [topic,question]=restore.dataset.restoreP3.split(':').map(Number);restoreAnswer(topic,question);return;}
  if(event.target.closest('#copy-all')){const button=event.target.closest('#copy-all');button.disabled=true;try{await copy(mockPrompt());toast('已复制全部15道Part 3模考提示词');}catch(_){toast('复制失败，请重试');}finally{button.disabled=false;}}
});
async function boot(){
  try{
    const response=await fetch(`data-p3.json?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    topics=await response.json();if(!Array.isArray(topics)||topics.reduce((sum,topic)=>sum+(topic.qa||[]).length,0)!==15)throw new Error('Part 3题库不是15题');
    selectedTopic=requestedTopic>=0&&requestedTopic<topics.length?requestedTopic:-1;render();bindIdeaNotes(VERSION);
  }catch(error){document.getElementById('app').innerHTML=`<div class="empty"><strong>Part 3题库加载失败</strong><br>${esc(error.message)}</div>`;}
}
boot();
