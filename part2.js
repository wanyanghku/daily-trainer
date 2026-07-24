const VERSION=window.IELTS_VERSION||'43';
const SEGMENT_KEY='ielts_p2_bank_segment_overrides_v1';
const {esc,load,save,wordCount,toast,copy,ideaHTML,bindIdeaNotes,bindPlainTextPaste}=window.IELTSBank;
const GROUP_ORDER=['A','B','C','D','E','G1','G2','G3','F1','F2','SHORT'];
const GROUP_META={
  A:['A · 重要决定','决定、建议与等待结果'],B:['B · AI与科技','AI工具、科技问题与相关经历'],C:['C · 帮助他人','解决问题与乐于助人的人'],D:['D · 团队合作','计划变化、鼓励与团队场景'],E:['E · 香港场景','香港、港大、智华馆与西营盘'],
  G1:['G1 · 长期目标','目标、理想工作与海外工作'],G2:['G2 · 坚持与成长','克服困难、规划、医疗与环保人物'],G3:['G3 · 改变想法','观点和近期改变'],F1:['F1 · 发小','童年朋友、自学与语言学习'],F2:['F2 · 父亲','家庭成就、食物与纪念物'],SHORT:['独立短题','西游记、环保法律、云南自驾与交响乐等独立素材']
};
let items=[],query='';
const legacyGroup=location.hash.startsWith('#group-')?decodeURIComponent(location.hash.slice(7)):'';
const requestedGroup=(new URLSearchParams(location.search).get('group')||legacyGroup).toUpperCase();
const selectedGroup=GROUP_ORDER.includes(requestedGroup)?requestedGroup:'';

function groupURL(group){return `part2.html?group=${encodeURIComponent(group)}`;}
function segmentText(item,index){
  const record=load(SEGMENT_KEY)[item.id];
  return record&&record.segments&&typeof record.segments[index]==='string'?record.segments[index]:item.segments[index].text;
}
function itemStats(item){
  let total=0,reused=0;
  item.segments.forEach((segment,index)=>{const count=wordCount(segmentText(item,index));total+=count;if(segment.type!=='custom')reused+=count;});
  return {total,ratio:total?Math.round(reused/total*100):0};
}
function saveSegment(target){
  const id=target.dataset.item,index=Number(target.dataset.segment),item=items.find(entry=>entry.id===id);if(!item)return;
  const store=load(SEGMENT_KEY),record=store[id]&&typeof store[id]==='object'?store[id]:{segments:{}};
  if(!record.segments||typeof record.segments!=='object')record.segments={};
  const value=target.innerText.replace(/\u00a0/g,' ');
  if(value.trim()===item.segments[index].text.trim())delete record.segments[index];else record.segments[index]=value;
  if(Object.keys(record.segments).length){record.title=item.title;record.sourceVersion=String(VERSION);record.updatedAt=new Date().toISOString();store[id]=record;}else delete store[id];
  save(SEGMENT_KEY,store);updateItemStats(id);
}
function updateItemStats(id){
  const item=items.find(entry=>entry.id===id),node=document.querySelector(`[data-stats="${CSS.escape(id)}"]`);if(!item||!node)return;
  const stats=itemStats(item);node.textContent=`${stats.total} words · 黑色复用 ${stats.ratio}% · 已自动保存`;
}
function restoreItem(id){
  const item=items.find(entry=>entry.id===id);if(!item)return;
  const store=load(SEGMENT_KEY);delete store[id];save(SEGMENT_KEY,store);
  item.segments.forEach((segment,index)=>{const node=document.querySelector(`[data-item="${CSS.escape(id)}"][data-segment="${index}"]`);if(node)node.textContent=segment.text;});
  updateItemStats(id);toast('已恢复这道题的审核版答案');
}
function matches(item){
  if(!query)return true;
  return [item.title,item.route,item.cue,...item.cuePoints,...item.segments.map(segment=>segment.text)].join(' ').toLowerCase().includes(query);
}
function itemHTML(item){
  const stats=itemStats(item),kind=item.kind==='mother'?'母题原题':item.kind==='short'?(item.group==='SHORT'?'独立短题':'母题组短卡'):'母题套用';
  return `<article class="topic p2-item" id="p2-${esc(item.id)}">
    <div class="topic-meta"><span class="tag">${esc(item.group)}</span><span>${esc(kind)}</span><span>ID ${esc(item.id)}</span></div>
    <h3>${esc(item.title)}</h3><p class="route"><b>最高效路线：</b>${esc(item.route)}</p>
    <div class="cue"><strong>${esc(item.cue)}</strong><ul>${item.cuePoints.map(point=>`<li>${esc(point)}</li>`).join('')}</ul></div>
    <div class="segments">${item.segments.map((segment,index)=>`<div class="segment ${segment.type}" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-item="${esc(item.id)}" data-segment="${index}" data-source="${esc(segment.source||item.group)}">${esc(segmentText(item,index))}</div>`).join('')}</div>
    <div class="answer-tools"><span data-stats="${esc(item.id)}">${stats.total} words · 黑色复用 ${stats.ratio}% · 自动保存</span><button class="text-button" type="button" data-restore-item="${esc(item.id)}">恢复审核版</button></div>
    ${item.note?`<p class="route"><b>审核提示：</b>${esc(item.note)}</p>`:''}${ideaHTML(`p2bank:${item.id}`,'本题自由素材')}
  </article>`;
}
function tabsHTML(){
  return `<nav class="jump-nav group-tabs" aria-label="Part 2母题目录">${GROUP_ORDER.map(group=>`<a href="${groupURL(group)}" ${group===selectedGroup?'aria-current="page"':''}>${esc(GROUP_META[group][0])}</a>`).join('')}</nav>`;
}
function directoryHTML(){
  return `<header class="bank-hero"><div><div class="eyebrow">IELTS SPEAKING · PART 2</div><h1>Part 2<br>母题目录</h1><p>先选一条母题线，再只练这一组；不会再把55道题堆在同一页。</p></div><div class="hero-stat"><strong>11</strong><span>GROUPS · 55 QUESTIONS</span></div></header>
    <div class="action-bar single-action"><button class="primary" id="copy-all" type="button">复制全部55道P2题目到GPT模考</button></div>
    <section class="directory" aria-label="Part 2母题分组"><div class="directory-head"><h2>选择母题组</h2><p>进入后仍可从上方切换其他组</p></div><div class="directory-list">${GROUP_ORDER.map(group=>{const [title,desc]=GROUP_META[group],count=items.filter(item=>item.group===group).length;return `<a class="directory-row" href="${groupURL(group)}"><span class="directory-code">${esc(group)}</span><span class="directory-copy"><strong>${esc(title.replace(/^\S+\s·\s/,''))}</strong><small>${esc(desc)}</small></span><span class="directory-count">${count}题&nbsp; →</span></a>`;}).join('')}</div></section>
    <footer class="page-foot">进入任一分组后，答案修改与自由素材仍会自动保存</footer>`;
}
function detailHTML(){
  const [title,desc]=GROUP_META[selectedGroup],groupItems=items.filter(item=>item.group===selectedGroup),visible=groupItems.filter(matches);
  return `<header class="bank-hero compact-hero"><div><div class="eyebrow">IELTS SPEAKING · PART 2 · ${esc(selectedGroup)}</div><h1>${esc(title)}</h1><p>${esc(desc)}。本页只显示这一组。</p></div><div class="hero-stat"><strong>${groupItems.length}</strong><span>QUESTIONS</span></div></header>
    <div class="view-bar"><a href="part2.html">← Part 2 题库首页</a><span>当前：${esc(title)}</span></div>
    <div class="action-bar"><input class="search" id="search" type="search" value="${esc(query)}" placeholder="在${esc(selectedGroup)}组内搜索…" aria-label="搜索当前Part 2分组"><button class="primary" id="copy-all" type="button">复制全部P2题目</button></div>
    <p class="status">${query?`找到 ${visible.length} / ${groupItems.length} 道题`:`${groupItems.length}道题 · 修改自动保存`}</p>
    <div class="legend"><span><i></i>黑色：母题原句或多题共用短卡</span><span class="custom"><i></i>红色：本题新增或改写</span></div>${tabsHTML()}
    <section class="group single-group"><header class="group-head"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><strong>${visible.length}题</strong></header>${visible.map(itemHTML).join('')||'<div class="empty">当前组没有匹配结果。</div>'}</section>
    <a class="return-home" href="part2.html">← 返回 Part 2 题库首页</a><footer class="page-foot">切换分组不会清除当前浏览器中的答案修改</footer>`;
}
function render(){
  const retainSearch=document.activeElement&&document.activeElement.id==='search';
  document.getElementById('app').innerHTML=selectedGroup?detailHTML():directoryHTML();
  const tabs=document.querySelector('.group-tabs'),active=tabs&&tabs.querySelector('[aria-current="page"]');if(tabs&&active)tabs.scrollLeft=Math.max(0,active.offsetLeft-tabs.clientWidth/2+active.clientWidth/2);
  const search=document.getElementById('search');if(retainSearch&&search){search.focus({preventScroll:true});search.setSelectionRange(search.value.length,search.value.length);}
}
function mockPrompt(){
  const bank=items.map((item,index)=>`## P2-${index+1}. ${item.title} [母题组：${item.group}]\n${item.cue}\n- ${item.cuePoints.join('\n- ')}`).join('\n\n');
  return `You are my IELTS Speaking Part 2 examiner for the Mainland China test. My target is Band 6.5 and my speaking speed is not fast.\n\nChoose ONE task at random from the complete bank below. Show only that task and its bullet points. Give me one minute to prepare, then wait for my answer. Do not provide a model answer, vocabulary list, Chinese translation or hint. I will type "Done" when I finish.\n\nAfter I finish, give concise feedback on fluency, vocabulary, grammar, cue coverage and whether the answer is clear enough for Band 6.5. Prefer simple, neutral English that can also support Part 3 or writing. End with exactly 3 priority fixes and let me retry the weakest part.\n\nCOMPLETE PART 2 BANK (${items.length} tasks):\n\n${bank}`;
}
document.addEventListener('input',event=>{
  if(event.target.id==='search'){query=event.target.value.trim().toLowerCase();clearTimeout(window.__p2SearchTimer);window.__p2SearchTimer=setTimeout(render,120);}
  else if(event.target.matches('[contenteditable][data-item]'))saveSegment(event.target);
});
document.addEventListener('click',async event=>{
  const restore=event.target.closest('[data-restore-item]');if(restore){restoreItem(restore.dataset.restoreItem);return;}
  if(event.target.closest('#copy-all')){const button=event.target.closest('#copy-all');button.disabled=true;try{await copy(mockPrompt());toast('已复制全部55道Part 2模考提示词');}catch(_){toast('复制失败，请重试');}finally{button.disabled=false;}}
});
async function boot(){
  try{
    const response=await fetch(`data-p2-bank.json?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    items=await response.json();if(!Array.isArray(items)||items.length!==55)throw new Error('Part 2题库不是55题');
    render();bindIdeaNotes(VERSION);bindPlainTextPaste();
  }catch(error){document.getElementById('app').innerHTML=`<div class="empty"><strong>Part 2题库加载失败</strong><br>${esc(error.message)}</div>`;}
}
boot();
