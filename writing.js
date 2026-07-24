const VERSION=window.IELTS_VERSION||'43';
const CONTENT_EDIT_KEY='ielts_daily_trainer_content_overrides_v1';
const PACK_ID='EXAM-PACK';
const {esc,load,save,wordCount,toast,ideaHTML,bindIdeaNotes}=window.IELTSBank;
let items=[],packSource='';
const requestedItem=new URLSearchParams(location.search).get('item')||'';
let selectedItem='';

function itemURL(id){return `writing.html?item=${encodeURIComponent(id)}`;}
function fullScript(item){return (item.script||[]).join('\n\n');}
function savedScript(item){
  const record=load(CONTENT_EDIT_KEY)[`writing:${item.id}:script`];
  return record&&typeof record.text==='string'?record.text:fullScript(item);
}
function saveScript(target){
  const item=items.find(entry=>entry.id===target.dataset.writingScript);if(!item)return;
  const key=`writing:${item.id}:script`,store=load(CONTENT_EDIT_KEY),value=target.value;
  if(value.trim()===fullScript(item).trim())delete store[key];
  else store[key]={text:value,sourceVersion:String(VERSION),updatedAt:new Date().toISOString()};
  save(CONTENT_EDIT_KEY,store);
  const count=document.querySelector('[data-writing-count]');if(count)count.textContent=`${wordCount(value)} words · 已自动保存`;
}
function restoreScript(id){
  const item=items.find(entry=>entry.id===id),target=document.querySelector('[data-writing-script]');if(!item||!target)return;
  target.value=fullScript(item);const store=load(CONTENT_EDIT_KEY);delete store[`writing:${id}:script`];save(CONTENT_EDIT_KEY,store);
  const count=document.querySelector('[data-writing-count]');if(count)count.textContent=`${wordCount(target.value)} words · 标准材料`;toast('已恢复这篇作文的标准材料');
}
function visualHTML(visual,label='正式题图'){
  if(!visual||!visual.image)return '';
  return `<figure class="writing-visual"><figcaption>${esc(label)}</figcaption><img src="${esc(visual.image)}?v=${VERSION}" width="${Number(visual.imageWidth)||1536}" height="${Number(visual.imageHeight)||960}" alt="${esc(visual.alt||label)}"><p><b>Task：</b>${esc(visual.instruction||visual.prompt||'')}</p></figure>`;
}
function methodHTML(method){
  if(!method)return '';
  return `<section class="writing-block"><div class="block-heading"><span>METHOD</span><h2>${esc(method.title||'题型通用框架')}</h2><p>${esc(method.source||'')}</p></div><div class="method-list">${(method.paragraphs||[]).map(row=>`<div><strong>${esc(row.label)}</strong><p>${esc(row.text)}</p></div>`).join('')}</div>${method.transfer?`<p class="transfer-note"><b>迁移边界：</b>${esc(method.transfer)}</p>`:''}</section>`;
}
function itemRow(item){
  const code=item.task==='Task 1'?'T1':'T2';
  return `<a class="directory-row" href="${itemURL(item.id)}"><span class="directory-code">${code}</span><span class="directory-copy"><strong>${esc(item.type)} · ${esc(item.cn)}</strong><small>${item.learned?'已背模板，复习框架与比较句':'完整题目、方法、范文、核心句与迁移练习'}</small></span><span class="directory-count">进入&nbsp; →</span></a>`;
}
function directoryHTML(){
  const task1=items.filter(item=>item.task==='Task 1'),task2=items.filter(item=>item.task==='Task 2');
  return `<header class="bank-hero"><div><div class="eyebrow">IELTS WRITING · COMPLETE LIBRARY</div><h1>作文<br>全部材料</h1><p>7篇正式训练材料、写作考前包和P3共用强化包。先选题型，再单独打开。</p></div><div class="hero-stat"><strong>9</strong><span>ENTRIES</span></div></header>
    <section class="directory"><div class="directory-head"><h2>Task 1 · 小作文</h2><p>折线、柱状、流程、地图</p></div><div class="directory-list">${task1.map(itemRow).join('')}</div></section>
    <section class="directory"><div class="directory-head"><h2>Task 2 · 大作文</h2><p>Opinion、Discussion、Problem–Solution</p></div><div class="directory-list">${task2.map(itemRow).join('')}</div></section>
    <section class="directory"><div class="directory-head"><h2>考前补充</h2><p>不新增长背诵</p></div><div class="directory-list"><a class="directory-row" href="${itemURL(PACK_ID)}"><span class="directory-code">写</span><span class="directory-copy"><strong>写作考前补充包</strong><small>饼图/表格迁移、五种Task 2题型、8类话题语料与检查表</small></span><span class="directory-count">速查&nbsp; →</span></a><a class="directory-row" href="reinforcement.html"><span class="directory-code">强化</span><span class="directory-copy"><strong>P3 × Task 2 高迁移强化包</strong><small>现有15道P3、12个共用论证模块、弱话题补缺与Task 2结构</small></span><span class="directory-count">12节&nbsp; →</span></a></div></section>
    <a class="return-home" href="./">← 返回考前三天首页</a><footer class="page-foot">7篇正式材料全部保留；两个补充包只作查漏，不计入新背诵</footer>`;
}
function detailHTML(item){
  const script=savedScript(item),edited=script.trim()!==fullScript(item).trim();
  return `<header class="bank-hero compact-hero"><div><div class="eyebrow">IELTS WRITING · ${esc(item.task.toUpperCase())}</div><h1>${esc(item.type)}<br>${esc(item.cn)}</h1><p>${esc(item.learned?'已背材料：只复习框架、Overview和比较方式，不重背。':'目标6.5：先看题说结构，再核核心句与范文。')}</p></div><div class="hero-stat"><strong>${wordCount(script)}</strong><span>WORDS</span></div></header>
    <div class="view-bar"><a href="writing.html">← 作文材料首页</a><span>${esc(item.task)} · ${esc(item.type)}</span></div>
    <section class="writing-block"><div class="block-heading"><span>TASK</span><h2>正式题目</h2></div><p class="writing-prompt">${esc(item.prompt||'')}</p>${visualHTML(item.visual)}${visualHTML(item.transferVisual,item.transferVisual&&item.transferVisual.label||'换题迁移图')}</section>
    ${methodHTML(item.method)}
    <section class="writing-block"><div class="block-heading"><span>PLAN</span><h2>本题信息链</h2></div><p class="chain-text">${esc(item.chain||'')}</p></section>
    <section class="writing-block"><div class="block-heading"><span>LANGUAGE</span><h2>核心句</h2></div><ol class="key-lines">${(item.keySentences||[]).map(line=>`<li>${esc(line)}</li>`).join('')}</ol></section>
    <section class="writing-block"><div class="block-heading"><span>MODEL</span><h2>背诵材料</h2><p>可直接修改，自动保存并随首页导出</p></div><audio class="writing-audio" controls preload="none" src="${esc(item.audio)}.m4a?v=${VERSION}"></audio><textarea class="writing-editor" data-writing-script="${esc(item.id)}" aria-label="编辑${esc(item.cn)}背诵材料">${esc(script)}</textarea><div class="edit-meta"><span data-writing-count>${wordCount(script)} words · ${edited?'已自动保存':'标准材料'}</span><button class="text-button" type="button" data-restore-writing="${esc(item.id)}">恢复标准材料</button></div></section>
    <section class="writing-block"><div class="block-heading"><span>TRANSFER</span><h2>换题练习</h2></div><p class="writing-prompt">${esc(item.transfer||'')}</p>${item.note?`<p class="transfer-note"><b>提醒：</b>${esc(item.note)}</p>`:''}${ideaHTML(`writing:${item.id}`,'这篇作文的想法与句子')}</section>
    <a class="return-home" href="writing.html">← 返回作文材料首页</a><footer class="page-foot">修改写入与每日页相同的本地存储，不会覆盖公开标准稿</footer>`;
}
function inlineMarkdown(value){
  return esc(value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
}
function isSpecial(line,next=''){
  return !line.trim()||/^###\s/.test(line)||/^---+$/.test(line.trim())||/^>\s?/.test(line)||/^\d+\.\s/.test(line)||/^-\s/.test(line)||(/^\|/.test(line.trim())&&/^\|?\s*:?-+/.test((next||'').trim()));
}
function markdownBlocks(source){
  const lines=source.trim().split('\n');let html='',i=0;
  while(i<lines.length){
    const line=lines[i],trim=line.trim(),next=lines[i+1]||'';
    if(!trim){i++;continue;}
    if(/^###\s/.test(line)){html+=`<h3>${inlineMarkdown(line.replace(/^###\s+/,''))}</h3>`;i++;continue;}
    if(/^---+$/.test(trim)){html+='<hr>';i++;continue;}
    if(/^>\s?/.test(line)){const rows=[];while(i<lines.length&&/^>\s?/.test(lines[i]))rows.push(lines[i++].replace(/^>\s?/,''));html+=`<blockquote>${rows.map(inlineMarkdown).join('<br>')}</blockquote>`;continue;}
    if(/^\|/.test(trim)&&/^\|?\s*:?-+/.test(next.trim())){
      const rows=[];while(i<lines.length&&/^\|/.test(lines[i].trim()))rows.push(lines[i++].trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim()));
      const head=rows.shift();rows.shift();html+=`<div class="pack-table-wrap"><table><thead><tr>${head.map(cell=>`<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;continue;
    }
    if(/^\d+\.\s/.test(line)){const rows=[];while(i<lines.length&&/^\d+\.\s/.test(lines[i]))rows.push(lines[i++].replace(/^\d+\.\s+/,''));html+=`<ol>${rows.map(row=>`<li>${inlineMarkdown(row)}</li>`).join('')}</ol>`;continue;}
    if(/^-\s/.test(line)){const rows=[];while(i<lines.length&&/^-\s/.test(lines[i]))rows.push(lines[i++].replace(/^-\s+/,''));html+=`<ul>${rows.map(row=>`<li>${inlineMarkdown(row)}</li>`).join('')}</ul>`;continue;}
    const paragraph=[];while(i<lines.length&&!isSpecial(lines[i],lines[i+1]||''))paragraph.push(lines[i++].trim());html+=`<p>${paragraph.map(inlineMarkdown).join(' ')}</p>`;
  }
  return html;
}
function packSections(){
  const start=packSource.indexOf('# 作文 Writing'),end=packSource.indexOf('## 十六、来源与边界');
  if(start<0)throw new Error('考前补充包缺少作文章节');
  const body=packSource.slice(start+'# 作文 Writing'.length,end>start?end:undefined).trim();
  return body.split(/(?=^##\s)/m).filter(Boolean).map((section,index)=>{
    const lines=section.trim().split('\n'),title=lines.shift().replace(/^##\s+/,''),content=lines.join('\n');
    return `<details class="pack-section" ${index===0?'open':''}><summary><span>${inlineMarkdown(title)}</span><b>展开</b></summary><div class="pack-body">${markdownBlocks(content)}</div></details>`;
  }).join('');
}
function packHTML(){
  return `<header class="bank-hero compact-hero"><div><div class="eyebrow">IELTS WRITING · FINAL CHECK</div><h1>考前<br>补充包</h1><p>补缺口，不新增长背诵。每次只展开一节，20–30分钟内结束。</p></div><div class="hero-stat"><strong>7</strong><span>SECTIONS</span></div></header>
    <div class="view-bar"><a href="writing.html">← 作文材料首页</a><span>饼图/表格 · 5种Task 2题型 · 8类话题语料</span></div>
    <div class="pack-intro"><strong>使用边界</strong><p>先复习7篇正式材料；只有遇到未覆盖题型或话题时才打开对应章节。这里不是新的背诵清单。</p></div>
    <section class="pack-sections">${packSections()}</section>${ideaHTML('writing-pack:final','考前补充包自由笔记')}
    <a class="return-home" href="writing.html">← 返回作文材料首页</a><footer class="page-foot">内容来自2026-07-22考前速查调研稿；目标为大陆考区6.5</footer>`;
}
function render(){
  if(selectedItem===PACK_ID)document.getElementById('app').innerHTML=packHTML();
  else if(selectedItem){const item=items.find(entry=>entry.id===selectedItem);document.getElementById('app').innerHTML=item?detailHTML(item):directoryHTML();}
  else document.getElementById('app').innerHTML=directoryHTML();
}
document.addEventListener('input',event=>{if(event.target.matches('[data-writing-script]'))saveScript(event.target);});
document.addEventListener('click',event=>{const button=event.target.closest('[data-restore-writing]');if(button)restoreScript(button.dataset.restoreWriting);});
async function boot(){
  try{
    const [writingResponse,packResponse]=await Promise.all([
      fetch(`data-writing.json?v=${VERSION}`,{cache:'no-store'}),
      fetch(`考前最后速查-口语与作文-整理稿-2026-07-22.md?v=${VERSION}`,{cache:'no-store'})
    ]);
    if(!writingResponse.ok)throw new Error(`作文数据 HTTP ${writingResponse.status}`);if(!packResponse.ok)throw new Error(`补充包 HTTP ${packResponse.status}`);
    items=await writingResponse.json();packSource=await packResponse.text();
    if(!Array.isArray(items)||items.length!==7)throw new Error('正式作文材料不是7篇');
    selectedItem=requestedItem===PACK_ID||items.some(item=>item.id===requestedItem)?requestedItem:'';
    render();bindIdeaNotes(VERSION);
  }catch(error){document.getElementById('app').innerHTML=`<div class="empty"><strong>作文材料加载失败</strong><br>${esc(error.message)}</div>`;}
}
boot();
