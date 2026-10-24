(() => {
  document.querySelectorAll('[data-directory-carousel]').forEach(root => {
    const track = root.querySelector('.directory-track');
    const controls = root.querySelector('.directory-controls');
    const pause = root.querySelector('[data-directory-pause]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches, hovering = false, focused = false;
    const hasOverflow = () => track.scrollWidth > track.clientWidth + 2;
    function move(direction, automatic = false) {
      if (!hasOverflow()) return;
      const step = track.querySelector('a').getBoundingClientRect().width + 16;
      const max = track.scrollWidth - track.clientWidth;
      const left = direction > 0
        ? (track.scrollLeft >= max - 2 ? 0 : Math.min(max, track.scrollLeft + step))
        : (track.scrollLeft <= 2 ? max : Math.max(0, track.scrollLeft - step));
      track.scrollTo({left: Math.max(0, Math.min(max, left)), behavior: reduced.matches ? 'instant' : 'smooth'});
      if (!automatic) { paused = true; update(); }
    }
    function update() {
      controls.hidden = !hasOverflow();
      pause.textContent = paused ? 'Play' : 'Pause';
      pause.setAttribute('aria-label', paused ? 'Play directory carousel' : 'Pause directory carousel');
    }
    root.querySelector('[data-directory-prev]').addEventListener('click', () => move(-1));
    root.querySelector('[data-directory-next]').addEventListener('click', () => move(1));
    pause.addEventListener('click', () => { paused = !paused; update(); });
    root.addEventListener('mouseenter', () => { hovering = true; });
    root.addEventListener('mouseleave', () => { hovering = false; });
    root.addEventListener('focusin', () => { focused = true; });
    root.addEventListener('focusout', e => { focused = root.contains(e.relatedTarget); });
    track.addEventListener('pointerdown', () => { paused = true; update(); });
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1);
      }
    });
    reduced.addEventListener('change', () => { if (reduced.matches) paused = true; update(); });
    const observer = new IntersectionObserver(entries => { root.dataset.visible = String(entries[0].isIntersecting); });
    observer.observe(root);
    new ResizeObserver(update).observe(track);
    setInterval(() => {
      if (!paused && !hovering && !focused && !document.hidden && root.dataset.visible === 'true') move(1, true);
    }, 5000);
    update();
  });
})();
