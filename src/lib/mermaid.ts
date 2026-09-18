// mermaid is imported DYNAMICALLY and cached. Statically importing it put
// mermaid core -- and behind it ELK (1.4 MB), cytoscape (435 kB) and KaTeX
// (259 kB) -- into the graph of every page that used this helper, and seven do.
// Now the engine is fetched the first time a page actually draws a diagram.
type MermaidApi = typeof import("mermaid").default;
let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import("mermaid").then((m) => m.default);
  return mermaidPromise;
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

async function renderMermaid(container: HTMLElement): Promise<void> {
  // Nothing to draw -- do not pay for the engine.
  if (!container.querySelector(".mermaid")) return;

  const mermaid = await loadMermaid();
  const theme = isDarkMode() ? "dark" : "neutral";
  mermaid.initialize({ startOnLoad: false, theme });
  container.querySelectorAll(".mermaid[data-original]").forEach((el) => {
    el.removeAttribute("data-processed");
    el.innerHTML = el.getAttribute("data-original")!;
  });
  await mermaid.run({ nodes: container.querySelectorAll(".mermaid") });
}

/**
 * Svelte action that initializes Mermaid diagrams within the element
 * and re-renders them on theme changes.
 *
 * Usage: <div use:useMermaid>
 */
export function useMermaid(node: HTMLElement) {
  node.querySelectorAll("pre.mermaid").forEach((el) => {
    el.setAttribute("data-original", el.innerHTML);
  });
  renderMermaid(node);

  const onThemeChange = () => renderMermaid(node);
  window.addEventListener("themechange", onThemeChange);

  return {
    destroy() {
      window.removeEventListener("themechange", onThemeChange);
    },
  };
}
