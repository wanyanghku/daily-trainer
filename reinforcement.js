const VERSION=window.IELTS_VERSION||'43';
const SOURCE='P3与Task2高迁移强化包-2026-07-24.md';
const {esc,copy,toast}=window.IELTSBank;
const rawSection=new URLSearchParams(location.search).get('section');
const requestedSection=rawSection!==null&&/^\d+$/.test(rawSection)?Number(rawSection):-1;
let title='P3与Task 2高迁移强化包',intro='',sections=[],selected=-1;

function inline(value){
  return esc(value)
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
}
function parseSource(source){
  const lines=source.replace(/\r/g,'').split('\n');
  const titleLine=lines.find(line=>/^#\s+/.test(line));
  title=titleLine?titleLine.replace(/^#\s+/,'').trim():title;
  const firstSection=lines.findIndex(line=>/^##\s+/.test(line));
  intro=lines.slice(titleLine?lines.indexOf(titleLine)+1:0,firstSection<0?lines.length:firstSection).join('\n').trim();
  const body=(firstSection<0?[]:lines.slice(firstSection)).join('\n');
  sections=body.split(/(?=^##\s+)/m).filter(Boolean).map((block,index)=>{
    const rows=block.trim().split('\n');
    return {index,title:rows.shift().replace(/^##\s+/,'').trim(),body:rows.join('\n').trim()};
  });
}
function isBoundary(line,next=''){
  const value=line.trim();
  return !value||/^###\s/.test(line)||/^####\s/.test(line)||/^---+$/.test(value)||/^>\s?/.test(line)||/^```/.test(line)||/^\d+\.\s/.test(line)||/^-\s/.test(line)||(/^\|/.test(value)&&/^\|?\s*:?-+/.test((next||'').trim()));
}
function markdown(value){
  const lines=value.split('\n');let html='',i=0;
  while(i<lines.length){
    const line=lines[i],trim=line.trim(),next=lines[i+1]||'';
    if(!trim){i++;continue;}
    if(/^####\s/.test(line)){html+=`<h4>${inline(line.replace(/^####\s+/,''))}</h4>`;i++;continue;}
    if(/^###\s/.test(line)){html+=`<h3>${inline(line.replace(/^###\s+/,''))}</h3>`;i++;continue;}
    if(/^---+$/.test(trim)){html+='<hr>';i++;continue;}
    if(/^```/.test(line)){
      const lang=trim.slice(3);i++;const rows=[];
      while(i<lines.length&&!/^```/.test(lines[i]))rows.push(lines[i++]);
      if(i<lines.length)i++;
      html+=`<div class="code-panel"><button type="button" data-copy-code="${encodeURIComponent(rows.join('\n'))}">复制</button><pre><code class="${esc(lang)}">${esc(rows.join('\n'))}</code></pre></div>`;
      continue;
    }
    if(/^>\s?/.test(line)){
      const rows=[];while(i<lines.length&&/^>\s?/.test(lines[i]))rows.push(lines[i++].replace(/^>\s?/,''));
      html+=`<blockquote>${rows.map(inline).join('<br>')}</blockquote>`;continue;
    }
    if(/^\|/.test(trim)&&/^\|?\s*:?-+/.test(next.trim())){
      const rows=[];while(i<lines.length&&/^\|/.test(lines[i].trim()))rows.push(lines[i++].trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim()));
      const head=rows.shift();rows.shift();
      html+=`<div class="pack-table-wrap"><table><thead><tr>${head.map(cell=>`<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;continue;
    }
    if(/^\d+\.\s/.test(line)){
      const rows=[];while(i<lines.length&&/^\d+\.\s/.test(lines[i]))rows.push(lines[i++].replace(/^\d+\.\s+/,''));
      html+=`<ol>${rows.map(row=>`<li>${inline(row)}</li>`).join('')}</ol>`;continue;
    }
    if(/^-\s/.test(line)){
      const rows=[];while(i<lines.length&&/^-\s/.test(lines[i]))rows.push(lines[i++].replace(/^-\s+/,''));
      html+=`<ul>${rows.map(row=>`<li>${inline(row)}</li>`).join('')}</ul>`;continue;
    }
    const rows=[];while(i<lines.length&&!isBoundary(lines[i],lines[i+1]||''))rows.push(lines[i++].trim());
    html+=`<p>${rows.map(inline).join(' ')}</p>`;
  }
  return html;
}
function sectionURL(index){return `reinforcement.html?section=${index}`;}
function directoryHTML(){
  return `<header class="bank-hero"><div><div class="eyebrow">IELTS SPEAKING P3 × WRITING TASK 2</div><h1>P3 × Task 2<br>强化包</h1><p>先过15道现成P3，再练12个高迁移论证模块。每次只进入一节，避免整页过长。</p></div><div class="hero-stat"><strong>${sections.length}</strong><span>SECTIONS</span></div></header>
    <div class="pack-intro">${markdown(intro)}</div>
    <section class="directory" aria-label="强化包目录"><div class="directory-head"><h2>选择一节</h2><p>口语与作文共用</p></div><div class="directory-list">${sections.map(section=>`<a class="directory-row" href="${sectionURL(section.index)}"><span class="directory-code">${String(section.index+1).padStart(2,'0')}</span><span class="directory-copy"><strong>${inline(section.title)}</strong><small>${section.index===2?'现有15道P3完整答案与中文逻辑':section.index===3?'12个跨题论证模块':section.index>=6&&section.index<=7?'Task 2结构与展开':'点击后仅显示本节内容'}</small></span><span class="directory-count">进入&nbsp; →</span></a>`).join('')}</div></section>
    <div class="dual-return"><a class="return-home" href="speaking.html">← 返回口语</a><a class="return-home" href="writing.html">返回作文 →</a></div><footer class="page-foot">强化包不计为新的长背诵；答案修改仍在原P3与作文页面完成</footer>`;
}
function tabsHTML(){
  return `<nav class="jump-nav group-tabs" aria-label="强化包章节">${sections.map(section=>`<a href="${sectionURL(section.index)}" ${section.index===selected?'aria-current="page"':''}>${section.index+1}</a>`).join('')}</nav>`;
}
function detailHTML(){
  const section=sections[selected];
  return `<header class="bank-hero compact-hero"><div><div class="eyebrow">P3 × TASK 2 · SECTION ${selected+1}</div><h1>${inline(section.title)}</h1><p>本页只显示这一节；可用上方数字快速切换。</p></div><div class="hero-stat"><strong>${selected+1}</strong><span>OF ${sections.length}</span></div></header>
    <div class="view-bar"><a href="reinforcement.html">← 强化包目录</a><span>第${selected+1}节</span></div>${tabsHTML()}
    <article class="boost-content pack-body">${markdown(section.body)}</article>
    <div class="dual-return"><a class="return-home" href="reinforcement.html">← 返回强化包目录</a><a class="return-home" href="writing.html">作文总库 →</a></div><footer class="page-foot">目标6.5：先说清观点与因果，再考虑增加例子或条件</footer>`;
}
function render(){
  document.getElementById('app').innerHTML=selected>=0?detailHTML():directoryHTML();
  const active=document.querySelector('.group-tabs [aria-current="page"]');if(active)active.scrollIntoView({inline:'center',block:'nearest'});
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-copy-code]');if(!button)return;
  button.disabled=true;
  try{await copy(decodeURIComponent(button.dataset.copyCode));toast('提示词已复制');}catch(_){toast('复制失败，请重试');}finally{button.disabled=false;}
});
async function boot(){
  try{
    const response=await fetch(`${SOURCE}?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    parseSource(await response.text());if(!sections.length)throw new Error('强化包没有章节');
    selected=requestedSection>=0&&requestedSection<sections.length?requestedSection:-1;render();
  }catch(error){document.getElementById('app').innerHTML=`<div class="empty"><strong>强化包加载失败</strong><br>${esc(error.message)}</div>`;}
}
boot();
