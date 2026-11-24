/* Biberty Analytics V63 — communicates content height to authorized embedding hosts.
 * This cannot resize Wix's fixed HTML Embed element by itself.
 * It supports a custom-element host or another parent page that explicitly handles the message. */
(() => {
  if (window.parent === window) return;
  const fallback = document.getElementById('openStandalone');
  if (fallback) fallback.hidden = false;
  const root = document.querySelector('.wrap');
  if (!root) return;
  let pending = false;
  let lastHeight = 0;
  function sendHeight() {
    pending = false;
    const rect = root.getBoundingClientRect();
    // Measure content, NOT the iframe viewport, so an expanded iframe can shrink.
    const height = Math.ceil(rect.height + Math.max(0,rect.top) + 3);
    if (!Number.isFinite(height) || height < 180 || height > 100000 || Math.abs(height-lastHeight) < 3) return;
    lastHeight = height;
    window.parent.postMessage({type:'biberty-dashboard:height',source:'biberty-analytics',version:1,height},'*');
  }
  function scheduleHeight() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(sendHeight);
  }
  // The ResizeObserver catches route changes, new data, recaps, and report previews.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(scheduleHeight).observe(root);
  }
  window.addEventListener('load',scheduleHeight);
  window.addEventListener('resize',scheduleHeight);
  window.addEventListener('hashchange',scheduleHeight);
  document.addEventListener('change',scheduleHeight);
  document.addEventListener('click',scheduleHeight);
  for (const img of root.querySelectorAll('img')) img.addEventListener('load',scheduleHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleHeight).catch(()=>{});
  scheduleHeight();
})();
