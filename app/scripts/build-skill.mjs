// Build step 4: the `dmart` agent skill, from the same export the pages came from.
//
// An Agent Skill is a folder with a SKILL.md (when to use it, and the rules and
// recipes that get most tasks done) and reference files an agent opens when it
// needs more. The SKILL.md is hand-written (../skill/SKILL.md); the references
// are this site's own documentation pages, as markdown, so the skill cannot say
// something the site does not. It writes:
//   dist/client/skill/dmart/SKILL.md
//   dist/client/skill/dmart/references/<slug>.md   one per docs page
//   dist/client/skill/dmart.zip                    the folder, for installing
//   dist/client/llms.txt                           an index for AI tools
//
// It fails the build when SKILL.md points at a reference that does not exist,
// or when a docs page is missing from SKILL.md's reference table, so the two
// move together.
import { deflateRawSync, crc32 } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "src/content");
const DIST = join(ROOT, "dist/client");
const OUT = join(DIST, "skill/dmart");

const site = JSON.parse(readFileSync(join(CONTENT, "site.json"), "utf8"));
const index = JSON.parse(readFileSync(join(CONTENT, "index.json"), "utf8"));
const base = (site.baseUrl || "https://dmart.cc").replace(/\/+$/, "");
const docs = site.nav.flatMap((g) => g.items.map((i) => i.slug));
const bySlug = new Map(index.map((p) => [p.slug, p]));

let skill = readFileSync(join(ROOT, "../skill/SKILL.md"), "utf8");
const built = new Date().toISOString().slice(0, 10);
skill = skill.replace(
    "{{build_note}}",
    `_Built from ${base} on ${built}. It describes the dmart release that site documents; the newest copy is always at ${base}/skill/dmart.zip._`,
);

const named = new Set([...skill.matchAll(/references\/([a-z0-9-]+)\.md/g)].map((m) => m[1]));
const problems = [
    ...[...named].filter((s) => !docs.includes(s)).map((s) => `SKILL.md names references/${s}.md, but no docs page has that slug`),
    ...docs.filter((s) => !named.has(s)).map((s) => `docs page /${s} is missing from SKILL.md's reference table`),
    ...docs.filter((s) => !existsSync(join(CONTENT, "markdown", `${s}.md`))).map((s) => `docs page /${s} has no markdown source`),
];
if (problems.length) {
    for (const p of problems) console.error(`build-skill: ${p}`);
    process.exit(1);
}

// A reference page as an agent reads it: a title, where it came from, a table of
// contents for a long one, and links between pages turned into file links.
function reference(slug) {
    const page = bySlug.get(slug);
    let md = readFileSync(join(CONTENT, "markdown", `${slug}.md`), "utf8").trim();
    md = md.replace(/\]\(\/([a-z0-9-]+)(#[^)]*)?\)/g, (m, s, hash) =>
        docs.includes(s) ? `](${s}.md${hash ?? ""})` : `](${base}/${s}${hash ?? ""})`);
    const lines = [`# ${page.title}`, "", `Source: ${base}/${slug}`, ""];
    const headings = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    if (md.split("\n").length > 300 && headings.length > 1) {
        lines.push("Contents:", "", ...headings.map((h) => `- ${h}`), "");
    }
    return `${lines.join("\n")}\n${md}\n`;
}

rmSync(join(DIST, "skill"), { recursive: true, force: true });
mkdirSync(join(OUT, "references"), { recursive: true });
const files = [["dmart/SKILL.md", skill]];
for (const s of docs) files.push([`dmart/references/${s}.md`, reference(s)]);
for (const [name, text] of files) writeFileSync(join(DIST, "skill", name), text);
writeFileSync(join(DIST, "skill/dmart.zip"), zip(files));

// The page's description, first sentence only: llms.txt is an index, not the page.
const pageLine = (s) => {
    const p = bySlug.get(s);
    const summary = (p.description ?? "").split(/(?<=[.!?])\s/)[0];
    return `- [${p.title}](${base}/skill/dmart/references/${s}.md)${summary ? `: ${summary}` : ""}`;
};
writeFileSync(
    join(DIST, "llms.txt"),
    [
        `# ${site.brand || "DMART"}`,
        "",
        "> dmart is a headless data platform: one self-contained binary that is both the server and its CLI, on PostgreSQL or SQLite, with a REST API, an MCP server for AI agents, schemas, workflows and fine-grained permissions.",
        "",
        "## Agent skill",
        "",
        `- [dmart skill](${base}/skill/dmart.zip): an Agent Skill (SKILL.md plus these pages as references) for working with a dmart instance`,
        `- [SKILL.md](${base}/skill/dmart/SKILL.md): the skill's instructions and verified recipes`,
        "",
        "## Docs",
        "",
        ...docs.map(pageLine),
        "",
    ].join("\n"),
);
console.log(`build-skill: SKILL.md + ${docs.length} references, skill/dmart.zip, llms.txt`);

// A zip of text files, deflated, with no dependency. Entries carry a fixed
// date, so the same input builds the same archive.
function zip(entries) {
    const local = [];
    const central = [];
    let offset = 0;
    for (const [name, text] of entries) {
        const nameBuf = Buffer.from(name, "utf8");
        const data = Buffer.from(text, "utf8");
        const packed = deflateRawSync(data, { level: 9 });
        const crc = crc32(data) >>> 0;
        const head = Buffer.alloc(30);
        head.writeUInt32LE(0x04034b50, 0);
        head.writeUInt16LE(20, 4);              // version needed
        head.writeUInt16LE(0x0800, 6);          // UTF-8 names
        head.writeUInt16LE(8, 8);               // deflate
        head.writeUInt16LE(0, 10);              // time 00:00
        head.writeUInt16LE(0x0021, 12);         // date 1980-01-01
        head.writeUInt32LE(crc, 14);
        head.writeUInt32LE(packed.length, 18);
        head.writeUInt32LE(data.length, 22);
        head.writeUInt16LE(nameBuf.length, 26);
        head.writeUInt16LE(0, 28);
        local.push(head, nameBuf, packed);
        const dir = Buffer.alloc(46);
        dir.writeUInt32LE(0x02014b50, 0);
        dir.writeUInt16LE(0x0314, 4);           // made by: Unix, 2.0
        dir.writeUInt16LE(20, 6);
        dir.writeUInt16LE(0x0800, 8);
        dir.writeUInt16LE(8, 10);
        dir.writeUInt16LE(0, 12);
        dir.writeUInt16LE(0x0021, 14);
        dir.writeUInt32LE(crc, 16);
        dir.writeUInt32LE(packed.length, 20);
        dir.writeUInt32LE(data.length, 24);
        dir.writeUInt16LE(nameBuf.length, 28);
        dir.writeUInt32LE((0o100644 << 16) >>> 0, 38); // -rw-r--r--
        dir.writeUInt32LE(offset, 42);
        central.push(dir, nameBuf);
        offset += head.length + nameBuf.length + packed.length;
    }
    const centralBuf = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralBuf.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...local, centralBuf, end]);
}
