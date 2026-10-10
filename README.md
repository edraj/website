# dmart.cc

The website of [dmart](https://github.com/edraj/csdmart), and a working example
of the thing it advertises: **a public site built on top of dmart data**.

Nothing the site shows is in this app's source. The pages, the navigation and
the landing page live in a dmart space, and the site reads them the way any
anonymous visitor could — through dmart's public API, with the official
TypeScript SDK — then renders each page to static HTML.

```
pack/   the `website` dmart pack: the content, its schemas, and the role that
        makes it publicly readable
app/    the site: Svelte 5 + Routify 3, prerendered at build time
```

## How it works

1. **Content is a dmart pack.** `pack/space/` is the `website` space in dmart's
   on-disk layout: `pages/` (one markdown entry per page, `slug` = its URL),
   `site/config` (brand, header links, docs sidebar, footer, base URL) and
   `site/home` (the landing page), validated by the schemas in `schema/`.
   `pack/management/` adds a `website_public` role that may *query* and *view*
   active entries of that space — nothing else. Installing the pack opens
   nothing; `--public` grants that role to dmart's anonymous user.
2. **The build asks dmart.** `app/scripts/export-content.mjs` runs
   `Dmart.query({type: "subpath", space_name: "website", …}, DmartScope.public)`
   for `/pages` and `/site`, renders the markdown (raw HTML escaped, unsafe link
   schemes dropped), and writes one static route per page. What the public
   permissions don't expose, the site cannot publish — drafts
   (`is_active: false`) included.
3. **Every page is real HTML.** Routify prerenders each route through its own
   server renderer. Pages ship without an app bundle: the content is in the
   markup, and the interactive parts (theme, docs drawer, copy buttons,
   diagrams, the animated explainer) are one small script, `app/public/site.js`.
   Nothing needs `'unsafe-inline'`, so the site runs under a strict CSP.
4. **Caddy serves it as files.** The build is copied to `/var/www/dmart.cc` on
   i1 and Caddy serves it from disk, with the CSP and caching headers set there
   (infra-ansible, role dmart, `landing_static`). dmart is needed only to build
   the site, not to serve it.

## Working on it

```bash
cd app
yarn install
yarn build          # reads the LIVE dmart.cc public API by default
yarn verify         # every page has its content in the HTML; no inline script
```

`DMART_URL` points the build at another dmart, such as a local one with the
pack installed:

```bash
export BACKEND_ENV=/path/to/config.env          # the CLI never reads ./config.env
pack/install.sh                                 # import the space, role and permission
DMART_URL=http://127.0.0.1:8282 DMART_ADMIN_PASSWORD=… pack/install.sh --public
DMART_URL=http://127.0.0.1:8282 yarn --cwd app build
```

To change content, edit `pack/space/` and re-import it with
`pack/install.sh --replace`, or edit it in dmart's admin UI. Either way, the
site changes on the next build.

CI runs the whole loop on every pull request: a release build of dmart,
the pack installed into it, the site built from its public API, and the result
verified.

## Publishing

```bash
./deploy.sh            # build from https://dmart.cc/dmart, verify, upload to i1, switch
./deploy.sh --dry-run  # build and verify only
```

The three newest builds are kept on the server, under
`/var/www/dmart.cc/builds/`. `current` is a symlink to the live one; to roll
back, point it at an older build (`deploy.sh`'s header has the command).
