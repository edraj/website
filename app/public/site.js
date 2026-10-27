/* dmart website shell. Plain ES2019, no modules, no dependencies.
 *
 * Loaded synchronously in <head> so the theme class is on <html> before the
 * first paint. Everything that touches the body waits for DOMContentLoaded;
 * mermaid (when the page has diagrams) is a deferred script, so it has run by
 * then. The page is served with a script-src that forbids inline script, so
 * every behaviour lives here and is wired with addEventListener. */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'theme';
  var DARK_QUERY = '(prefers-color-scheme: dark)';

  function storedTheme() {
    try {
      var value = window.localStorage.getItem(THEME_KEY);
      return value === 'dark' || value === 'light' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function systemPrefersDark() {
    try {
      return !!(window.matchMedia && window.matchMedia(DARK_QUERY).matches);
    } catch (e) {
      return false;
    }
  }

  function isDark() {
    return root.classList.contains('dark');
  }

  // `dark` is the contract. `light` is set alongside it so the CSS fallback
  // (prefers-color-scheme with no class, i.e. scripts disabled) can be
  // switched off once a choice has been made here.
  function applyTheme(dark) {
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
  }

  // (a) Before first paint.
  try {
    var initial = storedTheme();
    applyTheme(initial ? initial === 'dark' : systemPrefersDark());
  } catch (e) {
    /* leave the CSS media-query fallback in charge */
  }
  root.classList.add('js');

  /* ── Mermaid ─────────────────────────────────────────────────────────── */

  var diagrams = [];
  var diagramQueue = null;

  // A diagram that cannot be drawn (no mermaid, or a syntax error) shows its
  // source instead of staying blank; see `pre.mermaid` in site.css.
  function markDiagramsAsSource() {
    for (var i = 0; i < diagrams.length; i++) {
      if (!diagrams[i].querySelector('svg')) diagrams[i].classList.add('mermaid-source');
    }
  }

  function setPending(pending) {
    for (var i = 0; i < diagrams.length; i++) {
      diagrams[i].classList.toggle('mermaid-pending', pending);
    }
  }

  function renderDiagramsNow() {
    var mermaid = window.mermaid;
    if (!mermaid || typeof mermaid.run !== 'function') {
      markDiagramsAsSource();
      return null;
    }
    for (var i = 0; i < diagrams.length; i++) {
      var el = diagrams[i];
      el.removeAttribute('data-processed');
      el.classList.remove('mermaid-source');
      el.textContent = el.getAttribute('data-original');
    }
    setPending(true);
    function done() {
      setPending(false);
    }
    function failed() {
      setPending(false);
      markDiagramsAsSource();
    }
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark() ? 'dark' : 'neutral',
        // Labels in the page's own font, not mermaid's trebuchet/verdana stack.
        fontFamily: diagramFont(),
        // HTML labels only switch to wrapping when their measured width
        // EQUALS the wrapping width, which fractional device-pixel ratios
        // never produce, so long labels were clipped instead (dmart.cc showed
        // "Space: managen"). SVG labels are wrapped by mermaid itself, at word
        // boundaries; the wider limit stops it breaking mid-word.
        htmlLabels: false,
        flowchart: { htmlLabels: false, wrappingWidth: 400 }
      });
      var result = mermaid.run({ nodes: diagrams });
      if (result && typeof result.then === 'function') {
        return result.then(done, failed);
      }
      done();
      return null;
    } catch (e) {
      failed();
      return null;
    }
  }

  // Renders are chained so a quick double toggle cannot interleave two runs
  // over the same nodes.
  function renderDiagrams() {
    if (!diagrams.length) return;
    if (typeof Promise === 'undefined') {
      renderDiagramsNow();
      return;
    }
    diagramQueue = (diagramQueue || Promise.resolve()).then(renderDiagramsNow, renderDiagramsNow);
  }

  // Diagrams are drawn after the browser has scrolled to the URL's #section,
  // and they make the page above it taller. Scroll anchoring would make up
  // for that, but the browser does not anchor inside the docs grid; so once
  // they are drawn, a visitor who has not moved since is put back on it.
  var movedSinceLoad = false;

  function keepHashInView() {
    var id = window.location.hash.slice(1);
    if (!id || movedSinceLoad) return;
    try {
      id = decodeURIComponent(id);
    } catch (e) {
      /* use it as it is */
    }
    var target = document.getElementById(id);
    if (target) target.scrollIntoView();
  }

  function renderFirst() {
    renderDiagrams();
    if (diagramQueue) diagramQueue.then(keepHashInView);
  }

  function diagramFont() {
    try {
      return window.getComputedStyle(document.body).fontFamily || 'sans-serif';
    } catch (e) {
      return 'sans-serif';
    }
  }

  function initDiagrams() {
    var nodes = document.querySelectorAll('pre.mermaid');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('data-original', nodes[i].textContent);
      diagrams.push(nodes[i]);
    }
    if (!diagrams.length) return;
    var moved = function () {
      movedSinceLoad = true;
    };
    var kinds = ['wheel', 'touchstart', 'keydown', 'mousedown'];
    for (var k = 0; k < kinds.length; k++) window.addEventListener(kinds[k], moved, { once: true, passive: true });

    // Measure with the web font, not its fallback: wait (briefly) for it.
    var fonts = document.fonts;
    if (!fonts || typeof fonts.load !== 'function' || typeof Promise === 'undefined') {
      renderFirst();
      return;
    }
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      renderFirst();
    };
    window.setTimeout(start, 1500);
    Promise.all([fonts.load('400 16px "IBM Plex Sans"'), fonts.load('600 16px "IBM Plex Sans"')]).then(start, start);
  }

  /* ── Theme toggle ────────────────────────────────────────────────────── */

  function syncToggles() {
    var dark = isDark();
    var toggles = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
      toggles[i].setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function setTheme(dark, persist) {
    if (dark === isDark()) return;
    applyTheme(dark);
    if (persist) {
      try {
        window.localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
      } catch (e) {
        /* private mode or storage disabled: the choice lasts for this page */
      }
    }
    syncToggles();
    renderDiagrams();
    try {
      window.dispatchEvent(new CustomEvent('themechange', { detail: { dark: dark } }));
    } catch (e) {
      /* very old browsers */
    }
  }

  function initThemeToggle() {
    var toggles = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', function () {
        setTheme(!isDark(), true);
      });
    }
    syncToggles();

    // Follow the OS setting live until the visitor makes a choice.
    try {
      var mq = window.matchMedia && window.matchMedia(DARK_QUERY);
      if (mq) {
        var onChange = function (e) {
          if (!storedTheme()) setTheme(e.matches, false);
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
      }
    } catch (e) {
      /* ignore */
    }
  }

  /* ── Docs drawer ─────────────────────────────────────────────────────── */

  function initDrawer() {
    var toggle = document.querySelector('.nav-toggle');
    if (!toggle) return;
    var sidebar = document.getElementById(toggle.getAttribute('aria-controls') || 'sidebar');
    if (!sidebar) {
      toggle.hidden = true;
      return;
    }
    var scrim = document.querySelector('.nav-scrim');
    var narrow = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      sidebar.classList.add('open');
      document.body.classList.add('nav-open');
      if (scrim) scrim.hidden = false;
      var target = sidebar.querySelector('a[aria-current="page"]') || sidebar.querySelector('a');
      if (target) {
        // After the drawer becomes visible, or focus() is a no-op.
        window.setTimeout(function () {
          target.focus();
        }, 30);
      }
    }

    function close(restoreFocus) {
      if (!isOpen()) return;
      var hadFocus = sidebar.contains(document.activeElement);
      toggle.setAttribute('aria-expanded', 'false');
      sidebar.classList.remove('open');
      document.body.classList.remove('nav-open');
      if (scrim) scrim.hidden = true;
      if (restoreFocus || hadFocus) toggle.focus();
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) close(true);
      else open();
    });

    if (scrim) {
      scrim.addEventListener('click', function () {
        close(true);
      });
    }

    sidebar.addEventListener('click', function (e) {
      var node = e.target;
      while (node && node !== sidebar) {
        if (node.tagName === 'A') {
          close(false);
          return;
        }
        node = node.parentNode;
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) {
        close(true);
      }
    });

    // Widening the window past the breakpoint turns the drawer back into a
    // column; do not leave a scrim or a stale aria-expanded behind.
    if (narrow) {
      var onWidth = function (e) {
        if (!e.matches) close(false);
      };
      if (narrow.addEventListener) narrow.addEventListener('change', onWidth);
      else if (narrow.addListener) narrow.addListener(onWidth);
    }
  }

  /* ── Copy buttons ────────────────────────────────────────────────────── */

  // The async clipboard API first; if it refuses, or never answers (seen in
  // embedded and automated browsers), fall back to execCommand.
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return new Promise(function (resolve, reject) {
        var settled = false;
        var fallback = function () {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          execCopy(text).then(resolve, reject);
        };
        var timer = window.setTimeout(fallback, 1000);
        navigator.clipboard.writeText(text).then(function () {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve();
        }, fallback);
      });
    }
    return execCopy(text);
  }

  function execCopy(text) {
    return new Promise(function (resolve, reject) {
      var active = document.activeElement;
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.className = 'copy-buffer';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(area);
      if (active && typeof active.focus === 'function') active.focus();
      if (ok) resolve();
      else reject(new Error('copy failed'));
    });
  }

  function initCopyButtons() {
    var blocks = document.querySelectorAll('.prose pre > code');
    for (var i = 0; i < blocks.length; i++) {
      (function (code) {
        var pre = code.parentNode;
        if (!pre || pre.classList.contains('mermaid')) return;
        if (pre.parentNode && pre.parentNode.classList && pre.parentNode.classList.contains('code-block')) return;

        var wrap = document.createElement('div');
        wrap.className = 'code-block';
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.setAttribute('aria-label', 'Copy code to clipboard');
        wrap.appendChild(button);

        var timer = 0;
        function flash(label) {
          button.textContent = label;
          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            button.textContent = 'Copy';
            button.classList.remove('copied');
          }, 1600);
        }

        button.addEventListener('click', function () {
          copyText(code.textContent.replace(/\n$/, '')).then(
            function () {
              button.classList.add('copied');
              flash('Copied');
            },
            function () {
              // Clipboard refused: select the code so a manual copy works.
              try {
                var range = document.createRange();
                range.selectNodeContents(code);
                var selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
              } catch (e) {
                /* nothing more to do */
              }
              flash('Press Ctrl+C');
            }
          );
        });
      })(blocks[i]);
    }
  }

  /* ── Explainer ───────────────────────────────────────────────────────── */

  // Plays an explainer figure one scene at a time. A scene is a
  // <g class="sc"> in the SVG; the `on` class shows it and starts its CSS
  // animations, and removing the class resets them, so replaying a scene is
  // remove, reflow, add. Everything animates FROM an offset state TO the
  // element's own resting pose, so with animations off (reduced motion) a
  // scene simply shows its finished state.
  var SCENE_MS = 6000;

  function initExplainer(box) {
    var scenes = box.querySelectorAll('.sc');
    var captions = box.querySelectorAll('.scene');
    var jumps = box.querySelectorAll('.scene-jump');
    var toggle = box.querySelector('.explainer-toggle');
    var count = Math.min(scenes.length, captions.length);
    if (count === 0) return;

    var reduced = false;
    try {
      reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      /* animate */
    }

    var current = -1;
    var timer = null;
    var startedAt = 0;
    var remaining = SCENE_MS;
    var playing = !reduced;
    var visible = false;
    var started = false;

    function show(index) {
      current = index;
      for (var i = 0; i < count; i++) {
        scenes[i].classList.remove('on');
        captions[i].classList.remove('is-on');
        if (jumps[i]) jumps[i].setAttribute('aria-current', i === index ? 'step' : 'false');
      }
      // Reflow between remove and add, so a scene shown twice in a row
      // restarts its animations instead of keeping their finished state.
      void box.offsetWidth;
      scenes[index].classList.add('on');
      captions[index].classList.add('is-on');
    }

    function stop() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
        remaining = Math.max(0, remaining - (Date.now() - startedAt));
      }
    }

    function run(ms) {
      stop();
      if (!playing || !visible) return;
      remaining = ms;
      startedAt = Date.now();
      timer = window.setTimeout(function () {
        timer = null;
        show((current + 1) % count);
        run(SCENE_MS);
      }, ms);
    }

    function setPlaying(value) {
      playing = value;
      box.classList.toggle('is-paused', !value && !reduced);
      if (toggle) {
        toggle.setAttribute('aria-pressed', value ? 'false' : 'true');
        toggle.textContent = value ? 'Pause' : 'Play';
      }
      if (value) run(remaining > 0 ? remaining : SCENE_MS);
      else stop();
    }

    function jump(index) {
      show(index);
      remaining = SCENE_MS;
      // Choosing a scene means watching it: resume, unless motion is off.
      if (!reduced && !playing) setPlaying(true);
      else run(SCENE_MS);
    }

    box.classList.add('is-live');
    if (reduced) box.classList.add('is-reduced');
    for (var i = 0; i < count; i++) {
      if (!jumps[i]) continue;
      jumps[i].disabled = false;
      jumps[i].addEventListener('click', (function (index) {
        return function () { jump(index); };
      })(i));
    }
    if (toggle && !reduced) {
      toggle.hidden = false;
      toggle.addEventListener('click', function () { setPlaying(!playing); });
    }
    show(0);

    // Start from the first scene when it first scrolls into view, and stop
    // the clock (and the animations) while it is off screen.
    function setVisible(value) {
      visible = value;
      box.classList.toggle('is-offscreen', !value);
      if (value && !started) {
        started = true;
        show(0);
        remaining = SCENE_MS;
      }
      if (value) run(remaining > 0 ? remaining : SCENE_MS);
      else stop();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        setVisible(entries[entries.length - 1].isIntersecting);
      }, { threshold: 0.35 }).observe(box);
    } else {
      setVisible(true);
    }
  }

  function initExplainers() {
    var boxes = document.querySelectorAll('.explainer');
    for (var i = 0; i < boxes.length; i++) initExplainer(boxes[i]);
  }

  /* ── Search ──────────────────────────────────────────────────────────── */

  // The index is one JSON file the build writes (scripts/search-index.mjs):
  // every page cut into sections at its h2–h4 headings, as plain text. It is
  // fetched the first time the dialog opens, or when the pointer reaches the
  // button, and searched here. Every word of the query must start a word in a
  // section (`ticket` finds "tickets", not "row" in "narrows"), and a match in
  // its heading counts for more than one in its text.
  var MAX_RESULTS = 20;
  var PER_PAGE = 5; // so one long page cannot fill the list

  // Lower case, accents dropped, one character for one: a position in the
  // folded text is the same position in the original, for the snippet.
  function fold(s) {
    return s
      .replace(/[A-Z]+/g, function (m) {
        return m.toLowerCase();
      })
      .replace(/[^\x00-\x7f]/g, function (c) {
        var base = c.normalize ? c.normalize('NFD').charAt(0) : c;
        var lower = base.toLowerCase();
        return lower.length === 1 ? lower : c;
      });
  }

  // Punctuation separates words, so `subpath` starts a word in
  // `exact_subpath` and in `@payload.subpath`.
  function startsWord(text, at) {
    return at === 0 || !/[a-z0-9\u0080-\uffff]/.test(text.charAt(at - 1));
  }

  // Where `term` next starts a word in `text`, from `from` on; -1 if nowhere.
  function find(text, term, from) {
    var at = text.indexOf(term, from);
    while (at !== -1 && !startsWord(text, at)) at = text.indexOf(term, at + 1);
    return at;
  }

  // How many times `term` starts a word in `text`, up to `limit`.
  function count(text, term, limit) {
    var n = 0;
    for (var at = find(text, term, 0); at !== -1 && n < limit; at = find(text, term, at + term.length)) n++;
    return n;
  }

  function scoreEntry(entry, terms, phrase) {
    var total = 0;
    var inTitle = 0;
    for (var i = 0; i < terms.length; i++) {
      var title = count(entry.ftitle, terms[i], 1);
      var text = count(entry.ftext, terms[i], 8);
      // Past the first match in the text, more add little: a long section
      // that repeats a word is not the better answer for it.
      var points = title * 12 + count(entry.fcontext, terms[i], 1) * 4 + (text ? 3 + (text - 1) * 0.5 : 0);
      if (points === 0) return 0;
      inTitle += title;
      total += points;
    }
    if (inTitle === terms.length) total += 10;
    if (entry.ftitle === phrase) total += 20;
    else if (terms.length > 1 && find(entry.ftitle, phrase, 0) !== -1) total += 15;
    else if (terms.length > 1 && find(entry.ftext, phrase, 0) !== -1) total += 6;
    return total;
  }

  function search(entries, query) {
    var phrase = fold(query.replace(/"/g, ' ')).replace(/\s+/g, ' ').trim();
    if (phrase.length < 2) return null;
    var terms = phrase.split(' ').filter(function (term, i, all) {
      return all.indexOf(term) === i;
    });
    var scored = [];
    for (var i = 0; i < entries.length; i++) {
      var score = scoreEntry(entries[i], terms, phrase);
      if (score > 0) scored.push({ entry: entries[i], score: score });
    }
    // Array.prototype.sort is stable: equal scores keep the index's order.
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    var results = [];
    var perPage = {};
    for (var j = 0; j < scored.length && results.length < MAX_RESULTS; j++) {
      var page = scored[j].entry.url.split('#')[0];
      perPage[page] = (perPage[page] || 0) + 1;
      if (perPage[page] <= PER_PAGE) results.push(scored[j].entry);
    }
    return { terms: terms, results: results };
  }

  // Appends text[from, to) to `el`, with every match of a term in a <mark>.
  function appendMarked(el, text, folded, terms, from, to) {
    var ranges = [];
    for (var i = 0; i < terms.length; i++) {
      for (var at = find(folded, terms[i], from); at !== -1 && at < to; at = find(folded, terms[i], at + terms[i].length)) {
        ranges.push([at, Math.min(at + terms[i].length, to)]);
      }
    }
    ranges.sort(function (a, b) {
      return a[0] - b[0];
    });
    var pos = from;
    for (var j = 0; j < ranges.length; j++) {
      var start = Math.max(ranges[j][0], pos);
      if (start >= ranges[j][1]) continue;
      if (start > pos) el.appendChild(document.createTextNode(text.slice(pos, start)));
      var mark = document.createElement('mark');
      mark.textContent = text.slice(start, ranges[j][1]);
      el.appendChild(mark);
      pos = ranges[j][1];
    }
    if (pos < to) el.appendChild(document.createTextNode(text.slice(pos, to)));
  }

  // About two lines of the text, from shortly before its first match, cut at
  // spaces.
  var SNIPPET = 180;

  function appendSnippet(el, entry, terms) {
    var text = entry.text;
    var first = -1;
    for (var i = 0; i < terms.length; i++) {
      var at = find(entry.ftext, terms[i], 0);
      if (at !== -1 && (first === -1 || at < first)) first = at;
    }
    var from = 0;
    if (first > 50) {
      from = text.indexOf(' ', first - 50) + 1;
      if (from <= 0 || from > first) from = first;
    }
    var to = Math.min(text.length, from + SNIPPET);
    if (to < text.length) {
      var space = text.lastIndexOf(' ', to);
      if (space > first) to = space;
    }
    if (from > 0) el.appendChild(document.createTextNode('… '));
    appendMarked(el, text, entry.ftext, terms, from, to);
    if (to < text.length) el.appendChild(document.createTextNode(' …'));
  }

  function initSearch() {
    var toggle = document.querySelector('.search-toggle');
    var dialog = document.getElementById('search');
    if (!toggle || !dialog) return;
    if (typeof dialog.showModal !== 'function' || typeof window.fetch !== 'function') {
      toggle.hidden = true;
      return;
    }
    var input = dialog.querySelector('.search-input');
    var list = dialog.querySelector('.search-results');
    var status = dialog.querySelector('.search-status');
    var closeButton = dialog.querySelector('.search-close');
    var entries = null;
    var loading = false;
    var active = -1;

    function load() {
      if (entries || loading) return;
      loading = true;
      window
        .fetch(toggle.getAttribute('data-index') || '/search.json', { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('search index: HTTP ' + response.status);
          return response.json();
        })
        .then(
          function (data) {
            for (var i = 0; i < data.length; i++) {
              data[i].ftitle = fold(data[i].title);
              // A page's own entry has no context to show, but it is in its
              // page as much as its sections are.
              data[i].fcontext = fold(data[i].context || data[i].title);
              data[i].ftext = fold(data[i].text);
            }
            entries = data;
            loading = false;
            if (dialog.open) update();
          },
          function () {
            // Tried again the next time the dialog opens.
            loading = false;
            if (dialog.open) update();
          }
        );
    }

    function setActive(index, reveal) {
      var items = list.children;
      if (active >= 0 && items[active]) items[active].setAttribute('aria-selected', 'false');
      active = index;
      if (index >= 0 && items[index]) {
        items[index].setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', items[index].id);
        if (reveal) items[index].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function render(found) {
      list.textContent = '';
      active = -1;
      var results = found ? found.results : [];
      for (var i = 0; i < results.length; i++) {
        var entry = results[i];
        var item = document.createElement('a');
        item.className = 'search-result';
        item.id = 'search-result-' + i;
        item.href = entry.url;
        item.tabIndex = -1;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        if (entry.context) {
          var context = document.createElement('span');
          context.className = 'search-result-context';
          context.textContent = entry.context;
          item.appendChild(context);
        }
        var title = document.createElement('span');
        title.className = 'search-result-title';
        appendMarked(title, entry.title, entry.ftitle, found.terms, 0, entry.title.length);
        item.appendChild(title);
        if (entry.text) {
          var snippet = document.createElement('span');
          snippet.className = 'search-result-snippet';
          appendSnippet(snippet, entry, found.terms);
          item.appendChild(snippet);
        }
        list.appendChild(item);
      }
      input.setAttribute('aria-expanded', results.length ? 'true' : 'false');
      list.scrollTop = 0;
      if (results.length) setActive(0, false);
      else input.removeAttribute('aria-activedescendant');
    }

    function update() {
      if (!entries) {
        status.textContent = loading ? 'Loading the index…' : 'Search is not available right now.';
        return;
      }
      var query = input.value.trim();
      var found = search(entries, query);
      render(found);
      if (!found) status.textContent = '';
      else if (!found.results.length) status.textContent = 'No results for “' + query + '”.';
      else status.textContent = found.results.length + (found.results.length === 1 ? ' result' : ' results');
    }

    function open() {
      if (dialog.open) return;
      dialog.showModal();
      input.focus();
      input.select();
      load();
      update();
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    toggle.addEventListener('click', open);
    toggle.addEventListener('pointerenter', load);
    toggle.addEventListener('focus', load);
    closeButton.addEventListener('click', close);
    input.addEventListener('input', update);

    input.addEventListener('keydown', function (e) {
      var size = list.children.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (size) setActive(e.key === 'ArrowDown' ? (active + 1) % size : (active - 1 + size) % size, true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (active >= 0 && list.children[active]) list.children[active].click();
      } else if (e.key === 'Escape' || e.key === 'Esc') {
        // Not left to the browser: in a search field, Esc may only clear it.
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    });

    // The pointer moves the highlight; scrolling under a still pointer does not.
    list.addEventListener('mousemove', function (e) {
      var node = e.target;
      while (node && node.parentNode !== list) node = node.parentNode;
      if (node) {
        for (var i = 0; i < list.children.length; i++) {
          if (list.children[i] === node && i !== active) setActive(i, false);
        }
      }
    });

    // Following a result closes the dialog first, so a link to a section of
    // this same page scrolls to it in plain view. A modified click opens a
    // new tab and leaves the dialog as it is.
    list.addEventListener('click', function (e) {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      close();
    });

    // A click on the backdrop lands on the <dialog> itself; the panel fills
    // the rest. Both ends must be there, or selecting text in the field and
    // releasing outside would close it.
    var downOnBackdrop = false;
    dialog.addEventListener('mousedown', function (e) {
      downOnBackdrop = e.target === dialog;
    });
    dialog.addEventListener('click', function (e) {
      if (downOnBackdrop && e.target === dialog) close();
      downOnBackdrop = false;
    });

    // `/` (outside a text field), or Ctrl+K / Cmd+K.
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || dialog.open) return;
      var target = e.target;
      var typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      var slash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing;
      var commandK = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
      if (slash || commandK) {
        e.preventDefault();
        open();
      }
    });
  }

  function onReady() {
    initThemeToggle();
    initDrawer();
    initCopyButtons();
    initDiagrams();
    initExplainers();
    initSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
