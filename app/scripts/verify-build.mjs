// Checks the built site is what the demo claims: every page exported from
// dmart is a real HTML file with its text in the markup (not a JS shell), and
// nothing in it needs 'unsafe-inline' under dmart's site CSP.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist/client";
const index = JSON.parse(readFileSync("src/content/index.json", "utf8"));
const failures = [];
const check = (cond, msg) => cond || failures.push(msg);

const pages = [{ path: "index.html", title: JSON.parse(readFileSync("src/content/home.json", "utf8")).titleLines?.[0] ?? "" }]
  .concat(index.map((p) => ({ path: `${p.slug}/index.html`, title: p.title })))
  .concat([{ path: "404.html", title: "Page not found" }]);

for (const p of pages) {
  const file = join(DIST, p.path);
  if (!existsSync(file)) { failures.push(`missing ${p.path}`); continue; }
  const html = readFileSync(file, "utf8");
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ");
  check(text.includes(p.title.replace(/&/g, "&amp;")) || text.includes(p.title), `${p.path}: title "${p.title}" not in the markup`);
  if (p.path !== "404.html") check(text.length > 400, `${p.path}: only ${text.length} chars of text — a shell, not a page`);
  check(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html), `${p.path}: inline <script>`);
  check(!/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<svg[\s\S]*?<\/svg>/g, "")), `${p.path}: inline event handler`);
  check(/<link rel="stylesheet"[^>]*\/assets\/[^"]+\.css"/.test(html), `${p.path}: no stylesheet link`);
  // A link inside a link is invalid: the browser splits the outer one apart,
  // which is how a linked card ends up as several empty boxes.
  let depth = 0, deepest = 0;
  for (const [tag] of html.matchAll(/<\/?a\b[^>]*>/gi)) deepest = Math.max(deepest, (depth += tag[1] === "/" ? -1 : 1));
  check(deepest <= 1, `${p.path}: a link nested inside a link`);
}
check(existsSync(join(DIST, "sitemap.xml")), "missing sitemap.xml");

if (failures.length) {
  console.error(`verify: ${failures.length} problem(s)\n  ` + failures.join("\n  "));
  process.exit(1);
}
console.log(`verify: ${pages.length} pages, each with its content in the HTML; no inline script`);
