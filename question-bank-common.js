(function(){
  const IDEA_NOTE_KEY='ielts_daily_trainer_idea_notes_v1';
  let toastTimer=null;
  function esc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function load(key){try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch(_){return {};}}
  function save(key,value){localStorage.setItem(key,JSON.stringify(value));}
  function wordCount(value){return (String(value||'').match(/[A-Za-z0-9'’\-]+/g)||[]).length;}
  function toast(message){
    const node=document.getElementById('toast');if(!node)return;
    node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>node.classList.remove('show'),1800);
  }
  function fallbackCopy(text){
    const area=document.createElement('textarea');area.value=text;area.readOnly=true;area.style.position='fixed';area.style.opacity='0';area.style.fontSize='16px';
    document.body.appendChild(area);area.focus();area.select();area.setSelectionRange(0,area.value.length);
    const ok=document.execCommand('copy');area.remove();if(!ok)throw new Error('copy failed');
  }
  async function copy(text){
    if(navigator.clipboard&&window.isSecureContext){
      try{await navigator.clipboard.writeText(text);return;}catch(_){/* fall back for restricted mobile browsers */}
    }
    fallbackCopy(text);
  }
  function ideaValue(key){const value=load(IDEA_NOTE_KEY)[key];return value&&typeof value==='object'&&typeof value.text==='string'?value.text:'';}
  function ideaHTML(key,label='我的补充素材'){
    const id='idea-'+key.replace(/[^A-Za-z0-9_-]/g,'-'),value=ideaValue(key);
    return `<details class="idea" ${value.trim()?'open':''}><summary>＋ ${esc(label)}${value.trim()?' · 已保存':''}</summary><textarea id="${id}" data-idea-key="${esc(key)}" placeholder="关键词、真实细节或临场可用句子…">${esc(value)}</textarea></details>`;
  }
  function saveIdea(target,version){
    const key=target.dataset.ideaKey;if(!key)return;
    const store=load(IDEA_NOTE_KEY),text=target.value;
    if(text.trim())store[key]={text,sourceVersion:String(version),updatedAt:new Date().toISOString()};else delete store[key];
    save(IDEA_NOTE_KEY,store);
  }
  function bindIdeaNotes(version){document.addEventListener('input',event=>{if(event.target.matches('[data-idea-key]'))saveIdea(event.target,version);});}
  function bindPlainTextPaste(){
    document.addEventListener('paste',event=>{
      const target=event.target.closest('[contenteditable="true"]');if(!target)return;
      event.preventDefault();const text=(event.clipboardData||window.clipboardData).getData('text/plain');document.execCommand('insertText',false,text);
    });
  }
  window.IELTSBank={esc,load,save,wordCount,toast,copy,ideaHTML,bindIdeaNotes,bindPlainTextPaste};
})();
