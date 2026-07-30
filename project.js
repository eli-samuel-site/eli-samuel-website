/* eli samuel — project renderer.
   Reads <body data-slug="verano"> and fills the page from data/projects/<slug>.json,
   so photos, captions, copy and credits are all editable in the CMS at /admin
   without touching HTML.

   Layout containers it knows how to fill:
     .hero-strip  — generates a tile per media item (Verano-style horizontal strip)
     .gallery     — generates a .shot per media item (carousel pages)
     .collage / .qcol / .foreimg — fills the EXISTING fixed slots in order, so the
                    bespoke collage and quote-spread designs keep their exact
                    positions and only the imagery changes.

   Runs before interactions.js so the lightbox binds to the rendered tiles. */
(function(){
  const slug = document.body.dataset.slug;
  if(!slug) return;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  /* turn "@handle" into an instagram link, so captions/copy stay plain text in the CMS */
  const linkify = s => esc(s).replace(/@([A-Za-z0-9._]+)/g,
    '<a href="https://instagram.com/$1" target="_blank" rel="noopener">@$1</a>');

  const fill = m => m.video
    ? `url('${m.poster || ''}') center/cover no-repeat`
    : `url('${m.image || ''}') center/cover no-repeat`;

  /* caption block: "title" + optional id line */
  const capHTML = m => {
    if(!m.caption && !m.id) return '';
    const parts = [];
    if(m.caption) parts.push(linkify(m.caption));
    if(m.id) parts.push('id: ' + esc(m.id));
    return `<div class="cap"><b></b>${parts.join('<br>')}</div>`;
  };

  const videoAttrs = m => m.video
    ? ` data-video="${esc(m.video)}" data-poster="${esc(m.poster || '')}"` : '';
  const playBtn = m => m.video ? '<span class="playbtn"></span>' : '';

  function renderStrip(el, media){
    el.innerHTML = media.map(m => `
      <div class="hcell${m.wide ? ' wide' : ''} lb-item"${videoAttrs(m)}
           style="background:${fill(m)}">
        ${playBtn(m)}${capHTML(m)}
      </div>`).join('');
  }

  /* masonry mosaic (client pages). Each frame keeps its real orientation, so
     nothing gets cropped to satisfy the layout. An item with a "marker" instead
     of an image renders as a full-width section heading ("TOSSA|DE MAR"). */
  function renderMosaic(el, media){
    el.innerHTML = media.map(m => {
      if(m.marker){
        const parts = String(m.marker).split('|');
        return `<div class="mb-marker">
          <span class="m1">${esc(parts[0] || '')}</span><span class="m2">${esc(parts[1] || '')}</span>
          <span class="line"></span></div>`;
      }
      const size = m.size || (m.wide ? 'land' : 'port');
      return `
      <div class="mtile ${size} lb-item"${videoAttrs(m)}>
        <div class="img" style="position:absolute;inset:0;background:${fill(m)}"></div>
        ${playBtn(m)}${capHTML(m)}
      </div>`;
    }).join('');
    layoutMosaic(el);
  }

  /* measure each tile's real height and convert it to a grid row span, so the
     grid packs like masonry while keeping strict left-to-right DOM order */
  function layoutMosaic(el){
    const gap = 12;
    el.querySelectorAll('.mtile, .mb-marker').forEach(t => {
      t.style.gridRowEnd = 'auto';
      const h = t.getBoundingClientRect().height;
      if(h) t.style.gridRowEnd = 'span ' + (Math.ceil(h) + gap);
    });
  }
  let relayout;
  window.addEventListener('resize', () => {
    clearTimeout(relayout);
    relayout = setTimeout(() => {
      const el = document.querySelector('.mosaic');
      if(el) layoutMosaic(el);
    }, 150);
  });

  /* lookbook — walks the media in order and lays it into varied editorial
     spreads. A "marker" item starts a new chapter; a video always gets a full
     spread to itself. The rhythm repeats every 11 frames so a long edit keeps
     changing shape instead of settling into a grid. */
  const SPREADS = [
    {cls:'solo',        n:1},
    {cls:'duo',         n:2},
    {cls:'offset',      n:2},
    {cls:'full',        n:1},
    {cls:'trio',        n:3},
    {cls:'solo right',  n:1},
    {cls:'duo',         n:2},
  ];
  function frameHTML(m, tape){
    return `<div class="frame${tape ? ' taped' : ''} lb-item"${videoAttrs(m)}>
      <div class="img" style="background:${fill(m)}"></div>
      ${playBtn(m)}${capHTML(m)}
    </div>`;
  }
  function renderLookbook(el, media){
    let html = '', si = 0, chapter = 0, i = 0, frameNo = 0;
    while(i < media.length){
      const m = media[i];

      if(m.marker){
        chapter++;
        const parts = String(m.marker).split('|');
        html += `<div class="lb-chapter">
          <span class="num">${String(chapter).padStart(2,'0')}</span>
          <span class="ttl">${esc(parts[0]||'')}${parts[1] ? ' <em>'+esc(parts[1])+'</em>' : ''}</span>
          <span class="rule"></span></div>`;
        i++; si = 0;
        continue;
      }

      // a film always gets the room of a full spread
      if(m.video){
        html += `<div class="sp full">${frameHTML(m)}</div>`;
        i++; frameNo++;
        continue;
      }

      const spread = SPREADS[si % SPREADS.length]; si++;
      const group = [];
      while(group.length < spread.n && i < media.length && !media[i].marker && !media[i].video){
        group.push(media[i]); i++;
      }
      if(!group.length) continue;

      const cls = group.length < spread.n ? 'solo' : spread.cls;   // short tail falls back
      let inner = group.map((g, k) => {
        frameNo++;
        return frameHTML(g, cls.startsWith('solo') && k === 0 && frameNo % 5 === 0);
      }).join('');

      if(cls.startsWith('solo')){
        const g = group[0];
        inner += `<div class="note">${esc(g.caption || '')}${g.id ? '<br>'+esc(g.id) : ''}</div>`;
      }
      html += `<div class="sp ${cls}">${inner}</div>`;
    }
    el.innerHTML = html;
  }

  function renderGallery(el, media){
    el.innerHTML = media.map(m => `
      <div class="shot${m.wide ? ' wide' : ''}"${videoAttrs(m)}>
        <div class="img" style="background:${fill(m)}"></div>
        ${playBtn(m)}${capHTML(m) ? capHTML(m).replace('class="cap"','class="cap bl"') : ''}
        <span class="expand">view &#10530;</span>
      </div>`).join('');
  }

  /* fill fixed, pre-positioned slots (collage tiles, quote columns, foreground images) */
  function fillSlots(slots, media){
    slots.forEach((slot, i) => {
      const m = media[i];
      if(!m) return;
      const img = slot.querySelector('.img');
      if(img) img.style.background = fill(m);
      else slot.style.background = fill(m);

      if(m.video){
        slot.setAttribute('data-video', m.video);
        slot.setAttribute('data-poster', m.poster || '');
        if(!slot.querySelector('.playbtn')){
          const b = document.createElement('span'); b.className = 'playbtn'; slot.appendChild(b);
        }
      }
      const existing = slot.querySelector('.cap');
      if(existing && (m.caption || m.id)){
        const keep = existing.className;                 // preserve .cap.tl / .cap.bl / .cap.tr
        existing.outerHTML = capHTML(m).replace('class="cap"', `class="${keep}"`);
      }
    });
  }

  function renderPanel(data){
    const panel = document.querySelector('.panel');

    /* title. A "|" splits it into two colour-able halves, e.g. "MODI|BODI" */
    const h1 = document.querySelector('.js-title') || (panel && panel.querySelector('h1'));
    if(h1 && data.title){
      h1.innerHTML = data.title.includes('|')
        ? data.title.split('|').map((part,i) =>
            `<span class="t${i+1}">${esc(part)}</span>`).join('')
        : esc(data.title).replace(/\n/g,'<br>');
    }

    const st = document.querySelector('.js-subtitle') || (panel && panel.querySelector('.subrow .st'));
    if(st && data.subtitle) st.textContent = data.subtitle;

    /* free-text lede, separate from the credits block */
    const lede = document.querySelector('.js-lede');
    if(lede && data.intro){
      lede.innerHTML = String(data.intro).split(/\n{2,}/)
        .map(p => `<p>${linkify(p)}</p>`).join('');
    }

    /* credits block */
    const credits = document.querySelector('.credits');
    if(credits){
      let html = '';
      if(data.intro && !lede) html += `<p class="lead">${linkify(data.intro)}</p>`;
      (data.credits || []).forEach(row => {
        const people = (row.people || []).map(p => {
          const nm = esc(p.name || '');
          if(p.instagram)
            return `<div>${nm} (<a href="https://instagram.com/${esc(p.instagram)}" target="_blank" rel="noopener">@${esc(p.instagram)}</a>)</div>`;
          if(p.url)
            return `<div><a href="${esc(p.url)}" target="_blank" rel="noopener">${nm}</a></div>`;
          return `<div>${nm}</div>`;
        }).join('');
        if(!people) return;
        html += `<div class="crow"><div class="clabel">${esc(row.label || '')}</div>
                 <div class="cnames">${people}</div></div>`;
      });
      if(html) credits.innerHTML = html;
    }

    /* three-column body copy (trend-report style pages) */
    const cols = panel && panel.querySelector('.cols');
    if(cols && Array.isArray(data.columns) && data.columns.length){
      cols.innerHTML = data.columns.map(col =>
        `<div>${(col.paragraphs || []).map(p => `<p>${linkify(p)}</p>`).join('')}</div>`
      ).join('');
    }
  }

  fetch('data/projects/' + slug + '.json', {cache:'no-cache'})
    .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      const media = Array.isArray(data.media) ? data.media : [];

      const strip = document.querySelector('.hero-strip');
      const lookbook = document.querySelector('.lookbook');
      const mosaic = document.querySelector('.mosaic');
      const gallery = document.querySelector('.gallery');
      const collage = document.querySelectorAll('.collage .ctile');
      const fore = document.querySelectorAll('.foreimg');
      const qcols = document.querySelectorAll('.qcol');

      if(lookbook && media.length)     renderLookbook(lookbook, media);
      else if(strip && media.length)   renderStrip(strip, media);
      else if(mosaic && media.length)  renderMosaic(mosaic, media);
      else if(gallery && media.length) renderGallery(gallery, media);
      else if(collage.length){
        fillSlots(Array.from(collage), media);
        if(fore.length) fillSlots(Array.from(fore), media.slice(collage.length));
      }
      else if(qcols.length){
        // split across the two columns: left gets the first half (rounded up)
        const items = Array.from(qcols).map(c => Array.from(c.children));
        const leftCount = items[0] ? items[0].length : 0;
        fillSlots(items[0] || [], media.slice(0, leftCount));
        fillSlots(items[1] || [], media.slice(leftCount));
      }

      renderPanel(data);
      document.dispatchEvent(new CustomEvent('project:rendered'));
    })
    .catch(err => {
      // leave whatever is already in the HTML in place — the page still works
      console.warn('project data not loaded for "' + slug + '":', err.message);
      document.dispatchEvent(new CustomEvent('project:rendered'));
    });
})();
