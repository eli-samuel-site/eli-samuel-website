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
    if(!panel) return;

    const h1 = panel.querySelector('h1');
    if(h1 && data.title) h1.innerHTML = esc(data.title).replace(/\n/g,'<br>');

    const st = panel.querySelector('.subrow .st');
    if(st && data.subtitle) st.textContent = data.subtitle;

    /* credits block (Verano-style pages) */
    const credits = panel.querySelector('.credits');
    if(credits){
      let html = '';
      if(data.intro) html += `<p class="lead">${linkify(data.intro)}</p>`;
      (data.credits || []).forEach(row => {
        const people = (row.people || []).map(p => {
          const nm = esc(p.name || '');
          return p.instagram
            ? `<div>${nm} (<a href="https://instagram.com/${esc(p.instagram)}" target="_blank" rel="noopener">@${esc(p.instagram)}</a>)</div>`
            : `<div>${nm}</div>`;
        }).join('');
        if(!people) return;
        html += `<div class="crow"><div class="clabel">${esc(row.label || '')}</div>
                 <div class="cnames">${people}</div></div>`;
      });
      if(html) credits.innerHTML = html;
    }

    /* three-column body copy (trend-report style pages) */
    const cols = panel.querySelector('.cols');
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
      const gallery = document.querySelector('.gallery');
      const collage = document.querySelectorAll('.collage .ctile');
      const fore = document.querySelectorAll('.foreimg');
      const qcols = document.querySelectorAll('.qcol');

      if(strip && media.length)        renderStrip(strip, media);
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
