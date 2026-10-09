import { svelte } from "@sveltejs/vite-plugin-svelte";
import routify from "@roxi/routify/vite-plugin";
import { defineConfig } from "vite";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Every URL the build writes out. scripts/export-content.mjs lists the pages it
// pulled from dmart; spank renders each one to <path>/index.html through
// Routify's own server renderer (no simulated browser), plus /404 for the
// not-found page.
const index = resolve("src/content/index.json");
const pages = existsSync(index) ? JSON.parse(readFileSync(index, "utf8")).map((p) => `/${p.slug}`) : [];

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      $lib: resolve("src/lib"),
      $content: resolve("src/content"),
    },
  },
  plugins: [
    routify({
      // Static HTML only. csr:false drops the app bundle from every page: the
      // content is in the markup, and the few interactive parts (theme,
      // drawer, copy buttons, diagrams, the explainer, search) are one plain
      // script in public/site.js. dmart's site CSP allows no inline script,
      // and this output has none.
      render: { csr: false, ssr: false, ssg: { enable: true, spank: { sitemap: ["/", ...pages, "/404"], depth: 0 } } },
    }),
    svelte(),
  ],
  build: { target: "es2022" },
});
