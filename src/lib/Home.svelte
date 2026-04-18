<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    navigate: (path: string) => void;
  }

  let { navigate }: Props = $props();

  let visible = $state(false);
  let revealRoot: HTMLElement | undefined = $state();

  function handleCardKeydown(e: KeyboardEvent, path: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(path);
    }
  }

  onMount(() => {
    requestAnimationFrame(() => {
      visible = true;
    });

    if (!revealRoot || typeof IntersectionObserver === "undefined") return;

    const targets = revealRoot.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  });
</script>

<div class="home-root" bind:this={revealRoot}>
<!-- ═══ HERO ═══ -->
<section class="hero" class:visible>
  <div class="hero-inner">
    <div class="hero-badge">OPEN SOURCE</div>
    <h1 class="hero-title">
      <span class="hero-title-line">DATA</span>
      <span class="hero-title-line accent shimmer">MART</span>
    </h1>
    <p class="hero-subtitle">
      A unified Data-as-a-Service platform.<br />
      Own your data. Simplify everything.
    </p>
    <div class="cta-group">
      <button class="primary" onclick={() => navigate("/features")}
        >Explore Features</button
      >
      <button class="secondary" onclick={() => navigate("/technical")}
        >Read Docs</button
      >
      <a
        href="https://github.com/edraj/dmart"
        target="_blank"
        rel="noopener noreferrer"
        class="cta-link">GitHub →</a
      >
    </div>
  </div>
  <div class="hero-ascii">
    <pre>{`
    ┌────────────────────────┐
    │  APP  │  WEB  │ MOBILE │
    └───┬───┴───┬───┴───┬────┘
        │       │       │
    ┌───▼───────▼───────▼────┐
    │     DMART  ENGINE      │
    ├────────────────────────┤
    │        Database        │
    └────────────────────────┘
    `}</pre>
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
      <span class="stat-value">3</span>
      <span class="stat-label">Client SDKs</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat">
      <span class="stat-value">100%</span>
      <span class="stat-label">Open Source</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat">
      <span class="stat-value">0</span>
      <span class="stat-label">Vendor Lock-in</span>
    </div>
  </div>
</section>

<!-- ═══ PILLARS ═══ -->
<section class="pillars reveal">
  <h2 class="section-title">Core Pillars</h2>
  <div class="pillars-grid">
    <div class="pillar" role="link" tabindex="0" onclick={() => navigate("/features")} onkeydown={(e) => handleCardKeydown(e, "/features")}>
      <div class="pillar-icon">⚡</div>
      <h3>Unified Data</h3>
      <p>
        Entries, attachments, metadata — all in one model. Structured and
        unstructured data, seamlessly.
      </p>
      <span class="pillar-arrow">→</span>
    </div>
    <div class="pillar" role="link" tabindex="0" onclick={() => navigate("/features")} onkeydown={(e) => handleCardKeydown(e, "/features")}>
      <div class="pillar-icon">🔍</div>
      <h3>Powerful Search</h3>
      <p>
        Full-text search, filtering, aggregation. Powered by SQL full-text
        blazing performance.
      </p>
      <span class="pillar-arrow">→</span>
    </div>
    <div class="pillar" role="link" tabindex="0" onclick={() => navigate("/features")} onkeydown={(e) => handleCardKeydown(e, "/features")}>
      <div class="pillar-icon">🔒</div>
      <h3>Access Control</h3>
      <p>
        Role-based access, granular permissions down to folder and entry level.
        Secure by default.
      </p>
      <span class="pillar-arrow">→</span>
    </div>
    <div class="pillar" role="link" tabindex="0" onclick={() => navigate("/technical")} onkeydown={(e) => handleCardKeydown(e, "/technical")}>
      <div class="pillar-icon">🔧</div>
      <h3>Extensible</h3>
      <p>
        Plugin architecture, webhooks, custom workflows. Adapt DMART to any use
        case.
      </p>
      <span class="pillar-arrow">→</span>
    </div>
  </div>
</section>

<!-- ═══ HOW IT WORKS ═══ -->
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
          Use official SDKs for Python, TypeScript, and Dart. Or call the REST
          API directly.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- ═══ EXPLORE SECTIONS ═══ -->
<section class="explore reveal">
  <h2 class="section-title">Explore</h2>
  <div class="explore-grid">
    <div class="explore-card" role="link" tabindex="0" onclick={() => navigate("/features")} onkeydown={(e) => handleCardKeydown(e, "/features")}>
      <div class="explore-card-header">
        <span class="explore-tag">OVERVIEW</span>
        <span class="explore-arrow">→</span>
      </div>
      <h3>Features</h3>
      <p>
        Unified data management, collaboration tools, and advanced search
        capabilities.
      </p>
    </div>
    <div class="explore-card" role="link" tabindex="0" onclick={() => navigate("/why")} onkeydown={(e) => handleCardKeydown(e, "/why")}>
      <div class="explore-card-header">
        <span class="explore-tag">PHILOSOPHY</span>
        <span class="explore-arrow">→</span>
      </div>
      <h3>Why DMART?</h3>
      <p>
        Transform data from a liability into an asset. Own your data, no vendor
        lock-in.
      </p>
    </div>
    <div class="explore-card" role="link" tabindex="0" onclick={() => navigate("/technical")} onkeydown={(e) => handleCardKeydown(e, "/technical")}>
      <div class="explore-card-header">
        <span class="explore-tag">ARCHITECTURE</span>
        <span class="explore-arrow">→</span>
      </div>
      <h3>Technical</h3>
      <p>
        FastAPI backend, SQL database storage. Built for simplicity
        and speed.
      </p>
    </div>
    <div class="explore-card" role="link" tabindex="0" onclick={() => navigate("/drivers")} onkeydown={(e) => handleCardKeydown(e, "/drivers")}>
      <div class="explore-card-header">
        <span class="explore-tag">SDKS</span>
        <span class="explore-arrow">→</span>
      </div>
      <h3>Drivers</h3>
      <p>
        Official client libraries for Python, TypeScript/JavaScript, and
        Dart/Flutter.
      </p>
    </div>
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
        href="https://github.com/edraj/dmart"
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
    opacity: 0;
    transform: translateY(10px);
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

  @media (prefers-reduced-motion: no-preference) {
    .shimmer {
      animation: shimmer 9s ease-in-out infinite;
    }
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

  .hero-ascii {
    flex-shrink: 0;
    padding: 2px;
    background: var(--gradient-iri);
    background-size: 200% 200%;
    border-radius: 14px;
    box-shadow: var(--glow-iri);
  }

  @media (prefers-reduced-motion: no-preference) {
    .hero-ascii {
      animation: shimmer 14s ease-in-out infinite;
    }
  }

  .hero-ascii pre {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--text-secondary);
    border: none;
    padding: 1.5rem;
    background: var(--bg-color);
    margin: 0;
    white-space: pre;
    overflow-x: auto;
    border-radius: 12px;
  }

  :global(:root.dark) .hero-ascii pre {
    color: var(--iri-2);
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

  @media (prefers-reduced-motion: no-preference) {
    .pillar:hover::before {
      animation: spin 6s linear infinite;
    }
  }

  @keyframes spin {
    to { --angle: 360deg; }
  }

  .pillar-icon {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gradient-iri);
    background-size: 200% 200%;
    border-radius: 50%;
    box-shadow: 0 4px 12px -4px rgba(139, 92, 246, 0.45);
    filter: saturate(1.05);
  }

  @media (prefers-reduced-motion: no-preference) {
    .pillar:hover .pillar-icon {
      animation: shimmer 5s ease-in-out infinite;
    }
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
    .reveal {
      opacity: 0;
      transform: translateY(14px);
      transition:
        opacity 0.7s ease,
        transform 0.7s ease;
    }
    .reveal:global(.in-view) {
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

    .hero-ascii pre {
      font-size: 0.65rem;
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

    .hero-ascii {
      display: none;
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
