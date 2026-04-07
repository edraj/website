import mermaid from "mermaid";

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

async function renderMermaid(container: HTMLElement): Promise<void> {
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
