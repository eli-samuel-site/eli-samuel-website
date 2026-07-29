/* eli samuel — site chrome: top bar, slide-out nav, prev/next arrows.
   Project pages set <body data-project="N"> (index into ALLPROJECTS).
   The store sets <body data-page="store">. */
(function(){
  const PHOTO = [
    { num:'01', title:'VERANO',              section:'1.1 VERANO',              file:'index.html'     },
    { num:'02', title:'MODIBODI',            section:'1.2 MODIBODI',            file:'project-2.html' },
    { num:'03', title:'SENSORY STORYTELLING',section:'1.3 SENSORY STORYTELLING',file:'project-3.html' },
    { num:'04', title:'GRUNGE',              section:'1.4 GRUNGE',              file:'project-4.html' },
    { num:'05', title:'SURREALISM',          section:'1.6 SURREALISM',          file:'project-6.html' },
  ];
  const DESIGN = [
    { num:'06', title:'SCRAPBOOK / SCANNER', section:'2.1 SCRAPBOOK / SCANNER', file:'project-5.html' },
  ];
  const STORE = [
    { num:'07', title:'BOOKS & PRINTS', file:'store.html' },
    { num:'08', title:'ALL WORKS',      file:'store.html' },
  ];
  const ALL = PHOTO.concat(DESIGN);   // combined order for prev/next + section labels

  const projAttr = document.body.dataset.project;
  const isStore  = document.body.dataset.page === 'store';
  const idx = projAttr !== undefined ? parseInt(projAttr, 10) : -1;
  const cur = (idx >= 0 && ALL[idx]) ? ALL[idx] : null;
  const curFile    = cur ? cur.file : (isStore ? 'store.html' : 'index.html');
  const rightLabel = cur ? cur.section : 'STORE / EDITIONS';
  const rightNum   = cur ? cur.num : '07';

  const topbar = `
    <div class="topbar">
      <button class="menu-trigger" id="mtrig" aria-label="open menu">
        <span class="ham"><i></i><i></i><i></i></span>
        <span class="wm">Eli Samuel</span>
      </button>
      <div class="tmeta">
        <span><b>Portfolio</b>image maker</span>
        <span><b>V2</b>2026</span>
      </div>
      <div class="tright"><span>${rightLabel}</span><span class="pg">${rightNum}</span></div>
    </div>`;

  const rowsHTML = (arr) => arr.map(p =>
    `<a class="ov-row ${p.file===curFile?'active':''}" href="${p.file}">
       <span class="rn">${p.num}</span><span class="rt">${p.title}</span>
     </a>`).join('');

  const overlay = `
    <div class="overlay" id="overlay">
      <div class="ov-bar">
        <span class="wm">Eli Samuel</span>
        <button class="ov-close" id="mclose">✕ close</button>
      </div>
      <div class="ov-left">
        <h2 class="ov-h">PHOTOGRAPHY</h2>
        ${rowsHTML(PHOTO)}
        <h2 class="ov-h">DESIGN</h2>
        ${rowsHTML(DESIGN)}
        <h2 class="ov-h">STORE</h2>
        ${rowsHTML(STORE)}
      </div>
      <div class="ov-right">
        <div class="ov-img wide" style="background:linear-gradient(160deg,#3f6f86,#12222c);">
          <span class="cap bl"><b></b>darren sacks<br>westcliff on sea, uk<br>id: 491·249</span></div>
        <div class="ov-img" style="background:linear-gradient(160deg,#6a5a4a,#241a12);">
          <span class="cap tr"><b></b>arianna genghini<br>milan, italy<br>id: 465·270</span></div>
        <div class="ov-img" style="background:linear-gradient(160deg,#b06a4a,#3a2016);">
          <span class="cap bl"><b></b>rowan spray<br>london, uk<br>id: 350·186</span></div>
      </div>
    </div>`;

  let arrows = '';
  if(cur){   // prev/next only on project pages, not on the store
    const prev = ALL[(idx - 1 + ALL.length) % ALL.length];
    const next = ALL[(idx + 1) % ALL.length];
    arrows = `
      <a class="corner prev" href="${prev.file}">
        <span class="ar">&larr;</span><span class="lab">prev<br>${prev.title.toLowerCase()}</span>
      </a>
      <a class="corner next" href="${next.file}">
        <span class="lab">next<br>${next.title.toLowerCase()}</span><span class="ar">&rarr;</span>
      </a>`;
  }

  const mount = document.getElementById('chrome');
  if(mount){ mount.innerHTML = topbar + overlay + arrows; }

  /* ---- touch swipe past the start/end of the image strip navigates to the
     prev/next project — a mobile-friendly companion to the corner arrows.
     Only fires once you've swiped past an edge, so it never fights the
     strip's own left/right scrolling of the photos in between. ---- */
  if(cur){
    const prevP = ALL[(idx - 1 + ALL.length) % ALL.length];
    const nextP = ALL[(idx + 1) % ALL.length];
    const strip = document.querySelector('.gallery, .hero-strip');
    if(strip){
      let sx = 0, sy = 0, startAtMin = false, startAtMax = false;
      strip.addEventListener('touchstart', e=>{
        const t = e.touches[0];
        sx = t.clientX; sy = t.clientY;
        startAtMin = strip.scrollLeft <= 4;
        startAtMax = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 4;
      }, {passive:true});
      strip.addEventListener('touchend', e=>{
        const t = e.changedTouches[0];
        const dx = t.clientX - sx, dy = t.clientY - sy;
        if(Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if(dx < 0 && startAtMax){ window.location.href = nextP.file; }      // swiped left past the last photo
        else if(dx > 0 && startAtMin){ window.location.href = prevP.file; } // swiped right past the first photo
      }, {passive:true});
    }
  }

  const ov = document.getElementById('overlay');
  const open  = () => { ov.classList.add('open');  document.body.classList.add('locked'); };
  const close = () => { ov.classList.remove('open'); document.body.classList.remove('locked'); };
  const t = document.getElementById('mtrig'); if(t) t.addEventListener('click', open);
  const c = document.getElementById('mclose'); if(c) c.addEventListener('click', close);
  if(ov) ov.querySelectorAll('.ov-row').forEach(r => r.addEventListener('click', close));
  document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });
})();
