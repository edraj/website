<script lang="ts">
  import { onMount } from "svelte";
  import type { Component } from "svelte";
  import AuroraBackground from "./lib/AuroraBackground.svelte";
  import Home from "./lib/Home.svelte";
  import Features from "./features/+page.svelte";
  import Why from "./why/+page.svelte";
  import Technical from "./technical/+page.svelte";
  import Drivers from "./drivers/+page.svelte";
  import AccessControl from "./access-control/+page.svelte";
  import EntityLifecycle from "./entity-lifecycle/+page.svelte";
  import Plugins from "./plugins/+page.svelte";
  import ApiDocs from "./api-docs/+page.svelte";
  import Settings from "./settings/+page.svelte";
  import CLI from "./cli/+page.svelte";

  type PageComponent = Component<Record<string, never>>;

  const routes: Record<string, { component: PageComponent; title: string }> = {
    "/features": { component: Features, title: "Features" },
    "/why": { component: Why, title: "Why DMART?" },
    "/technical": { component: Technical, title: "Technical Overview" },
    "/drivers": { component: Drivers, title: "Drivers & SDKs" },
    "/access-control": { component: AccessControl, title: "Access Control" },
    "/entity-lifecycle": {
      component: EntityLifecycle,
      title: "Entity Lifecycle",
    },
    "/plugins": { component: Plugins, title: "Plugins" },
    "/api-docs": { component: ApiDocs, title: "API Documentation" },
    "/settings": { component: Settings, title: "Configuration Settings" },
    "/cli": { component: CLI, title: "CLI Reference" },
  };

  const docsPaths = [
    "/technical",
    "/entity-lifecycle",
    "/settings",
    "/api-docs",
    "/access-control",
    "/plugins",
    "/cli",
    "/drivers",
  ];

  let currentPath = $state(window.location.pathname);
  let isDark = $state(false);
  let docsOpen = $state(false);

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    currentPath = path;
    docsOpen = false;
    updateTitle(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateTitle(path: string) {
    const route = routes[path];
    document.title = route
      ? `${route.title} - DMART`
      : "DMART - Data-as-a-Service Platform";
  }

  function toggleDocs(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    docsOpen = !docsOpen;
  }

  function handleDocsKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDocs(e);
    } else if (e.key === "Escape") {
      docsOpen = false;
    }
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
      updateTitle(currentPath);
    };
    window.addEventListener("popstate", handlePopState);

    const closeDropdown = () => {
      docsOpen = false;
    };
    window.addEventListener("click", closeDropdown);

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
      window.removeEventListener("click", closeDropdown);
    };
  });

  let CurrentPage = $derived(routes[currentPath]?.component);

  let activeTab = $derived.by(() => {
    if (currentPath === "/features") return "features";
    if (currentPath === "/why") return "why";
    if (docsPaths.includes(currentPath)) return "docs";
    return "home";
  });
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
        <div
          class="dropdown"
          role="menu"
          tabindex="0"
          onclick={toggleDocs}
          onkeydown={handleDocsKeydown}
        >
          <button class:active={activeTab === "docs"}>Docs ▾</button>
          {#if docsOpen}
            <div class="dropdown-menu">
              <button onclick={() => navigate("/technical")}
                >Technical Overview</button
              >
              <button onclick={() => navigate("/entity-lifecycle")}
                >Entity Lifecycle</button
              >
              <button onclick={() => navigate("/settings")}>Settings</button>
              <button onclick={() => navigate("/api-docs")}
                >API Reference</button
              >
              <button onclick={() => navigate("/access-control")}
              >Access Control</button
              >
              <button onclick={() => navigate("/plugins")}>Plugins</button>
              <button onclick={() => navigate("/cli")}>CLI</button>
              <button onclick={() => navigate("/drivers")}>Drivers</button>
            </div>
          {/if}
        </div>
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
  {:else if CurrentPage}
    <div class="page-container">
      <CurrentPage />
    </div>
  {/if}

  <footer>
    <p>&copy; {new Date().getFullYear()} DMART. Open Source Data Platform.</p>
    <p class="footer-links">
      <a href="https://github.com/edraj/dmart" target="_blank" rel="noopener noreferrer">GitHub</a>
      <span class="footer-sep">|</span>
      <a href="https://github.com/edraj/dmart/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">License</a>
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
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
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
    font-size: 1.6rem;
    font-weight: 900;
    background: var(--gradient-iri);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    cursor: pointer;
    letter-spacing: 2px;
    text-transform: uppercase;
    transition: filter 0.3s ease;
  }

  .logo:hover {
    filter: brightness(1.12) saturate(1.1);
  }

  @media (prefers-reduced-motion: no-preference) {
    .logo {
      animation: logo-shimmer 10s ease-in-out infinite;
    }
  }

  @keyframes logo-shimmer {
    0%, 100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
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

  /* ─── DROPDOWN ─── */
  .dropdown {
    position: relative;
    cursor: pointer;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    min-width: 210px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 200;
    display: flex;
    flex-direction: column;
    padding: 0.35rem 0;
    animation: dropdown-in 0.15s ease-out;
  }

  :global(:root.dark) .dropdown-menu {
    background: rgba(22, 22, 37, 0.95);
  }

  @keyframes dropdown-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-menu button {
    padding: 0.6rem 1rem;
    text-align: left;
    font-size: 0.88rem;
    border-bottom: none;
    white-space: nowrap;
    border-radius: 0;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .dropdown-menu button:hover {
    background: var(--accent-light);
    color: var(--primary-color);
    border-bottom: none;
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

  main {
    min-height: 100vh;
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
    .dropdown-menu {
      left: 50%;
      transform: translateX(-50%);
    }
    .page-container {
      padding: 2rem 1.25rem;
    }
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not(.light)) nav {
      background: rgba(15, 15, 26, 0.85);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
    }
    :global(:root:not(.light)) .dropdown-menu {
      background: rgba(22, 22, 37, 0.95);
    }
  }
</style>
