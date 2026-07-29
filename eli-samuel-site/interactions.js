/* eli samuel — shared interactions:
   (1) drag/wheel horizontal scroll for any .gallery filmstrip
   (2) a universal lightbox for any .lb-item or .shot on the page */
(function(){
  /* ---------- gallery drag / wheel ---------- */
  let dragMoved = false;
  const strip = document.querySelector('.gallery');
  if(strip){
    let down=false, startX=0, startLeft=0;
    strip.addEventListener('pointerdown', e=>{
      // On touch, let the browser's native momentum scrolling handle it (feels right on phones).
      if(e.pointerType && e.pointerType !== 'mouse') return;
      down=true; dragMoved=false; startX=e.clientX; startLeft=strip.scrollLeft;
      strip.classList.add('dragging'); strip.setPointerCapture(e.pointerId);
    });
    strip.addEventListener('pointermove', e=>{
      if(!down) return;
      const dx=e.clientX-startX;
      if(Math.abs(dx)>4) dragMoved=true;
      strip.scrollLeft = startLeft - dx;
    });
    const end=()=>{ down=false; strip.classList.remove('dragging'); };
    strip.addEventListener('pointerup', end);
    strip.addEventListener('pointercancel', end);
    strip.addEventListener('wheel', e=>{
      if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){ strip.scrollLeft += e.deltaY; e.preventDefault(); }
    }, {passive:false});
  }

  /* ---------- universal lightbox ---------- */
  const items = Array.from(document.querySelectorAll('.lb-item, .shot'));
  if(!items.length) return;

  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `
    <span class="lb-count" id="lbCount"></span>
    <button class="lb-close" id="lbClose">✕ close</button>
    <button class="lb-nav prev" id="lbPrev" aria-label="previous">&larr;</button>
    <button class="lb-nav next" id="lbNext" aria-label="next">&rarr;</button>
    <div class="lb-stage"><div class="lb-img" id="lbImg"></div><div class="lb-cap" id="lbCap"></div></div>`;
  document.body.appendChild(lb);
  const lbImg=lb.querySelector('#lbImg'), lbCap=lb.querySelector('#lbCap'), lbCount=lb.querySelector('#lbCount');
  let cur=0;

  function bgOf(item){
    const im = item.querySelector('.img') || item;
    return im.style.background || im.style.backgroundImage || getComputedStyle(im).backgroundImage;
  }
  function render(){
    const it=items[cur];
    lbImg.style.background = bgOf(it);
    lbImg.style.backgroundSize='cover'; lbImg.style.backgroundPosition='center';
    const c=it.querySelector('.cap');
    lbCap.innerHTML = c ? c.innerHTML : '';
    lbCount.textContent = ('0'+(cur+1)).slice(-2)+' / '+('0'+items.length).slice(-2);
  }
  function open(i){ cur=i; render(); lb.classList.add('open'); document.body.classList.add('locked'); }
  function close(){ lb.classList.remove('open'); document.body.classList.remove('locked'); }
  function step(d){ cur=(cur+d+items.length)%items.length; render(); }

  items.forEach((it,i)=>{
    it.style.cursor='zoom-in';
    it.addEventListener('click', e=>{
      if(dragMoved) return;                 // ignore a drag on the filmstrip
      if(it.tagName==='A') e.preventDefault();
      open(i);
    });
  });
  lb.querySelector('#lbClose').addEventListener('click', close);
  lb.querySelector('#lbPrev').addEventListener('click', e=>{ e.stopPropagation(); step(-1); });
  lb.querySelector('#lbNext').addEventListener('click', e=>{ e.stopPropagation(); step(1); });
  lb.addEventListener('click', e=>{ if(e.target===lb) close(); });
  document.addEventListener('keydown', e=>{
    if(!lb.classList.contains('open')) return;
    if(e.key==='Escape') close();
    else if(e.key==='ArrowLeft') step(-1);
    else if(e.key==='ArrowRight') step(1);
  });
})();
