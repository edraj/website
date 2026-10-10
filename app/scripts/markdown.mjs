// Markdown → HTML for content read out of dmart, at build time.
//
// The same trust rules dmart's built-in `website build` applies:
//   - raw HTML in markdown is escaped, not passed through (`html: false`);
//   - markdown-it's validateLink drops javascript:, vbscript:, file: and
//     non-image data: targets;
//   - ```mermaid fences become <pre class="mermaid"> (escaped), drawn in the
//     browser by mermaid; every other fence is an ordinary code block;
//   - tables are wrapped so they scroll sideways on a phone.
// Heading ids follow GitHub's scheme, so `#query-paths`-style links in the
// content keep working.
//
// Linkify turns written-out URLs (`https://…`, `www.…`) into links, but not
// bare words that only look like a domain: "ASP.NET" is a product, not
// http://ASP.NET.

import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import taskLists from "markdown-it-task-lists";

const slugify = (s) =>
    s
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, "")
        .replace(/\s/g, "-");

const md = new MarkdownIt({ html: false, linkify: true, typographer: false })
    .use(anchor, { slugify, tabIndex: false })
    .use(taskLists, { enabled: false });
md.linkify.set({ fuzzyLink: false });

const fence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim().split(/\s+/)[0] === "mermaid")
        return `<pre class="mermaid">${md.utils.escapeHtml(token.content)}</pre>\n`;
    return fence(tokens, idx, options, env, self);
};
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
md.renderer.rules.table_close = () => "</table></div>\n";

// With `env.noLinks`, a link renders as its text alone.
for (const rule of ["link_open", "link_close"]) {
    const render = md.renderer.rules[rule] ?? ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    md.renderer.rules[rule] = (tokens, idx, options, env, self) => (env.noLinks ? "" : render(tokens, idx, options, env, self));
}

export const renderMarkdown = (src) => (src && src.trim() ? md.render(src).trimEnd() : "");

// For text that sits inside a link already, such as a linked card's body: a
// link nested in a link is invalid HTML, and the browser splits the outer one
// apart to repair it.
export const renderMarkdownNoLinks = (src) => (src && src.trim() ? md.render(src, { noLinks: true }).trimEnd() : "");

// One line without the paragraph around it, for subtitles and captions.
export const renderInline = (src) => (src && src.trim() ? md.renderInline(src.trim()) : "");

// The content owns its heading structure: a page whose body opens with its
// own `# Title` gets no second <h1> from the layout.
export const hasLeadingHeading = (body, type) => {
    if (!body || !body.trim()) return false;
    if (type === "markdown") {
        const first = md.parse(body, {}).find((t) => t.type !== "html_block");
        return !!first && first.type === "heading_open" && first.tag === "h1";
    }
    if (type === "html") return /^\s*<h1[\s>]/i.test(body);
    return false;
};

// Meta descriptions are plain text: drop markdown emphasis and code marks.
export const plainText = (src) =>
    (src ?? "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*`~]/g, "")
        .replace(/\s+/g, " ")
        .trim();
