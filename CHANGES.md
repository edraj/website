# Codebase Improvements Report

## Dead Code Removal (4 files deleted)

- `src/lib/Features.svelte` - unused older draft
- `src/lib/WhyDmart.svelte` - unused older draft
- `src/lib/TechnicalOverview.svelte` - unused older draft
- `src/assets/svelte.svg` - unreferenced asset

## DRY: Mermaid Utility Extraction (new file)

- Created `src/lib/mermaid.ts` with a reusable Svelte action `useMermaid`
- Replaced ~29 lines of identical boilerplate in 4 components (`features`, `why`, `technical`, `access-control`) with a single `use:useMermaid` directive

## DRY: CSS Deduplication (~400+ lines removed)

- Moved 15+ shared style rules into `src/app.css` under `.content` scope (headings, paragraphs, lists, code, grid-list, tables, code-blocks, diagrams, step-sections, etc.)
- Stripped duplicated CSS from all 10 page components, keeping only component-specific styles

## Router Improvements (`App.svelte`)

- Removed 8-line stale development comment
- Replaced if/else chain with a typed `routes` map (`Record<string, { component, title }>`)
- Added `/drivers` to `docsPaths` (was missing - nav highlight didn't work)
- Removed unreachable `activeTab === "drivers"` case
- Added dynamic `document.title` updates on every navigation and popstate

## Accessibility Fixes

- **Dropdown**: Replaced `svelte-ignore` suppressions with proper `role="menu"`, `tabindex="0"`, and `onkeydown` handler (Enter/Space/Escape)
- **Logo**: Added `role="link"`, `tabindex="0"`, and keyboard handler
- **Pillar cards** (4): Added `role="link"`, `tabindex="0"`, and keyboard handlers
- **Explore cards** (4): Added `role="link"`, `tabindex="0"`, and keyboard handlers
- Result: **zero** a11y warnings in build (was 18+)

## Code Quality

- Removed unused `onMount` imports from 6 files
- Renamed misleading `--font-sans` to `--font-mono` (10 references)
- Removed all `!important` usage from plugins and api-docs pages
- Normalized indentation to 2-space in `access-control`, `entity-lifecycle`, `plugins` (were 4-space)

## Visual Redesign - Professional Look

Complete visual overhaul from brutalist monospace black/white to a polished modern SaaS design.

### Typography
- **Body font**: Inter (Google Fonts) replaces Courier New for all body text
- **Code font**: JetBrains Mono for code blocks and inline code only
- Removed `text-transform: uppercase` from headings and body text (kept only for badges/labels)

### Color System
- **Primary accent**: Indigo (#4f46e5 light / #818cf8 dark) for CTAs, links, active states, highlights
- **Backgrounds**: Warm off-white (#ffffff / #f8f9fc) light; deep blue-black (#0f0f1a / #161625) dark
- **Text**: Navy (#1a1a2e / #e8e8f0) main; muted blue-gray (#64648a / #9898b8) secondary
- **Code backgrounds**: Tinted (#f0f0f8 light / #1e1e30 dark)
- **Accent tint**: Light indigo (#eef2ff / #1e1b4b) for badges, tags, highlights

### UI Polish
- **Border radius**: 4px (small), 6px (medium/buttons), 12px (large/cards) replacing 0px everywhere
- **Shadows**: Layered soft shadows for cards, nav, dropdowns, hover states
- **Navigation**: Backdrop-blur glass effect, semi-transparent background, shadow instead of border
- **Dropdown menu**: Animated slide-in, rounded corners, shadow, blur backdrop
- **Buttons**: Smooth 0.2s transitions, colored hover states, proper rounded corners

### Home Page
- **Hero**: Larger title (5rem), indigo accent color on "MART", pill-shaped "OPEN SOURCE" badge with accent background
- **Stats**: Indigo-colored stat values, tinted background section
- **Pillar cards**: Rounded (12px), gapped layout, shadow-elevation hover with translateY(-2px), circular accent icon backgrounds
- **Explore cards**: Rounded, shadow hover, pill-shaped category tags
- **CTA section**: Tinted background, cleaner typography

### Documentation Pages
- **Page h1**: Left accent border in primary color (replaces bottom border)
- **Feature sections**: Rounded cards with subtle shadow
- **Code blocks**: Tinted background, rounded corners
- **Tables**: Rounded container borders
- **Items/grids**: Rounded cards with hover shadow effect
- **Highlight boxes**: Accent background tint (replaces dashed border)

### Component-Specific
- **API docs**: HTTP method badges with colored backgrounds (GET green, POST blue, PUT orange, DELETE red), rounded endpoint cards with hover shadow
- **Plugins**: Rounded plugin cards with hover elevation, pill-shaped active/inactive status tags with accent styling
- **Drivers**: Rounded copy-to-clipboard containers, accent-colored package links

### Footer
- Added GitHub and License links
- More generous padding, subtle link hover transitions

### Favicon
- Custom DMART "DM" SVG favicon (replaces Vite default)
