# dmart.cc

The marketing and documentation site for [DMART](https://github.com/edraj/csdmart) —
a self-hosted structured information platform.

Svelte 5 + TypeScript + Vite, built to a static bundle. Fifteen routes, no
backend.

```bash
yarn install
yarn dev      # http://localhost:5173
yarn run check   # svelte-check + tsc
yarn build       # -> dist/
```

**Keep the entry chunk small.** Route components and `mermaid` are loaded
dynamically on purpose: every page used to be imported statically, which put
mermaid core — and behind it ELK, cytoscape and KaTeX — into the bundle every
visitor downloads. That was 449 kB; it is now ~62 kB. CI prints the entry chunk
size on each pull request so a regression is visible immediately.

## Deployment

`./deploy.sh` on the web host builds `main` and publishes it. It fast-forwards
to `origin/main`, installs with a frozen lockfile, type-checks, builds, and
**verifies `dist/` contains a real app shell before publishing** — the previous
version had no error handling, so a failed build still reached
`rsync --delete` and could empty the live site. The outgoing release is copied
to `$BACKUP_DIR` (last five kept) so a bad deploy can be rolled back without a
rebuild, and the script asserts afterwards that the live HTML references the
bundle hash it just built.

```bash
./deploy.sh --dry-run   # build and verify, stop before publishing
./deploy.sh             # build, publish, verify live
```

Paths come from environment variables with defaults for the dmart.cc host:
`REPO_DIR`, `WEB_ROOT`, `BACKUP_DIR`, `SITE_URL`.

### Host requirements

The router uses the History API (`pushState` + `location.pathname`), so **the
host must serve `index.html` for any unmatched path**. Without that fallback
every deep link and every refresh on a sub-page returns 404, and only in-app
navigation works.

dmart.cc runs on Caddy. The relevant part of
`/etc/caddy/Caddyfile.d/dmart.conf`:

```caddyfile
https://dmart.cc {
  handle * {
    root * /var/www/html/www/
    encode gzip
    try_files {path} /index.html
    file_server
  }

  # Unrelated to this site: the same vhost proxies Matrix/Synapse endpoints.
  handle /health              { reverse_proxy localhost:8008 }
  handle /_synapse/client/*   { reverse_proxy localhost:8008 }
}
```

That config lives on the server, not in this repo, which is why it is recorded
here: moving to a host without an equivalent `try_files` rule silently breaks
every shared link. Note also that `dmart.cc/health` is **not** this site — it is
proxied to Synapse, so it is not a usable health check for the web front end.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

## Need an official Svelte framework?

Check out [SvelteKit](https://github.com/sveltejs/kit#readme), which is also powered by Vite. Deploy anywhere with its serverless-first approach and adapt to various platforms, with out of the box support for TypeScript, SCSS, and Less, and easily-added support for mdsvex, GraphQL, PostCSS, Tailwind CSS, and more.

## Technical considerations

**Why use this over SvelteKit?**

- It brings its own routing solution which might not be preferable for some users.
- It is first and foremost a framework that just happens to use Vite under the hood, not a Vite app.

This template contains as little as possible to get started with Vite + TypeScript + Svelte, while taking into account the developer experience with regards to HMR and intellisense. It demonstrates capabilities on par with the other `create-vite` templates and is a good starting point for beginners dipping their toes into a Vite + Svelte project.

Should you later need the extended capabilities and extensibility provided by SvelteKit, the template has been structured similarly to SvelteKit so that it is easy to migrate.

**Why `global.d.ts` instead of `compilerOptions.types` inside `jsconfig.json` or `tsconfig.json`?**

Setting `compilerOptions.types` shuts out all other types not explicitly listed in the configuration. Using triple-slash references keeps the default TypeScript setting of accepting type information from the entire workspace, while also adding `svelte` and `vite/client` type information.

**Why include `.vscode/extensions.json`?**

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

**Why enable `allowJs` in the TS template?**

While `allowJs: false` would indeed prevent the use of `.js` files in the project, it does not prevent the use of JavaScript syntax in `.svelte` files. In addition, it would force `checkJs: false`, bringing the worst of both worlds: not being able to guarantee the entire codebase is TypeScript, and also having worse typechecking for the existing JavaScript. In addition, there are valid use cases in which a mixed codebase may be relevant.

**Why is HMR not preserving my local component state?**

HMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/rixo/svelte-hmr#svelte-hmr).

If you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

```ts
// store.ts
// An extremely simple external store
import { writable } from 'svelte/store'
export default writable(0)
```
