import site from "$content/site.json";

export { site };

// Icons and figures ship with the site; content names them ("database",
// "explainer") and an unknown name renders nothing.
const raw = (files) =>
  Object.fromEntries(Object.entries(files).map(([path, svg]) => [path.split("/").pop().replace(/\.svg$/, ""), svg.trim()]));
export const icons = raw(import.meta.glob("./art/icons/*.svg", { query: "?raw", import: "default", eager: true }));
export const figures = raw(import.meta.glob("./art/figures/*.svg", { query: "?raw", import: "default", eager: true }));

// Link targets from content: http(s), mailto, tel, relative and root-relative
// pass; anything else (javascript:, data:, …) becomes "#".
export function safeHref(href) {
  const h = (href ?? "").trim();
  if (!h) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return "#";
  return h;
}

export const isExternal = (href) => /^https?:\/\//i.test(href ?? "");

export const MERMAID_SRC = "https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.min.js";
export const MERMAID_SRI = "sha384-xzghz1GQ5u9HCpVskeDPqMsdogD1yvuMQbEK53+wi+G70+6J1AG0L2cfi9PHjDWI";
