// Build step 3, after `vite build` has prerendered every page into dist/client.
//   - 404: spank writes /404 as 404/index.html; dmart (and most static
//     servers) answer a miss with 404.html.
//   - sitemap.xml and robots.txt, from the same export the pages came from,
//     so they cannot drift from what was built.
//   - public/site.js is copied unhashed; its URL gets ?v=<content hash> so a
//     new build is never served an old script from cache.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist/client";
const site = JSON.parse(readFileSync("src/content/site.json", "utf8"));
const index = JSON.parse(readFileSync("src/content/index.json", "utf8"));
const home = JSON.parse(readFileSync("src/content/home.json", "utf8"));

if (existsSync(join(DIST, "404/index.html"))) {
  renameSync(join(DIST, "404/index.html"), join(DIST, "404.html"));
  rmSync(join(DIST, "404"), { recursive: true, force: true });
}

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
if (site.baseUrl) {
  const url = (path, updatedAt) =>
    `  <url>\n    <loc>${esc(site.baseUrl + path)}</loc>` + (updatedAt?.length >= 10 ? `\n    <lastmod>${updatedAt.slice(0, 10)}</lastmod>` : "") + "\n  </url>\n";
  writeFileSync(
    join(DIST, "sitemap.xml"),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      (home ? url("/", home.updatedAt) : "") + index.map((p) => url(`/${p.slug}`, p.updatedAt)).join("") + "</urlset>\n",
  );
  writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
} else {
  writeFileSync(join(DIST, "robots.txt"), "User-agent: *\nAllow: /\n");
  console.warn("finish-build: no base URL (site config base_url or SITE_URL) — no sitemap.xml");
}

const version = createHash("sha256").update(readFileSync(join(DIST, "site.js"))).digest("hex").slice(0, 10);
const htmlFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) htmlFiles.push(p);
  }
};
walk(DIST);
for (const f of htmlFiles) {
  const html = readFileSync(f, "utf8")
    .replace('<script src="/site.js"></script>', `<script src="/site.js?v=${version}"></script>`)
    .replace(/<!--ssr:(head|css|html)-->/g, "");
  writeFileSync(f, html);
}
// The app bundle Vite still emits is linked from no page (render.csr = false).
const referenced = htmlFiles.map((f) => readFileSync(f, "utf8")).join("\n");
for (const name of readdirSync(join(DIST, "assets")))
  if (name.endsWith(".js") && !referenced.includes(`/assets/${name}`)) rmSync(join(DIST, "assets", name));

console.log(`finish-build: ${htmlFiles.length} HTML file(s), site.js?v=${version}${site.baseUrl ? ", sitemap.xml" : ""}`);
