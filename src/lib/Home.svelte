<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    navigate: (path: string) => void;
  }

  let { navigate }: Props = $props();

  let visible = $state(true);
  let revealRoot: HTMLElement | undefined = $state();

  // Let the browser handle modifier and middle clicks so the anchors behave
  // like links; intercept only the plain left click for SPA navigation.
  function cardClick(e: MouseEvent, path: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(path);
  }

  onMount(() => {

    // The scroll-reveal animation is gone on purpose. It cost this page two
    // separate visibility bugs -- content stuck at opacity:0 when JS or
    // IntersectionObserver was unavailable, and again whenever the tab was
    // throttled or unfocused, because neither rAF nor IntersectionObserver is
    // guaranteed to fire there. Everything a visitor came to read is now
    // painted on first frame: better for crawlers, link previews, low-power
    // devices, and anyone who scrolls faster than a 0.7s transition.
  });
</script>

<div class="home-root" bind:this={revealRoot}>
<!-- ═══ HERO ═══ -->
<section class="hero" class:visible>
  <div class="hero-inner">
    <!-- The badge said "OPEN SOURCE" and the subtitle said "Simplify
         everything" -- true of most things and specific to none. Both now say
         something only dmart can claim. -->
    <div class="hero-badge">AGPL-3.0 &middot; SELF-HOSTED</div>
    <h1 class="hero-title">
      <span class="hero-title-line">DATA</span>
      <span class="hero-title-line accent">MART</span>
    </h1>
    <p class="hero-subtitle">
      A structured information platform you run yourself &mdash; schema, access
      control, workflows and an admin UI in <strong>one binary</strong>, with
      your entries stored as <strong>files you own</strong>.
    </p>
    <div class="cta-group">
      <button class="primary" onclick={() => navigate("/features")}
        >Explore Features</button
      >
      <button class="secondary" onclick={() => navigate("/technical")}
        >Read Docs</button
      >
      <a
        href="https://github.com/edraj/csdmart"
        target="_blank"
        rel="noopener noreferrer"
        class="cta-link">GitHub →</a
      >
    </div>
  </div>
  <!-- Replaces an ASCII block that showed clients -> engine -> "Database".
       That diagram was missing the one relationship worth drawing: the files
       are the source of truth and the SQL store is a rebuildable index over
       them. Inline SVG so it scales, themes with currentColor, and needs no
       monospace metrics to line up. -->
  <div class="hero-figure">
    <svg viewBox="0 0 320 260" role="img"
         aria-label="Four client SDKs call one dmart binary, which serves the API, access control, schema validation and admin UI; entries are stored as files, with a rebuildable SQL index beside them.">
      <g class="hf-clients">
        <rect x="8"   y="8" width="70" height="30" rx="4"/>
        <rect x="86"  y="8" width="70" height="30" rx="4"/>
        <rect x="164" y="8" width="70" height="30" rx="4"/>
        <rect x="242" y="8" width="70" height="30" rx="4"/>
        <text x="43"  y="27">Flutter</text>
        <text x="121" y="27">TS</text>
        <text x="199" y="27">Python</text>
        <text x="277" y="27">.NET</text>
      </g>

      <g class="hf-wire">
        <path d="M43 38v16h234V38"/>
        <path d="M121 38v16"/><path d="M199 38v16"/>
        <path d="M160 54v14"/>
      </g>
      <text class="hf-edge" x="166" y="50">HTTPS · JSON</text>

      <g class="hf-engine">
        <rect x="8" y="68" width="304" height="86" rx="6"/>
        <text class="hf-title" x="20" y="88">dmart &mdash; one binary, 46 MB</text>
        <g class="hf-chip">
          <rect x="20"  y="98" width="66" height="20" rx="3"/>
          <rect x="94"  y="98" width="66" height="20" rx="3"/>
          <rect x="168" y="98" width="66" height="20" rx="3"/>
          <rect x="242" y="98" width="62" height="20" rx="3"/>
          <text x="53"  y="112">REST API</text>
          <text x="127" y="112">ACL</text>
          <text x="201" y="112">Schema</text>
          <text x="273" y="112">MCP</text>
        </g>
        <g class="hf-chip">
          <rect x="20"  y="124" width="104" height="20" rx="3"/>
          <rect x="132" y="124" width="104" height="20" rx="3"/>
          <rect x="244" y="124" width="60"  height="20" rx="3"/>
          <text x="72"  y="138">Admin UI</text>
          <text x="184" y="138">Workflows</text>
          <text x="274" y="138">WS</text>
        </g>
      </g>

      <g class="hf-wire">
        <path d="M86 154v20"/><path d="M234 154v20"/>
      </g>

      <g class="hf-store">
        <rect x="8" y="174" width="148" height="56" rx="6"/>
        <text class="hf-title" x="20" y="194">Files on disk</text>
        <text x="20" y="212">source of truth</text>
      </g>
      <g class="hf-index">
        <rect x="164" y="174" width="148" height="56" rx="6"/>
        <text class="hf-title" x="176" y="194">PostgreSQL / SQLite</text>
        <text x="176" y="212">rebuildable index</text>
      </g>
      <g class="hf-wire hf-rebuild">
        <path d="M156 202h8"/>
      </g>
      <text class="hf-edge" x="160" y="248">dmart import rebuilds the index from disk</text>
    </svg>
  </div>
</section>

<!-- ═══ STATS ═══ -->
<section class="stats reveal">
  <div class="stats-inner">
    <div class="stat">
      <span class="stat-value">≤300M</span>
      <span class="stat-label">Entries Supported</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat">
      <span class="stat-value">4</span>
      <span class="stat-label">Client SDKs</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat">
      <span class="stat-value">~50&thinsp;MB</span>
      <span class="stat-label">Single Binary, No Runtime</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat">
      <span class="stat-value">106&thinsp;MB</span>
      <span class="stat-label">Full Stack, Idle</span>
    </div>
  </div>
</section>

<!-- ═══ PILLARS ═══ -->
<section class="pillars reveal">
  <h2 class="section-title">Core Pillars</h2>
  <div class="pillars-grid">
    <a class="pillar" href="/features" onclick={(e) => cardClick(e, "/features")}>
      <div class="pillar-icon" aria-hidden="true"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5S12.3 8 9 8 3 6.9 3 5.5Z"/><path d="M3 5.5v7c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-7"/><path d="M3 9c0 1.4 2.7 2.5 6 2.5S15 10.4 15 9"/></svg></div>
      <h3>Unified Data</h3>
      <p>
        Entries, attachments, metadata — all in one model. Structured and
        unstructured data, seamlessly.
      </p>
      <span class="pillar-arrow">→</span>
    </a>
    <a class="pillar" href="/features" onclick={(e) => cardClick(e, "/features")}>
      <div class="pillar-icon" aria-hidden="true"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5h13l-5 5.5v5l-3 1.5V9L2.5 3.5Z"/></svg></div>
      <h3>Powerful Search</h3>
      <p>
        Full-text search, filtering, aggregation. Powered by SQL full-text
        blazing performance.
      </p>
      <span class="pillar-arrow">→</span>
    </a>
    <a class="pillar" href="/features" onclick={(e) => cardClick(e, "/features")}>
      <div class="pillar-icon" aria-hidden="true"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="9" r="3"/><path d="M9 9h6.5"/><path d="M13 9v2.5"/><path d="M15.5 9v3"/></svg></div>
      <h3>Access Control</h3>
      <p>
        Role-based access, granular permissions down to folder and entry level.
        Secure by default.
      </p>
      <span class="pillar-arrow">→</span>
    </a>
    <a class="pillar" href="/technical" onclick={(e) => cardClick(e, "/technical")}>
      <div class="pillar-icon" aria-hidden="true"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2.5v4"/><path d="M11 2.5v4"/><path d="M5 6.5h8v3a4 4 0 0 1-8 0v-3Z"/><path d="M9 13.5v3"/></svg></div>
      <h3>Extensible</h3>
      <p>
        Plugin architecture, webhooks, custom workflows. Adapt DMART to any use
        case.
      </p>
      <span class="pillar-arrow">→</span>
    </a>
  </div>
</section>

<!-- ═══ HOW IT WORKS ═══ -->
<!-- The two differentiators that were missing entirely: where it runs, and who
     owns the data. Both are load-bearing against Firebase/Supabase/Sanity, and
     the footprint figures are measured rather than asserted. -->
<section class="runs-anywhere reveal">
  <h2 class="section-title">Runs Where a Backend Normally Can&rsquo;t</h2>
  <div class="ra-grid">
    <div class="ra-main">
      <p class="ra-lede">
        One self-contained binary, compiled ahead of time. No runtime to
        install, no container required, no separate frontend to deploy &mdash;
        the admin UI ships inside it.
      </p>
      <p class="ra-body">
        Measured on a <strong>Raspberry&nbsp;Pi Zero&nbsp;2&nbsp;W</strong> with
        416&nbsp;MB of usable RAM, serving with PostgreSQL alongside it on the
        same board: <strong>106&nbsp;MB</strong> resident for the whole stack,
        ~14&nbsp;ms warm reads, and four concurrent logins served with a bounded
        peak that is fully reclaimed. A 10-hour continuous write soak held memory
          flat &mdash; a plateau, not a slope &mdash; with no OOM and no thermal
          throttling. The same binary runs on a server.
      </p>
    </div>
    <dl class="ra-figures">
      <div><dt>106&thinsp;MB</dt><dd>dmart + PostgreSQL, idle, of 416&thinsp;MB</dd></div>
      <div><dt>~14&thinsp;ms</dt><dd>warm read, 5,000-entry fixture</dd></div>
      <div><dt>0.6&thinsp;GB/day</dt><dd>written under sustained load &mdash; ~460&thinsp;yr on a 100&thinsp;TBW card</dd></div>
    </dl>
  </div>
</section>

<section class="own-it reveal">
  <h2 class="section-title">Your Data Stays Yours</h2>
  <div class="oi-grid">
    <div class="oi-card">
      <span class="oi-k">Files are the source of truth</span>
      <p>
        Entries live as plain files on disk. The SQL store is a
        <strong>rebuildable index</strong> over them &mdash; copy the folder,
        rebuild the index anywhere, and you have your system back.
      </p>
    </div>
    <div class="oi-card">
      <span class="oi-k">Standard formats, not a vendor schema</span>
      <p>
        Payloads are JSON, constrained by <strong>JSON&nbsp;Schema Draft&nbsp;7</strong>
        and evaluated by a standard library. There is no dmart-specific type
        system to migrate out of.
      </p>
    </div>
    <div class="oi-card">
      <span class="oi-k">Self-hosted, AGPL-3.0</span>
      <p>
        Run it on your hardware, in your network, air-gapped if you need to.
        No per-seat pricing and no hosted service you depend on.
      </p>
    </div>
  </div>
</section>

<section class="how-it-works reveal">
  <h2 class="section-title">How It Works</h2>
  <div class="steps">
    <div class="step">
      <div class="step-num">01</div>
      <div class="step-content">
        <h3>Define Your Space</h3>
        <p>
          Create spaces and organize data into hierarchical folders — just like
          a file system.
        </p>
      </div>
    </div>
    <div class="step">
      <div class="step-num">02</div>
      <div class="step-content">
        <h3>Store Anything</h3>
        <p>
          Create entries with JSON payloads, attach files, add metadata.
          Schema-validated or free-form.
        </p>
      </div>
    </div>
    <div class="step">
      <div class="step-num">03</div>
      <div class="step-content">
        <h3>Query & Discover</h3>
        <p>
          Full-text search, filter by any field, sort, paginate. All through a
          consistent REST API.
        </p>
      </div>
    </div>
    <div class="step">
      <div class="step-num">04</div>
      <div class="step-content">
        <h3>Integrate Everywhere</h3>
        <p>
          Use official SDKs for Python, TypeScript, Dart, and C#/.NET. Or call
          the REST API directly.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- ═══ EXPLORE SECTIONS ═══ -->
<section class="explore reveal">
  <h2 class="section-title">Explore</h2>
  <div class="explore-grid">
    <a class="explore-card" href="/features" onclick={(e) => cardClick(e, "/features")}>
      <div class="explore-card-header">
        <span class="explore-tag">OVERVIEW</span>
        <span class="explore-arrow">→</span>
      </div>
      <h3>Features</h3>
      <p>
        Unified data management, collaboration tools, and advanced search
        capabilities.
      </p>
    </a>
    <a class="explore-card" href="/why" onclick={(e) => cardClick(e, "/why")}>
      <div class="explore-card-header">
        <span class="explore-tag">PHILOSOPHY</span>
        <span class="explore-arrow">→</span>
      </div>
      <h3>Why DMART?</h3>
      <p>
        Transform data from a liability into an asset. Own your data, no vendor
        lock-in.
      </p>
    </a>
    <a class="explore-card" href="/technical" onclick={(e) => cardClick(e, "/technical")}>
      <div class="explore-card-header">
        <span class="explore-tag">ARCHITECTURE</span>
        <span class="explore-arrow">→</span>
      </div>
      <h3>Technical</h3>
      <p>
        ASP.NET Core on .NET, PostgreSQL-backed. A single Native-AOT
        binary — built for simplicity and speed.
      </p>
    </a>
    <a class="explore-card" href="/drivers" onclick={(e) => cardClick(e, "/drivers")}>
      <div class="explore-card-header">
        <span class="explore-tag">SDKS</span>
        <span class="explore-arrow">→</span>
      </div>
      <h3>Drivers</h3>
      <p>
        Official client libraries for Python, TypeScript/JavaScript,
        Dart/Flutter, and C#/.NET.
      </p>
    </a>
  </div>
</section>

<!-- ═══ CTA BANNER ═══ -->
<section class="cta-banner reveal">
  <div class="cta-banner-inner">
    <h2>Stop managing databases.<br /><span class="shimmer">Start managing assets.</span></h2>
    <div class="cta-group">
      <button class="primary" onclick={() => navigate("/features")}
        >Get Started</button
      >
      <a
        href="https://github.com/edraj/csdmart"
        target="_blank"
        rel="noopener noreferrer"
        class="cta-link">View on GitHub →</a
      >
    </div>
  </div>
</section>
</div>

<style>
  /* ─── HERO ─── */
  .hero {
    padding: 6rem 2rem 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4rem;
    max-width: 1200px;
    margin: 0 auto;
    /* Readable at rest. This used to be opacity:0 until a requestAnimationFrame
       callback set `visible` -- and rAF does not fire in a throttled or
       unfocused tab, so the hero could sit invisible indefinitely. Same class
       of bug as the scroll reveal: never gate content on a runtime callback. */
    opacity: 1;
    transform: none;
    transition:
      opacity 0.6s ease,
      transform 0.6s ease;
  }

  .hero.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .hero-inner {
    flex: 1;
    max-width: 540px;
  }

  .hero-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    background: var(--gradient-iri-soft);
    color: var(--primary-color);
    border: 1px solid var(--glass-border);
    padding: 0.3rem 1rem;
    margin-bottom: 1.5rem;
    border-radius: 100px;
    box-shadow: 0 1px 2px rgba(139, 92, 246, 0.08);
  }

  .hero-title {
    font-size: 5rem;
    font-weight: 900;
    line-height: 0.95;
    margin: 0 0 1.5rem 0;
    border: none;
    padding: 0;
    letter-spacing: -3px;
  }

  .hero-title-line {
    display: block;
  }

  .hero-title-line.accent {
    background: var(--gradient-iri);
    background-size: 220% 220%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }


  @keyframes shimmer {
    0%, 100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  .hero-subtitle {
    font-size: 1.1rem;
    line-height: 1.8;
    margin-bottom: 2rem;
    color: var(--text-secondary);
    max-width: 420px;
  }

  .hero-figure {
    flex-shrink: 0;
    width: 380px;
    max-width: 100%;
  }
  .hero-figure svg {
    width: 100%;
    height: auto;
    display: block;
  }
  /* One stroke weight, one type size, three roles distinguished by fill alone:
     clients and store are outlines, the engine is the filled object, the index
     sits between them. Everything themes through the tokens. */
  .hero-figure rect {
    fill: var(--bg-color);
    stroke: var(--border-color);
    stroke-width: 1;
  }
  .hero-figure .hf-engine > rect {
    fill: var(--accent-light);
    stroke: var(--iri-2);
  }
  .hero-figure .hf-chip rect {
    fill: var(--bg-color);
    stroke: var(--border-color);
  }
  .hero-figure .hf-index rect {
    fill: var(--bg-secondary);
  }
  .hero-figure text {
    font-family: var(--font-mono);
    font-size: 8.5px;
    fill: var(--text-secondary);
    text-anchor: middle;
  }
  .hero-figure .hf-clients text,
  .hero-figure .hf-chip text {
    fill: var(--text-main);
  }
  .hero-figure .hf-title {
    text-anchor: start;
    font-family: var(--font-display);
    font-size: 10px;
    font-weight: 600;
    fill: var(--text-main);
  }
  .hero-figure .hf-store text:not(.hf-title),
  .hero-figure .hf-index text:not(.hf-title) {
    text-anchor: start;
  }
  .hero-figure .hf-wire path {
    fill: none;
    stroke: var(--border-color);
    stroke-width: 1;
  }
  .hero-figure .hf-edge {
    font-size: 7.5px;
    fill: var(--text-secondary);
  }



  .cta-group {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  button.primary {
    background: var(--gradient-iri);
    background-size: 160% 160%;
    background-position: 0% 50%;
    color: #fff;
    padding: 0.7rem 1.8rem;
    font-size: 0.9rem;
    border: none;
    font-weight: 700;
    letter-spacing: 1px;
    border-radius: 8px;
    box-shadow: 0 4px 14px -4px rgba(139, 92, 246, 0.55);
    transition: background-position 0.4s ease, box-shadow 0.2s ease, transform 0.15s ease;
  }

  button.primary:hover {
    background-position: 100% 50%;
    box-shadow: 0 6px 20px -4px rgba(217, 70, 239, 0.55);
    transform: translateY(-1px);
  }

  button.primary:active {
    transform: translateY(0);
  }

  button.secondary {
    background-color: transparent;
    border: 1px solid var(--primary-color);
    padding: 0.7rem 1.8rem;
    font-size: 0.9rem;
    color: var(--primary-color);
    letter-spacing: 1px;
    border-radius: 6px;
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  button.secondary:hover {
    background-color: var(--primary-color);
    color: #fff;
  }

  .cta-link {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s;
  }

  .cta-link:hover {
    color: var(--primary-color);
  }

  /* ─── STATS ─── */
  .stats {
    background: var(--gradient-iri-soft);
    border-top: 1px solid transparent;
    border-bottom: 1px solid transparent;
    border-image: var(--gradient-hairline) 1;
    padding: 0;
  }

  .stats-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2.5rem 3rem;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 1.8rem;
    font-weight: 900;
    background: var(--gradient-iri);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    letter-spacing: -1px;
  }

  .stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--text-secondary);
  }

  .stat-divider {
    width: 1px;
    height: 3rem;
    background: var(--gradient-hairline-v);
  }

  /* ─── SECTION TITLE ─── */
  .section-title {
    font-size: 1.5rem;
    text-align: center;
    margin-bottom: 3rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-main);
  }


  /* These are real anchors now, so they inherit the global link styling.
     Reset it: the card is the affordance, not underlined text. */
  a.pillar,
  a.explore-card {
    text-decoration: none;
    color: inherit;
    display: block;
  }
  a.pillar:focus-visible,
  a.explore-card:focus-visible {
    outline: 2px solid var(--iri-2);
    outline-offset: 3px;
  }
  /* ─── RUNS ANYWHERE ─── */
  /* Deliberately not another row of cards. The figures are the argument, so
     they get a measured, tabular treatment rather than an icon tile. */
  .runs-anywhere,
  .own-it {
    max-width: 1100px;
    margin: 0 auto;
    padding: 4.5rem 1.5rem 0;
  }
  .ra-grid {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 3rem;
    align-items: start;
  }
  .ra-lede {
    font-size: 1.15rem;
    line-height: 1.55;
    color: var(--text-main);
    margin: 0 0 1rem;
  }
  .ra-body {
    color: var(--text-secondary);
    margin: 0;
    max-width: 58ch;
  }
  .ra-figures {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    border-top: 1px solid var(--border-color);
  }
  .ra-figures > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--border-color);
  }
  .ra-figures dt {
    /* Signal colour, used here and nowhere else on the page: these three came
       off an instrument. A reader who learns that once can tell a measurement
       from a marketing number at a glance. */
    font-family: var(--font-mono);
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--signal);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .ra-figures dd {
    margin: 0;
    text-align: right;
    font-size: 0.85rem;
    color: var(--text-secondary);
    max-width: 22ch;
  }

  /* ─── OWN IT ─── */
  .oi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .oi-card {
    background: var(--bg-color);
    padding: 1.6rem 1.5rem;
  }
  .oi-k {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--iri-2);
    margin-bottom: 0.6rem;
  }
  .oi-card p {
    margin: 0;
    font-size: 0.93rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  @media (max-width: 860px) {
    .ra-grid { grid-template-columns: 1fr; gap: 2rem; }
    .oi-grid { grid-template-columns: 1fr; }
    .ra-figures dd { max-width: none; }
  }

  /* ─── PILLARS ─── */
  .pillars {
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 2rem;
  }

  .pillars-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  .pillar {
    padding: 2rem;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 14px;
    cursor: pointer;
    position: relative;
    isolation: isolate;
    transition:
      box-shadow 0.25s ease,
      transform 0.25s ease;
    display: flex;
    flex-direction: column;
  }

  .pillar::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: conic-gradient(
      from var(--angle, 0deg),
      var(--iri-1),
      var(--iri-3),
      var(--iri-4),
      var(--iri-1)
    );
    -webkit-mask:
      linear-gradient(#000, #000) content-box,
      linear-gradient(#000, #000);
    mask:
      linear-gradient(#000, #000) content-box,
      linear-gradient(#000, #000);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .pillar:hover {
    box-shadow: 0 12px 30px -12px rgba(139, 92, 246, 0.4), var(--shadow-md);
    transform: translateY(-3px);
  }

  .pillar:hover::before {
    opacity: 1;
  }


  @keyframes spin {
    to { --angle: 360deg; }
  }

  .pillar-icon {
    /* A quiet square mark, not a coloured bubble: the icon should identify the
       card, not compete with its heading. Stroke inherits the brand hue. */
    width: 34px;
    height: 34px;
    margin-bottom: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--iri-2);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-color);
  }
  .pillar-icon svg {
    width: 18px;
    height: 18px;
  }

  .pillar:hover .pillar-icon {
    border-color: var(--iri-2);
  }

  .pillar h3 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .pillar p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0 0 1rem;
    flex: 1;
  }

  .pillar-arrow {
    font-size: 1.2rem;
    color: var(--text-secondary);
    transition:
      transform 0.2s,
      color 0.2s;
  }

  .pillar:hover .pillar-arrow {
    transform: translateX(4px);
    color: var(--primary-color);
  }

  /* ─── HOW IT WORKS ─── */
  .how-it-works {
    max-width: 800px;
    margin: 0 auto;
    padding: 4rem 2rem;
    border-top: 1px solid transparent;
    border-image: var(--gradient-hairline) 1;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .step {
    display: flex;
    gap: 2rem;
    padding: 1.5rem 0;
    border-bottom: 1px solid transparent;
    border-image: var(--gradient-hairline) 1;
    align-items: flex-start;
  }

  .step:last-child {
    border-bottom: none;
  }

  .step-num {
    font-size: 2.2rem;
    font-weight: 900;
    background: var(--gradient-iri);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    opacity: 0.55;
    min-width: 3rem;
    line-height: 1;
    letter-spacing: -1px;
  }

  .step-content h3 {
    font-size: 1rem;
    margin-bottom: 0.3rem;
  }

  .step-content p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  /* ─── EXPLORE ─── */
  .explore {
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 2rem;
    border-top: 1px solid transparent;
    border-image: var(--gradient-hairline) 1;
  }

  .explore-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  .explore-card {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 14px;
    padding: 2rem;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
      box-shadow 0.25s ease,
      transform 0.25s ease,
      border-color 0.25s ease;
    display: flex;
    flex-direction: column;
  }

  .explore-card::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--gradient-iri);
    transform: scaleY(0);
    transform-origin: top;
    transition: transform 0.3s ease;
  }

  .explore-card:hover {
    box-shadow: 0 10px 28px -12px rgba(139, 92, 246, 0.35), var(--shadow-md);
    transform: translateY(-3px);
    border-color: transparent;
  }

  .explore-card:hover::after {
    transform: scaleY(1);
  }

  .explore-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .explore-tag {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: var(--primary-color);
    background: var(--gradient-iri-soft);
    border: 1px solid var(--glass-border);
    padding: 0.2rem 0.6rem;
    border-radius: 100px;
  }

  .explore-arrow {
    font-size: 1.2rem;
    color: var(--text-secondary);
    transition:
      transform 0.2s,
      color 0.2s;
  }

  .explore-card:hover .explore-arrow {
    transform: translateX(4px);
    color: var(--primary-color);
  }

  .explore-card h3 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
  }

  .explore-card p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
    flex: 1;
  }

  /* ─── CTA BANNER ─── */
  .cta-banner {
    background: var(--gradient-iri-soft);
    border-top: 1px solid transparent;
    border-image: var(--gradient-hairline) 1;
    padding: 5rem 2rem;
    text-align: center;
    position: relative;
  }

  .cta-banner h2 .shimmer {
    background: var(--gradient-iri);
    background-size: 220% 220%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .cta-banner-inner {
    max-width: 600px;
    margin: 0 auto;
  }

  .cta-banner h2 {
    font-size: 1.5rem;
    margin-bottom: 2rem;
    line-height: 1.4;
  }

  .cta-banner .cta-group {
    justify-content: center;
  }

  /* ─── SCROLL REVEAL ─── */
  @media (prefers-reduced-motion: no-preference) {
    /* Retained as a structural hook only -- see the onMount comment. */
    .reveal {
      opacity: 1;
      transform: none;
    }
  }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 900px) {
    .hero {
      flex-direction: column;
      text-align: center;
      gap: 2rem;
      padding: 3rem 1.5rem 2rem;
    }

    .hero-subtitle {
      margin-left: auto;
      margin-right: auto;
    }

    .cta-group {
      justify-content: center;
    }

    .hero-title {
      font-size: 3.5rem;
    }

    .pillars-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .explore-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .hero-title {
      font-size: 2.5rem;
    }

    .hero-figure {
      width: 100%;
    }

    .pillars-grid {
      grid-template-columns: 1fr;
    }

    .stat {
      padding: 1.5rem 1rem;
    }

    .stat-value {
      font-size: 1.3rem;
    }

    .stats-inner {
      flex-wrap: wrap;
    }

    .stat-divider {
      display: none;
    }
  }
</style>
