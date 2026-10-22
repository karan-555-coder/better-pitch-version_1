// Site-wide motion (styles in theme.css), injected into every HTML page by
// server.js:
//  - a playful layer (glow blobs, rising bubbles, a pulsing ring) appended to
//    the roomy sections, behind their content;
//  - sections, headings and cards fading up as they scroll into view.
// Like content.js it waits for React to hydrate. The reveal only sets a data
// attribute (never class or style), so React re-renders don't fight it; the
// playful layer is re-added if a re-render drops it. Things already on screen
// when the page opens are not hidden.
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOSTS = 'main section.bg-gradient-hero, main section.bg-secondary-light-ivory, main .bg-white.rounded-2xl.py-16';
  const TARGETS = 'main section, main h2, main .rounded-2xl.bg-white, main .rounded-3xl.bg-white';

  const rand = (a, b) => a + Math.random() * (b - a);
  // mostly near the left/right edges, where these sections are empty
  const sideX = () => (Math.random() < .5 ? rand(-6, 22) : rand(78, 100));

  function playLayer() {
    const box = document.createElement('div');
    box.className = 'bp-play';
    box.setAttribute('aria-hidden', 'true');
    let html = '';
    for (let i = 0; i < 3; i++) {
      html += `<i class="bp-blob${i === 1 ? ' amber' : ''}" style="--s:${rand(220, 340) | 0}px;left:${sideX() - 10}%;top:${rand(0, 65) | 0}%;` +
        `--x1:${rand(-70, 70) | 0}px;--y1:${rand(-50, 50) | 0}px;--x2:${rand(-70, 70) | 0}px;--y2:${rand(-50, 50) | 0}px;` +
        `--t:${rand(7, 11).toFixed(1)}s;--d:${-rand(0, 8).toFixed(1)}s"></i>`;
    }
    for (let i = 0; i < 5; i++) {
      const x = Math.random() < .7 ? sideX() : rand(25, 75);
      html += `<i class="bp-bubble" style="--s:${rand(7, 18) | 0}px;left:${x.toFixed(1)}%;--sway:${rand(-40, 40) | 0}px;` +
        `--t:${rand(6, 10).toFixed(1)}s;--d:${-rand(0, 10).toFixed(1)}s"></i>`;
    }
    html += `<i class="bp-ring" style="--s:${rand(130, 200) | 0}px;left:${sideX() - 6}%;top:${rand(10, 70) | 0}%;--t:${rand(4, 6).toFixed(1)}s;--d:${-rand(0, 4).toFixed(1)}s"></i>`;
    box.innerHTML = html;
    return box;
  }

  function decorate() {
    for (const el of document.querySelectorAll(HOSTS)) {
      if (el.closest('#bp-hero')) continue;
      // React may rewrite className on a re-render, so this is re-checked too
      if (!el.classList.contains('bp-host')) el.classList.add('bp-host');
      if (!el.querySelector(':scope > .bp-play')) el.appendChild(playLayer());
    }
  }

  function reveal() {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        el.dataset.bpReveal = 'in';
        // hand the element its own transitions back once it has arrived
        setTimeout(() => { el.removeAttribute('data-bp-reveal'); el.style.removeProperty('--bp-delay'); }, 1600);
      }
    // threshold 0, not a fraction: a fraction of a very tall section may never fit on screen
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    const vh = innerHeight;
    const seen = new Map();
    for (const el of document.querySelectorAll(TARGETS)) {
      if (el.closest('#bp-hero')) continue;
      // a section inside one that is already fading in would just double up
      if (el.tagName === 'SECTION' && el.parentElement.closest('[data-bp-reveal]')) continue;
      const r = el.getBoundingClientRect();
      if (!r.height || r.top < vh) continue;
      // small stagger between siblings, e.g. a row of cards
      const n = seen.get(el.parentNode) || 0;
      seen.set(el.parentNode, n + 1);
      if (n) el.style.setProperty('--bp-delay', Math.min(n, 5) * 0.08 + 's');
      el.dataset.bpReveal = 'wait';
      io.observe(el);
    }
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    decorate();
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; decorate(); });
    }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
    if (!reduced) reveal();
  }
  window.addEventListener('load', () => setTimeout(start, 600));
  setTimeout(start, 4500);
})();
