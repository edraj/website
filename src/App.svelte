<script lang="ts">
  import { onMount } from "svelte";
  import type { Component } from "svelte";
  import AuroraBackground from "./lib/AuroraBackground.svelte";
  import Home from "./lib/Home.svelte";
  import Features from "./features/+page.svelte";
  import Why from "./why/+page.svelte";
  import Technical from "./technical/+page.svelte";
  import DataModel from "./data-model/+page.svelte";
  import Folders from "./folders/+page.svelte";
  import Drivers from "./drivers/+page.svelte";
  import AccessControl from "./access-control/+page.svelte";
  import EntityLifecycle from "./entity-lifecycle/+page.svelte";
  import Plugins from "./plugins/+page.svelte";
  import ApiDocs from "./api-docs/+page.svelte";
  import QuerySearch from "./query-search/+page.svelte";
  import Settings from "./settings/+page.svelte";
  import CLI from "./cli/+page.svelte";
  import Tickets from "./tickets/+page.svelte";

  type PageComponent = Component<Record<string, never>>;

  const routes: Record<string, { component: PageComponent; title: string }> = {
    "/features": { component: Features, title: "Features" },
    "/why": { component: Why, title: "Why DMART?" },
    "/technical": { component: Technical, title: "Technical Overview" },
    "/data-model": { component: DataModel, title: "Data Model" },
    "/folders": { component: Folders, title: "Folders & Rendering" },
    "/drivers": { component: Drivers, title: "Drivers & SDKs" },
    "/access-control": { component: AccessControl, title: "Access Control" },
    "/entity-lifecycle": {
      component: EntityLifecycle,
      title: "Entity Lifecycle",
    },
    "/tickets": { component: Tickets, title: "Tickets & Workflows" },
    "/plugins": { component: Plugins, title: "Plugins" },
    "/api-docs": { component: ApiDocs, title: "API Documentation" },
    "/query-search": { component: QuerySearch, title: "Query Search" },
    "/settings": { component: Settings, title: "Configuration Settings" },
    "/cli": { component: CLI, title: "CLI Reference" },
  };

  // Single source of truth for the docs sidebar; docsPaths is derived so the
  // two can never drift.
  const docsNav = [
    {
      group: "Concepts",
      items: [
        { path: "/technical", label: "Technical Overview" },
        { path: "/data-model", label: "Data Model" },
        { path: "/folders", label: "Folders & Rendering" },
        { path: "/entity-lifecycle", label: "Entity Lifecycle" },
        { path: "/tickets", label: "Tickets & Workflows" },
      ],
    },
    {
      group: "Reference",
      items: [
        { path: "/api-docs", label: "API Reference" },
        { path: "/query-search", label: "Query Search" },
        { path: "/cli", label: "CLI" },
        { path: "/settings", label: "Settings" },
      ],
    },
    {
      group: "Security & Extensibility",
      items: [
        { path: "/access-control", label: "Access Control" },
        { path: "/plugins", label: "Plugins" },
        { path: "/drivers", label: "Drivers & SDKs" },
      ],
    },
  ];
  const docsPaths = docsNav.flatMap((g) => g.items.map((i) => i.path));

  let currentPath = $state(window.location.pathname);
  let isDark = $state(false);
  let sidebarOpen = $state(false);
  let lastDocPath = $state("/technical");
  let sidebarEl = $state<HTMLElement | null>(null);
  let toggleEl = $state<HTMLButtonElement | null>(null);

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    currentPath = path;
    sidebarOpen = false;
    if (docsPaths.includes(path)) lastDocPath = path;
    updateTitle(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateTitle(path: string) {
    const route = routes[path];
    document.title = route
      ? `${route.title} - DMART`
      : "DMART - Data-as-a-Service Platform";
  }

  function goToDocs() {
    navigate(lastDocPath);
  }

  function onSidebarLink(e: MouseEvent, path: string) {
    // Preserve modifier / middle clicks so links open in a new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;
    e.preventDefault();
    navigate(path);
  }

  function openSidebar() {
    sidebarOpen = true;
    requestAnimationFrame(() => sidebarEl?.querySelector("a")?.focus());
  }

  function closeSidebar() {
    sidebarOpen = false;
    toggleEl?.focus();
  }

  function toggleTheme() {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
    window.dispatchEvent(
      new CustomEvent("themechange", { detail: { dark: isDark } }),
    );
  }

  onMount(() => {
    const handlePopState = () => {
      currentPath = window.location.pathname;
      sidebarOpen = false;
      if (docsPaths.includes(currentPath)) lastDocPath = currentPath;
      updateTitle(currentPath);
    };
    window.addEventListener("popstate", handlePopState);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);

    // Seed the remembered doc path if we deep-linked straight into a doc page.
    if (docsPaths.includes(currentPath)) lastDocPath = currentPath;

    const savedTheme = localStorage.getItem("theme");
    if (
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      isDark = true;
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      isDark = false;
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    updateTitle(currentPath);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", onKey);
    };
  });

  let CurrentPage = $derived(routes[currentPath]?.component);

  let activeTab = $derived.by(() => {
    if (currentPath === "/features") return "features";
    if (currentPath === "/why") return "why";
    if (docsPaths.includes(currentPath)) return "docs";
    return "home";
  });

  let inDocs = $derived(activeTab === "docs");
</script>

<AuroraBackground />

<main>
  <nav>
    <div class="nav-container">
      <div class="logo" role="link" tabindex="0" onclick={() => navigate("/")} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/"); } }}>DMART</div>
      <div class="links">
        <button
          onclick={() => navigate("/")}
          class:active={activeTab === "home"}>Home</button
        >
        <button
          onclick={() => navigate("/features")}
          class:active={activeTab === "features"}>Features</button
        >
        <button
          onclick={() => navigate("/why")}
          class:active={activeTab === "why"}>Why DMART?</button
        >
        <button onclick={goToDocs} class:active={activeTab === "docs"}
          >Docs</button
        >
        <button
          onclick={toggleTheme}
          class="theme-toggle"
          aria-label="Toggle Dark Mode"
        >
          {#if isDark}
            ☀️
          {:else}
            🌙
          {/if}
        </button>
      </div>
    </div>
  </nav>

  {#if activeTab === "home"}
    <Home {navigate} />
  {:else if inDocs}
    <div class="docs-topbar">
      <button
        class="docs-menu-btn"
        bind:this={toggleEl}
        onclick={openSidebar}
        aria-label="Open documentation menu"
        aria-expanded={sidebarOpen}
        aria-controls="docs-sidebar"
      >
        ☰ Menu
      </button>
      <span class="docs-crumb">{routes[currentPath]?.title}</span>
    </div>
    {#if sidebarOpen}
      <button
        class="docs-scrim"
        aria-label="Close documentation menu"
        onclick={closeSidebar}
      ></button>
    {/if}
    <div class="docs-layout">
      <div class="docs-sidebar" class:open={sidebarOpen} id="docs-sidebar">
        <nav class="docs-nav" aria-label="Documentation" bind:this={sidebarEl}>
          {#each docsNav as section}
            <p class="docs-group-label">{section.group}</p>
            <ul class="docs-links">
              {#each section.items as item}
                <li>
                  <a
                    href={item.path}
                    class:active={currentPath === item.path}
                    aria-current={currentPath === item.path ? "page" : undefined}
                    onclick={(e) => onSidebarLink(e, item.path)}>{item.label}</a
                  >
                </li>
              {/each}
            </ul>
          {/each}
        </nav>
      </div>
      <div class="docs-content">
        <CurrentPage />
      </div>
    </div>
  {:else if CurrentPage}
    <div class="page-container">
      <CurrentPage />
    </div>
  {/if}

  <footer>
    <p>&copy; {new Date().getFullYear()} DMART. Open Source Data Platform.</p>
    <p class="footer-links">
      <a href="https://github.com/edraj/csdmart" target="_blank" rel="noopener noreferrer">GitHub</a>
      <span class="footer-sep">|</span>
      <a href="https://github.com/edraj/csdmart/blob/master/LICENSE" target="_blank" rel="noopener noreferrer">AGPL-3.0</a>
    </p>
  </footer>
</main>

<style>
  :global(body) {
    background-color: var(--bg-color);
    color: var(--text-main);
  }

  nav {
    background: rgba(255, 255, 255, 0.72);
    /* The sticky nav previously blurred whatever scrolled under it. That is a
       permanently-composited layer on every page for an effect the new opaque
       palette does not need, and it cost text contrast over the hero. */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    border-bottom: 1px solid transparent;
    border-image: var(--gradient-hairline) 1;
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 0.75rem 0;
  }

  :global(:root.dark) nav {
    background: rgba(15, 15, 26, 0.72);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--iri-2);
    cursor: pointer;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    transition: filter 0.3s ease;
  }

  .logo:hover {
    filter: brightness(1.12) saturate(1.1);
  }


  .links {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  nav button {
    background: transparent;
    border: none;
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    font-weight: 500;
    border-bottom: 2px solid transparent;
    transition: color 0.2s ease, border-color 0.2s ease;
  }

  nav button:hover {
    color: var(--primary-color);
    background: transparent;
    border-bottom: 2px solid transparent;
    border-image: linear-gradient(90deg, var(--iri-1), var(--iri-3), var(--iri-4)) 1;
    box-shadow: none;
    transform: none;
  }

  nav button.active {
    color: var(--primary-color);
    background: transparent;
    font-weight: 600;
    border-bottom: 2px solid transparent;
    border-image: linear-gradient(90deg, var(--iri-1), var(--iri-3), var(--iri-4)) 1;
  }

  .theme-toggle {
    margin-left: 0.75rem;
    font-size: 1.15rem;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  .theme-toggle:hover {
    border-color: var(--primary-color);
    background: var(--accent-light);
    border-bottom: 1px solid var(--primary-color);
  }

  .page-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 3.5rem 2.5rem;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-top: none;
    min-height: 80vh;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }

  /* ─── DOCS LAYOUT (sidebar + content) ─── */
  /* One unified frosted-glass panel, continuing from the nav's bottom hairline
     exactly like .page-container, split by a vertical iridescent hairline. */
  .docs-layout {
    min-width: 0;
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-top: none;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    min-height: 80vh;
  }

  /* Transparent cell; carries only the full-height vertical hairline divider. */
  .docs-sidebar {
    border-right: 1px solid transparent;
    border-image: var(--gradient-hairline-v) 1;
  }

  .docs-nav {
    position: sticky;
    top: var(--nav-h);
    max-height: calc(100vh - var(--nav-h));
    overflow-y: auto;
    padding: 2rem 1rem 2.5rem;
  }

  .docs-group-label {
    margin: 1.5rem 0 0.35rem 0.8rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
  }

  .docs-group-label:first-child {
    margin-top: 0;
  }

  .docs-links {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .docs-links a {
    position: relative;
    display: block;
    padding: 0.45rem 0.8rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    text-decoration: none;
  }

  /* Mirrors .content h1's iridescent left bar, but keeps the rounded fill. */
  .docs-links a::before {
    content: "";
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 2px;
    background: linear-gradient(180deg, var(--iri-1), var(--iri-3), var(--iri-4));
    opacity: 0;
  }

  .docs-links a:hover {
    background: var(--accent-light);
    color: var(--primary-color);
  }

  .docs-links a.active {
    background: var(--accent-light);
    color: var(--primary-color);
    font-weight: 600;
  }

  .docs-links a.active::before {
    opacity: 1;
  }

  .docs-links a:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .docs-content {
    padding: 3rem 2.5rem;
    min-width: 0;
  }

  /* Mobile-only chrome, hidden on desktop. */
  .docs-topbar,
  .docs-scrim {
    display: none;
  }

  main {
    min-height: 100vh;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  footer {
    text-align: center;
    padding: 1.5rem 1rem;
    color: var(--text-secondary);
    border-top: 1px solid transparent;
    border-image: var(--gradient-hairline) 1;
    margin-top: auto;
    background: transparent;
    font-size: 0.85rem;
  }

  footer p {
    margin: 0;
    line-height: 1.6;
  }

  footer .footer-links {
    margin-top: 0.4rem;
  }

  footer a {
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  footer a:hover {
    color: var(--primary-color);
  }

  :global(.footer-sep) {
    color: var(--border-color);
    margin: 0 0.5rem;
  }

  @media (max-width: 768px) {
    .nav-container {
      flex-direction: column;
      gap: 1rem;
    }
    .links {
      flex-wrap: wrap;
      justify-content: center;
    }
    .theme-toggle {
      margin-left: 0;
    }
    .page-container {
      padding: 2rem 1.25rem;
    }

    /* Docs: collapse the grid; sidebar becomes an off-canvas drawer. */
    .docs-topbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1.25rem;
      background: var(--glass-bg);
      backdrop-filter: blur(var(--glass-blur));
      -webkit-backdrop-filter: blur(var(--glass-blur));
      border-bottom: 1px solid transparent;
      border-image: var(--gradient-hairline) 1;
    }
    .docs-menu-btn {
      padding: 0.4rem 0.7rem;
      font-size: 0.9rem;
      color: var(--text-main);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: transparent;
    }
    .docs-crumb {
      font-weight: 600;
      color: var(--text-main);
    }
    .docs-layout {
      display: block;
      width: 100%;
    }
    .docs-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100dvh;
      width: min(300px, 82vw);
      z-index: 300;
      transform: translateX(-100%);
      background: var(--bg-secondary);
      border-right: 1px solid var(--glass-border);
      border-image: none;
      box-shadow: var(--shadow-lg);
      overflow-y: auto;
    }
    .docs-sidebar.open {
      transform: translateX(0);
    }
    .docs-nav {
      position: static;
      max-height: none;
    }
    .docs-scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 250;
      border: none;
      padding: 0;
      background: rgba(0, 0, 0, 0.45);
    }
    .docs-content {
      padding: 2rem 1.25rem;
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .docs-sidebar {
      transition: transform 0.25s ease;
    }
    .docs-links a {
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .docs-links a::before {
      transition: opacity 0.18s ease;
    }
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not(.light)) nav {
      background: rgba(15, 15, 26, 0.85);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
    }
  }
</style>
