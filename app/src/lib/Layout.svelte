<script>
  import { site, safeHref, isExternal, MERMAID_SRC, MERMAID_SRI } from "./site.js";

  /**
   * kind: "home" | "doc" | "standalone"
   * path: this page's URL path ("/", "/data-model"), or null for the 404 page
   */
  let { kind, path = null, title, description = "", ogType = "article", hasDiagram = false, children } = $props();

  const canonical = $derived(site.baseUrl && path !== null ? site.baseUrl + path : null);
  const ogImage = site.baseUrl ? site.baseUrl + "/og-card.png" : null;
  const linkCurrent = (link) => (link.docs ? kind === "doc" : path !== null && link.href === path);
  const SEARCH_ICON =
    '<svg class="search-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" stroke-width="2"/><path d="m13 13 4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
</script>

<svelte:head>
  <title>{title}</title>
  {#if description}<meta name="description" content={description} />{/if}
  {#if canonical}<link rel="canonical" href={canonical} />{/if}
  <meta property="og:type" content={ogType} />
  <meta property="og:site_name" content={site.brand} />
  <meta property="og:title" content={title} />
  {#if description}<meta property="og:description" content={description} />{/if}
  {#if canonical}<meta property="og:url" content={canonical} />{/if}
  {#if ogImage}<meta property="og:image" content={ogImage} />{/if}
  <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
  {#if hasDiagram}<script defer src={MERMAID_SRC} integrity={MERMAID_SRI} crossorigin="anonymous"></script>{/if}
</svelte:head>

<div class="site page-{kind}">
  <a class="skip-link" href="#content">Skip to content</a>
  <div class="aurora" aria-hidden="true"></div>

  <header class="site-header">
    <div class="header-inner">
      <button type="button" class="nav-toggle" aria-controls="sidebar" aria-expanded="false"><span class="nav-toggle-icon" aria-hidden="true">☰</span> Menu</button>
      <a class="brand" href="/">{site.brand}</a>
      <nav class="header-nav" aria-label="Primary">
        {#each site.headerLinks as link}
          <a class="header-link" href={safeHref(link.href)} aria-current={linkCurrent(link) ? "page" : undefined} rel={isExternal(link.href) ? "noopener" : undefined}>{link.label}</a>
        {/each}
      </nav>
      <!-- site.js opens the dialog below; finish-build adds ?v= to data-index. -->
      <button type="button" class="search-toggle" aria-label="Search" aria-haspopup="dialog" aria-controls="search" aria-keyshortcuts="/ Control+K Meta+K" data-index="/search.json">
        {@html SEARCH_ICON}<span class="search-toggle-label" aria-hidden="true">Search</span><kbd class="search-toggle-key" aria-hidden="true">/</kbd>
      </button>
      <button type="button" class="theme-toggle" aria-label="Toggle dark mode"><span class="theme-icon theme-icon-moon" aria-hidden="true">🌙</span><span class="theme-icon theme-icon-sun" aria-hidden="true">☀️</span></button>
    </div>
  </header>
  <div class="nav-scrim" hidden></div>

  <dialog class="search-dialog" id="search" aria-label="Search {site.brand}">
    <div class="search-panel">
      <div class="search-bar" role="search">
        {@html SEARCH_ICON}
        <input class="search-input" type="search" placeholder="Search the docs" aria-label="Search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="search-results" />
        <button type="button" class="search-close" aria-label="Close search">✕</button>
      </div>
      <div class="search-results" id="search-results" role="listbox" aria-label="Results"></div>
      <div class="search-foot">
        <p class="search-status" role="status"></p>
        <p class="search-keys" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> choose</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p>
      </div>
    </div>
  </dialog>

  <div class="layout">
    {#if kind === "doc"}
      <aside class="sidebar" id="sidebar">
        <nav class="sidebar-nav" aria-label="Documentation">
          {#each site.nav as group}
            <div class="nav-group">
              {#if group.title}<p class="nav-group-title">{group.title}</p>{/if}
              <ul class="nav-links">
                {#each group.items as item}
                  <li><a href="/{item.slug}" aria-current={path === `/${item.slug}` ? "page" : undefined}>{item.label}</a></li>
                {/each}
              </ul>
            </div>
          {/each}
        </nav>
      </aside>
    {/if}
    <main id="content" class="content" tabindex="-1">
      {@render children()}
    </main>
  </div>

  <footer class="site-footer">
    {@html site.footerHtml}
    <p class="built-from">Built from dmart data via the <a href="https://github.com/edraj/website">public API</a>.</p>
  </footer>
</div>
