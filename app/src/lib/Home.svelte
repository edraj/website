<script>
  import Layout from "./Layout.svelte";
  import Actions from "./Actions.svelte";
  import { icons, figures, safeHref } from "./site.js";

  /** The landing page (`website/site/home`), as scripts/export-content.mjs wrote it. */
  let { home } = $props();
</script>

<Layout kind="home" path="/" title={home.title} description={home.description} ogType="website">
  <section class="hero">
    <div class="hero-inner">
      {#if home.badge}<p class="hero-badge">{home.badge}</p>{/if}
      <h1 class="hero-title">
        {#each home.titleLines as line, i}
          <!-- The last line carries the accent, and only when there is more than one. -->
          <span class="hero-title-line" class:accent={home.titleLines.length > 1 && i === home.titleLines.length - 1}>{line}</span>
        {/each}
      </h1>
      {#if home.subtitleHtml}<p class="hero-subtitle">{@html home.subtitleHtml}</p>{/if}
      <Actions actions={home.actions} />
    </div>
    {#if figures[home.figure]}<div class="hero-figure">{@html figures[home.figure]}</div>{/if}
  </section>

  {#if home.stats.length > 0}
    <section class="stats" aria-label="Key figures">
      <ul class="stats-inner">
        {#each home.stats as s}
          <li class="stat"><span class="stat-value">{s.value}</span><span class="stat-label">{s.label}</span></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#each home.sections as s}
    <section class="band band-{s.kind}" id={s.id}>
      <h2 class="section-title">
        {s.title}{#if s.kind === "banner" && s.accent}<br /><span class="accent">{s.accent}</span>{/if}
      </h2>

      {#if s.kind !== "figures" && s.bodyHtml}<div class="section-body">{@html s.bodyHtml}</div>{/if}

      {#if s.kind === "cards"}
        <div class="cards">
          {#each s.items as item}
            {#if item.href}
              <a class="card" href={safeHref(item.href)}>
                {#if icons[item.icon]}<span class="card-icon">{@html icons[item.icon]}</span>{/if}
                <h3 class="card-title">{item.title}</h3>
                {#if item.bodyHtml}<div class="card-body">{@html item.bodyHtml}</div>{/if}
                <span class="card-arrow" aria-hidden="true">→</span>
              </a>
            {:else}
              <div class="card">
                {#if icons[item.icon]}<span class="card-icon">{@html icons[item.icon]}</span>{/if}
                <h3 class="card-title">{item.title}</h3>
                {#if item.bodyHtml}<div class="card-body">{@html item.bodyHtml}</div>{/if}
              </div>
            {/if}
          {/each}
        </div>
      {:else if s.kind === "steps"}
        <ol class="steps">
          {#each s.items as item, i}
            <li class="step">
              <span class="step-num">{String(i + 1).padStart(2, "0")}</span>
              <div class="step-content">
                <h3 class="step-title">{item.title}</h3>
                {#if item.bodyHtml}<div class="step-body">{@html item.bodyHtml}</div>{/if}
              </div>
            </li>
          {/each}
        </ol>
      {:else if s.kind === "figures"}
        <div class="figures-grid">
          <div class="figures-main">{@html s.bodyHtml}</div>
          {#if s.items.length > 0}
            <dl class="figures">
              {#each s.items as item}
                <div class="figure"><dt>{item.title}</dt><dd>{@html item.bodyHtml}</dd></div>
              {/each}
            </dl>
          {/if}
        </div>
      {:else if s.kind === "explainer"}
        <!-- One <g class="sc"> per scene in the figure; the items caption them in
             order. public/site.js plays it and enables the scene buttons. -->
        <div class="explainer">
          <div class="explainer-stage">
            {#if figures[s.figure]}{@html figures[s.figure]}{/if}
            <button type="button" class="explainer-toggle" aria-pressed="false" hidden>Pause</button>
          </div>
          <ol class="explainer-scenes">
            {#each s.items as item, i}
              <li class="scene">
                <h3 class="scene-title"><button type="button" class="scene-jump" disabled><span class="scene-num">{i + 1}</span>{item.title}</button></h3>
                <span class="scene-bar" aria-hidden="true"></span>
                {#if item.bodyHtml}<div class="scene-body">{@html item.bodyHtml}</div>{/if}
              </li>
            {/each}
          </ol>
        </div>
      {/if}

      <Actions actions={s.actions} />
    </section>
  {/each}
</Layout>
