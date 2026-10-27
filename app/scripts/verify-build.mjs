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
  check(/data-index="\/search\.json\?v=[0-9a-f]{10}"/.test(html), `${p.path}: no search button pointing at search.json?v=…`);
  // A link inside a link is invalid: the browser splits the outer one apart,
  // which is how a linked card ends up as several empty boxes.
  let depth = 0, deepest = 0;
  for (const [tag] of html.matchAll(/<\/?a\b[^>]*>/gi)) deepest = Math.max(deepest, (depth += tag[1] === "/" ? -1 : 1));
  check(deepest <= 1, `${p.path}: a link nested inside a link`);
}
check(existsSync(join(DIST, "sitemap.xml")), "missing sitemap.xml");

// The search index (scripts/search-index.mjs) has every page in it.
if (existsSync(join(DIST, "search.json"))) {
  const urls = new Set(JSON.parse(readFileSync(join(DIST, "search.json"), "utf8")).map((e) => e.url));
  for (const p of [{ slug: "" }, ...index]) check(urls.has(`/${p.slug}`), `search: /${p.slug} is not in search.json`);
} else failures.push("missing search.json");

// The agent skill (scripts/build-skill.mjs): a SKILL.md an agent can load, a
// reference per docs page, and the zip and llms.txt that point at them.
const skillMd = join(DIST, "skill/dmart/SKILL.md");
if (existsSync(skillMd)) {
  const md = readFileSync(skillMd, "utf8");
  const front = md.match(/^---\n([\s\S]*?)\n---\n/);
  check(front && /^name: dmart$/m.test(front[1]), "skill: SKILL.md has no `name: dmart` frontmatter");
  const description = front?.[1].match(/^description: (.+)$/m)?.[1] ?? "";
  check(description.length > 0 && description.length <= 1024, `skill: description is ${description.length} chars (1-1024)`);
  check(!md.includes("{{"), "skill: an unfilled {{placeholder}} in SKILL.md");
  for (const p of index.filter((p) => p.doc))
    check(existsSync(join(DIST, `skill/dmart/references/${p.slug}.md`)), `skill: no reference for /${p.slug}`);
} else failures.push("missing skill/dmart/SKILL.md");
check(existsSync(join(DIST, "skill/dmart.zip")), "missing skill/dmart.zip");
check(existsSync(join(DIST, "llms.txt")), "missing llms.txt");

if (failures.length) {
  console.error(`verify: ${failures.length} problem(s)\n  ` + failures.join("\n  "));
  process.exit(1);
}
console.log(`verify: ${pages.length} pages, each with its content in the HTML; no inline script; the search index; the agent skill and llms.txt`);
