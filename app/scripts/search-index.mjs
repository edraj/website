// The site search index, from the same export the pages came from. Used by
// scripts/finish-build.mjs, which writes it to dist/client/search.json; the
// browser fetches it the first time the search dialog opens and searches it
// there (public/site.js), so search needs no server.
//
// One entry per section: each page is split at its h2–h4 headings, so a
// result links to the part of the page that matched, not just the page.
//   url      /query-search#operators   (a page's own entry: /query-search)
//   title    the section's heading     (a page's own entry: the page title)
//   context  where it sits: "Query & Search › Value forms"  ("" for a page)
//   text     the section's text, tags stripped; diagrams left out, code kept
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BLOCK = /<\/?(?:p|div|br|hr|h[1-6]|ul|ol|li|dl|dt|dd|pre|blockquote|table|thead|tbody|tr|th|td)\b[^>]*>/gi;
const ENTITY = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

// markdown-it's output escapes only & < > " and passes everything else as
// characters, so these entities are all the text can hold.
const decode = (s) =>
    s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (m, hex, dec, name) =>
        hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(+dec) : ENTITY[name] ?? m);

// Block tags become spaces and inline ones vanish, so `<code>@field</code>:value`
// stays one searchable token.
const toText = (html) =>
    decode(
        html
            .replace(/<pre class="mermaid">[\s\S]*?<\/pre>/g, " ")
            .replace(BLOCK, " ")
            .replace(/<[^>]+>/g, ""),
    )
        .replace(/\s+/g, " ")
        .trim();

function pageEntries(page) {
    const path = `/${page.slug}`;
    const entries = [{ url: path, title: page.title, context: "", html: "" }];
    const parents = {}; // level → heading text, for the context of the levels below
    let last = 0;
    for (const m of page.html.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/g)) {
        entries.at(-1).html += page.html.slice(last, m.index);
        last = m.index + m[0].length;
        const level = +m[1];
        const id = m[2].match(/\bid="([^"]+)"/)?.[1];
        const heading = toText(m[3]);
        // The h1 is the page title, which the page's own entry already has;
        // h5/h6 (and a heading without an id to link to) stay in the text.
        if (level === 1) continue;
        if (level > 4 || !id) {
            entries.at(-1).html += ` ${m[0]} `;
            continue;
        }
        parents[level] = heading;
        for (let l = level + 1; l <= 4; l++) delete parents[l];
        const parent = [3, 2].filter((l) => l < level).map((l) => parents[l]).find(Boolean);
        entries.push({ url: `${path}#${id}`, title: heading, context: [page.title, parent].filter(Boolean).join(" › "), html: "" });
    }
    entries.at(-1).html += page.html.slice(last);
    return entries.map(({ html, ...e }) => ({ ...e, text: toText(html) }));
}

function homeEntries(home) {
    const intro = [home.badge, home.subtitleHtml, home.description, ...home.stats.map((s) => `${s.value} ${s.label}`)];
    return [
        { url: "/", title: home.title, context: "", text: toText(intro.join(" <p> ")) },
        ...home.sections.map((s) => ({
            url: s.id ? `/#${s.id}` : "/",
            title: s.title,
            context: "Home",
            text: toText([s.bodyHtml, ...s.items.flatMap((i) => [i.title, i.bodyHtml])].join(" <p> ")),
        })),
    ].filter((e) => e.title || e.text);
}

// Docs pages in the sidebar's order, then the other pages, then the landing
// page: on a tie, a result keeps that order.
export function buildSearchIndex(contentDir) {
    const site = JSON.parse(readFileSync(join(contentDir, "site.json"), "utf8"));
    const index = JSON.parse(readFileSync(join(contentDir, "index.json"), "utf8"));
    const home = JSON.parse(readFileSync(join(contentDir, "home.json"), "utf8"));
    const order = site.nav.flatMap((g) => g.items.map((i) => i.slug));
    const rank = (slug) => (order.includes(slug) ? order.indexOf(slug) : order.length);
    const slugs = index.map((p) => p.slug).sort((a, b) => rank(a) - rank(b));
    const entries = slugs.flatMap((slug) => pageEntries(JSON.parse(readFileSync(join(contentDir, "pages", `${slug}.json`), "utf8"))));
    return home ? entries.concat(homeEntries(home)) : entries;
}
