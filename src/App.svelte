<script lang="ts">
  import { onMount } from "svelte";
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

  const routes: Record<string, { component: typeof Home; title: string }> = {
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

  let Component = $derived(routes[currentPath]?.component ?? Home);

  let activeTab = $derived.by(() => {
    if (currentPath === "/features") return "features";
    if (currentPath === "/why") return "why";
    if (docsPaths.includes(currentPath)) return "docs";
    return "home";
  });
</script>

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
  {:else}
    <div class="page-container">
      <Component />
    </div>
  {/if}

  <footer>
    <p>&copy; {new Date().getFullYear()} DMART. Open Source Data Platform.</p>
  </footer>
</main>

<style>
  :global(body) {
    background-color: var(--bg-secondary);
    color: var(--text-main);
  }

  nav {
    background: var(--bg-color);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 1rem 0;
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
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-main);
    cursor: pointer;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .links {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  nav button {
    background: transparent;
    border: none;
    padding: 0.5rem 0;
    font-size: 1rem;
    color: var(--text-secondary);
    border-radius: 0;
    font-weight: 500;
    text-transform: uppercase;
    border-bottom: 1px solid transparent;
  }

  nav button:hover {
    color: var(--text-main);
    background: transparent;
    border-bottom: 1px solid var(--text-main);
    box-shadow: none;
    transform: none;
  }

  nav button.active {
    color: var(--text-main);
    background: transparent;
    font-weight: 700;
    border-bottom: 1px solid var(--text-main);
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
    min-width: 200px;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    z-index: 200;
    display: flex;
    flex-direction: column;
  }

  .dropdown-menu button {
    padding: 0.65rem 1rem;
    text-align: left;
    font-size: 0.85rem;
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
  }

  .dropdown-menu button:last-child {
    border-bottom: none;
  }

  .dropdown-menu button:hover {
    background: var(--bg-secondary);
    color: var(--text-main);
    border-bottom: 1px solid var(--border-color);
  }

  .dropdown-menu button:last-child:hover {
    border-bottom: none;
  }

  .theme-toggle {
    margin-left: 1rem;
    font-size: 1.2rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
  }

  .theme-toggle:hover {
    border-color: var(--text-main);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--text-main);
  }

  .page-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 4rem 2rem;
    background: var(--bg-color);
    min-height: 80vh;
  }

  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  footer {
    text-align: center;
    padding: 0.75rem 1rem;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-color);
    margin-top: auto;
    background: var(--bg-secondary);
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }

  footer p {
    margin: 0;
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
  }
</style>
