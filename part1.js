const VERSION=window.IELTS_VERSION||'43';
const EDIT_KEY='ielts_daily_trainer_p1_answer_overrides_v1';
const {esc,load,save,wordCount,toast,copy,ideaHTML,bindIdeaNotes}=window.IELTSBank;
const TIER_META={
  A:{title:'A · 最高频',desc:'已经系统准备过，保留全部问题供自由抽查'},
  B:{title:'B · 常见话题',desc:'以熟悉素材复用为主，逐题检查是否能自然说出'},
  C:{title:'C · 补充话题',desc:'短答即可，不追求复杂表达'}
};
let topics=[];
let query='';

function savedAnswer(topicIndex,questionIndex,fallback){
  const record=load(EDIT_KEY)[`${topicIndex}:${questionIndex}`];
  if(typeof record==='string')return record;
  return record&&typeof record.answer==='string'?record.answer:fallback;
}

function saveAnswer(target){
  const topicIndex=Number(target.dataset.topic),questionIndex=Number(target.dataset.question);
  const topic=topics[topicIndex],qa=topic&&topic.qa&&topic.qa[questionIndex];
  if(!qa)return;
  const value=target.value,store=load(EDIT_KEY),key=`${topicIndex}:${questionIndex}`;
  if(value.trim()===qa.a.trim())delete store[key];
  else store[key]={topicIndex,questionIndex,topic:topic.topic,question:qa.q,answer:value,sourceVersion:String(VERSION),updatedAt:new Date().toISOString()};
  save(EDIT_KEY,store);
  const meta=target.closest('.qa').querySelector('[data-word-count]');
  if(meta)meta.textContent=`${wordCount(value)} words · 已自动保存`;
}

function restoreAnswer(topicIndex,questionIndex){
  const topic=topics[topicIndex],qa=topic.qa[questionIndex],target=document.querySelector(`[data-topic="${topicIndex}"][data-question="${questionIndex}"]`);
  if(!target)return;
  target.value=qa.a;
  const store=load(EDIT_KEY);delete store[`${topicIndex}:${questionIndex}`];save(EDIT_KEY,store);
  const meta=target.closest('.qa').querySelector('[data-word-count]');
  if(meta)meta.textContent=`${wordCount(qa.a)} words · 标准答案`;
  toast('已恢复这道题的标准答案');
}

function topicMatches(topic){
  if(!query)return true;
  const haystack=[topic.topic,topic.cn,...topic.qa.flatMap(item=>[item.q,item.a])].join(' ').toLowerCase();
  return haystack.includes(query);
}

function qaHTML(topicIndex,questionIndex,qa){
  const answer=savedAnswer(topicIndex,questionIndex,qa.a),edited=answer.trim()!==qa.a.trim();
  return `<article class="qa" data-search="${esc((qa.q+' '+qa.a).toLowerCase())}">
    <p class="question"><span aria-hidden="true">${questionIndex+1}.</span> ${esc(qa.q)}</p>
    <textarea class="answer-edit" data-topic="${topicIndex}" data-question="${questionIndex}" aria-label="编辑答案：${esc(qa.q)}">${esc(answer)}</textarea>
    <div class="edit-meta"><span data-word-count>${wordCount(answer)} words · ${edited?'已自动保存':'标准答案'}</span><button class="text-button" type="button" data-restore="${topicIndex}:${questionIndex}">恢复标准答案</button></div>
    ${ideaHTML(`p1:${topicIndex}:${questionIndex}`,'本题自由素材')}
  </article>`;
}

function topicHTML(topic,topicIndex){
  return `<article class="topic" id="p1-${topicIndex}">
    <div class="topic-meta"><span class="tag">Tier ${esc(topic.tier||'B')}</span><span>${topic.qa.length} questions</span><span>答案可修改</span></div>
    <h3>${esc(topic.topic)} <span lang="zh-CN">· ${esc(topic.cn)}</span></h3>
    ${ideaHTML(`p1topic:${topicIndex}`,'整组复用素材')}
    ${topic.qa.map((qa,index)=>qaHTML(topicIndex,index,qa)).join('')}
  </article>`;
}

function render(){
  const retainSearch=document.activeElement&&document.activeElement.id==='search';
  const filtered=topics.map((topic,index)=>({topic,index})).filter(({topic})=>topicMatches(topic));
  const questionCount=topics.reduce((sum,topic)=>sum+topic.qa.length,0);
  let html=`<header class="bank-hero"><div><div class="eyebrow">IELTS SPEAKING · PART 1</div><h1>Part 1<br>全题库</h1><p>35张话题卡覆盖37个题名，共${questionCount}问。所有题目完整保留；答案与自由素材只保存在当前浏览器。</p></div><div class="hero-stat"><strong>${questionCount}</strong><span>QUESTIONS</span></div></header>
    <div class="action-bar"><input class="search" id="search" type="search" value="${esc(query)}" placeholder="搜索话题、问题或答案…" aria-label="搜索Part 1题库"><button class="primary" id="copy-all" type="button">复制全部P1题目到GPT模考</button></div>
    <p class="status" id="status">${query?`找到 ${filtered.length} / ${topics.length} 张话题卡`:'建议让GPT随机抽题，不按页面顺序练。'}</p>
    <nav class="jump-nav" aria-label="Part 1话题目录">${filtered.map(({topic,index})=>`<a href="#p1-${index}">${esc(topic.cn)}</a>`).join('')}</nav>`;
  for(const tier of ['A','B','C']){
    const group=filtered.filter(({topic})=>(topic.tier||'B')===tier);if(!group.length)continue;
    const count=group.reduce((sum,{topic})=>sum+topic.qa.length,0),meta=TIER_META[tier];
    html+=`<section class="group" id="tier-${tier}"><header class="group-head"><div><h2>${esc(meta.title)}</h2><p>${esc(meta.desc)}</p></div><strong>${group.length}组 · ${count}问</strong></header>${group.map(({topic,index})=>topicHTML(topic,index)).join('')}</section>`;
  }
  if(!filtered.length)html+='<div class="empty">没有匹配的话题。试试更短的关键词。</div>';
  html+='<footer class="page-foot">答案修改、自由素材与首页复习详情共用本地存储 · 本页不播放Part 1音频</footer>';
  document.getElementById('app').innerHTML=html;
  const search=document.getElementById('search');if(retainSearch&&search){search.focus({preventScroll:true});search.setSelectionRange(search.value.length,search.value.length);}
}

function mockPrompt(){
  const bank=topics.map((topic,index)=>`## ${index+1}. ${topic.topic} / ${topic.cn}\n${topic.qa.map((qa,i)=>`${i+1}. ${qa.q}`).join('\n')}`).join('\n\n');
  return `You are my IELTS Speaking Part 1 examiner for the Mainland China test. My target is Band 6.5.\n\nBelow is my COMPLETE Part 1 question bank. Randomly choose 3 different topics and ask about 12 questions in total. Ask ONE question at a time in English. Do not show a model answer, hint, correction, or Chinese translation before I answer. Keep the interaction natural and allow brief follow-up questions.\n\nAfter all 12 questions, give concise feedback on fluency, vocabulary, grammar and pronunciation-friendly delivery. Prefer simple, neutral English over slang, filler phrases or advanced rewrites, so useful ideas can also support Part 3 and writing. Then give exactly 3 minimal changes that would most improve my score, and ask me to answer my weakest question again.\n\nCOMPLETE QUESTION BANK (${topics.length} cards, ${topics.reduce((sum,t)=>sum+t.qa.length,0)} questions):\n\n${bank}`;
}

document.addEventListener('input',event=>{
  if(event.target.id==='search'){
    query=event.target.value.trim().toLowerCase();
    clearTimeout(window.__p1SearchTimer);window.__p1SearchTimer=setTimeout(render,120);
  }else if(event.target.matches('.answer-edit'))saveAnswer(event.target);
});
document.addEventListener('click',async event=>{
  const restore=event.target.closest('[data-restore]');
  if(restore){const [topic,question]=restore.dataset.restore.split(':').map(Number);restoreAnswer(topic,question);return;}
  if(event.target.closest('#copy-all')){
    const button=event.target.closest('#copy-all');button.disabled=true;
    try{await copy(mockPrompt());toast('已复制全部167问的Part 1模考提示词');}
    catch(_){toast('复制失败，请重试');}
    finally{button.disabled=false;}
  }
});

async function boot(){
  try{
    const response=await fetch(`data-p1.json?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    topics=await response.json();
    if(!Array.isArray(topics)||topics.length!==35||topics.reduce((sum,t)=>sum+(t.qa||[]).length,0)!==167)throw new Error('Part 1题库数量与预期不一致');
    render();bindIdeaNotes(VERSION);
  }catch(error){document.getElementById('app').innerHTML=`<div class="empty"><strong>Part 1题库加载失败</strong><br>${esc(error.message)}</div>`;}
}
boot();
