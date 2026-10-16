# The `website` pack

dmart.cc's content as a dmart [solution pack](https://github.com/edraj/csdmart/tree/master/packs):
`pack.json`, the space tree under `space/`, and a management overlay under
`management/`. It is the same format as csdmart's own packs, so csdmart's
`packs/install.sh` can install it too once packs can come from outside that
repository; until then, `install.sh` here does the two steps a pack this small
needs.

| | |
|---|---|
| Space | `website` |
| Folders | `pages` (markdown, one per page), `site` (`config`, `home`), `schema` |
| Schemas | `site_config`, `landing_page` |
| Role | `website_public` → permission `website_public_read` |
| Public role | `website_public` (granted only with `--public`) |

`website_public_read` lets its holder **query** and **view** `content` and
`folder` entries anywhere in the `website` space, **only while they are
active**. An inactive entry is a draft: it stays out of the public API, and
therefore out of the site.

```bash
export BACKEND_ENV=/path/to/config.env   # the dmart to install into
pack/install.sh --dry-run                # list what would be imported
pack/install.sh                          # import; existing rows are skipped
pack/install.sh --replace                # import, overwriting existing rows
DMART_URL=… DMART_ADMIN_PASSWORD=… pack/install.sh --public
```

`--public` reads the anonymous user's roles and adds `website_public` to them;
it never replaces `world`, which the anonymous user must keep. Undo it by taking
the role back off the anonymous user.

## Content

- **Pages**: `space/pages/.dm/<shortname>/meta.content.json` holds the title
  (`displayname`), the summary (`description`, used for search and link
  previews) and the `slug` that becomes the URL; the body is
  `space/pages/<shortname>.md`. Shortnames cannot contain hyphens, so `slug`
  carries URLs such as `/data-model`.
- **`site/config`**: brand, title suffix, header links (`docs: true` marks the
  link that is current on every docs page), the docs sidebar (`nav`), the
  footer (markdown) and `base_url` (canonical URLs, sitemap).
- **`site/home`**: the landing page's text. Its layout and art (icons,
  figures, the animated explainer) belong to the site in `../app`; the
  content names them.

UUIDs are deterministic (UUIDv5 on a fixed namespace), so re-importing the pack
updates rows instead of duplicating them.
