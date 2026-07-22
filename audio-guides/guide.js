(() => {
  const kind = document.body.dataset.guide;
  const guide = window.PODCAST_GUIDES?.[kind];
  const guideVersion = window.PODCAST_GUIDES_VERSION || '1';
  const app = document.querySelector('#guide-app');
  if (!guide || !app) return;
  const isLocalDraft = window.location.protocol === 'file:';
  const audioRoot = isLocalDraft ? '../../output/speech' : './audio';
  const audioSrc = (name) => `${audioRoot}/${name}?v=${guideVersion}`;

  const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const speedSelect = `
    <select class="audio-speed" aria-label="播放速度">
      <option value="0.75">0.75×</option>
      <option value="1" selected>1×</option>
      <option value="1.25">1.25×</option>
      <option value="1.5">1.5×</option>
      <option value="2">2×</option>
    </select>`;

  const audioPlayer = (src, label, canDownload = false) => `
    <div class="audio-controls">
      <audio controls preload="metadata" src="${escapeHtml(src)}" aria-label="${escapeHtml(label)}"></audio>
      <button class="audio-loop" type="button" aria-pressed="false">🔁</button>
      ${speedSelect}
    </div>
    ${canDownload ? `<a class="audio-download" href="${escapeHtml(src)}" download>下载这条音频</a>` : ''}`;

  const chapterLinks = guide.chapters.map((chapter, index) =>
    `<a href="#chapter-${index + 1}">${index + 1}. ${escapeHtml(chapter.shortTitle)}</a>`
  ).join('');

  const sections = guide.chapters.map((chapter, index) => {
    const chapterNumber = String(index + 1).padStart(2, '0');
    const chapterAudio = audioSrc(`${guide.chapterAudioDir}/chapter-${chapterNumber}.m4a`);
    return `
    <section class="section" id="chapter-${index + 1}">
      <div class="section-head">
        <div>
          <div class="chapter-no">CHAPTER ${String(index + 1).padStart(2, '0')}</div>
          <h2>${escapeHtml(chapter.title)}</h2>
        </div>
        <span class="source-tag">${escapeHtml(chapter.source)}</span>
      </div>
      <div class="chapter-player">
        <span>🎧 单独听本章 · 可倍速 / 循环</span>
        ${audioPlayer(chapterAudio, `第${index + 1}章 ${chapter.title}`)}
      </div>
      ${chapter.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')}
    </section>
  `;
  }).join('');

  const sourceItems = guide.sources.map(source => {
    if (source.url) return `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a></li>`;
    return `<li>${escapeHtml(source.label)}</li>`;
  }).join('');

  const audio = guide.audioFile
    ? audioPlayer(audioSrc(guide.audioFile), `${guide.title} 整集`, true)
    : '';

  app.innerHTML = `
    <div class="topbar">
      <span class="draft-badge">${isLocalDraft ? '本地审核稿 · 未上线' : '系统方法音频 · 已上线'}</span>
      <a class="switch" href="${guide.otherPage}">切换到${guide.otherLabel} →</a>
    </div>
    <header class="hero">
      <p class="eyebrow">IELTS ON COMPUTER · SYSTEM GUIDE</p>
      <h1>${escapeHtml(guide.title)}</h1>
      <p class="dek">${escapeHtml(guide.subtitle)}</p>
      <div class="meta">
        <span>${guide.audioFile ? '音频' : '预计'} ${escapeHtml(guide.duration)}</span>
        <span>${guide.chapters.length} 个章节</span>
        <span>${escapeHtml(guide.audience)}</span>
      </div>
    </header>
    <section class="audio-card" aria-label="音频状态">
      <div class="audio-title">
        <span>🎧 单集中文音频</span>
        <span class="audio-status">${escapeHtml(guide.audioStatus)}</span>
      </div>
      <p class="audio-note">${escapeHtml(guide.audioNote)}</p>
      ${audio}
    </section>
    <section class="takeaway" aria-label="核心框架">
      ${guide.takeaways.map((item, index) => `<div><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong></div>`).join('')}
    </section>
    <nav class="chapters" aria-label="章节导航">${chapterLinks}</nav>
    <div class="script-label">完整中文逐字稿</div>
    <article class="transcript">${sections}</article>
    <section class="sources">
      <h2>材料与校准来源</h2>
      <ul>${sourceItems}</ul>
      <div class="actions">
        <button class="action" type="button" id="copy-script">复制逐字稿</button>
        <button class="action secondary" type="button" onclick="window.print()">打印 / 存 PDF</button>
      </div>
    </section>
    <p class="footer">${isLocalDraft ? 'LOCAL_DRAFT · 本机审核入口' : `ONLINE · AUDIO GUIDES v${guideVersion}`}</p>
  `;

  document.querySelector('#copy-script')?.addEventListener('click', async (event) => {
    const text = guide.chapters.map((chapter, index) =>
      `第${index + 1}章｜${chapter.title}\n\n${chapter.paragraphs.join('\n\n')}`
    ).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      event.currentTarget.textContent = '已复制';
      setTimeout(() => { event.currentTarget.textContent = '复制逐字稿'; }, 1600);
    } catch {
      event.currentTarget.textContent = '复制失败，请手动选择';
    }
  });

  const allAudio = [...document.querySelectorAll('audio')];
  allAudio.forEach((audioElement) => {
    audioElement.addEventListener('play', () => {
      allAudio.forEach((other) => {
        if (other !== audioElement && !other.paused) other.pause();
      });
    });
  });

  document.querySelectorAll('.audio-loop').forEach((button) => {
    button.addEventListener('click', () => {
      const audioElement = button.closest('.audio-controls')?.querySelector('audio');
      if (!audioElement) return;
      audioElement.loop = !audioElement.loop;
      button.classList.toggle('on', audioElement.loop);
      button.setAttribute('aria-pressed', String(audioElement.loop));
      button.textContent = audioElement.loop ? '🔁 循环中' : '🔁';
      if (audioElement.loop && audioElement.paused) audioElement.play().catch(() => {});
    });
  });

  document.querySelectorAll('.audio-speed').forEach((select) => {
    select.addEventListener('change', () => {
      const audioElement = select.closest('.audio-controls')?.querySelector('audio');
      if (audioElement) audioElement.playbackRate = Number(select.value);
    });
  });
})();
