// artisan.co locks <html>/<body> (overflow: hidden) and scrolls inside
// #page-scroller, so window.scrollTo() does nothing. These helpers find the
// element that really scrolls and drive it.

// Runs in the page: returns the tallest scrollable element (or the document).
function findScroller() {
  const byId = document.getElementById('page-scroller');
  if (byId && byId.scrollHeight > byId.clientHeight) return byId;
  let best = document.scrollingElement;
  for (const el of document.querySelectorAll('body *')) {
    if (el.scrollHeight > el.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)
      && el.clientHeight > window.innerHeight / 2 && el.scrollHeight > best.scrollHeight) best = el;
  }
  return best;
}

// Scrolls top to bottom in half-viewport steps so lazy content loads, then back to top.
async function scrollThrough(page, delay = 250) {
  await page.evaluate(async (findSrc, delay) => {
    const sc = new Function('return ' + findSrc)()();
    for (let y = 0, i = 0; y < sc.scrollHeight && i < 120; y += window.innerHeight / 2, i++) {
      sc.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, delay));
    }
    sc.scrollTo(0, 0);
  }, findScroller.toString(), delay);
}

// Scrolls to y; returns { y: actual position, height: total scroll height }.
function scrollTo(page, y) {
  return page.evaluate((findSrc, y) => {
    const sc = new Function('return ' + findSrc)()();
    sc.scrollTo(0, y);
    return { y: sc.scrollTop, height: sc.scrollHeight };
  }, findScroller.toString(), y);
}

module.exports = { scrollThrough, scrollTo };
