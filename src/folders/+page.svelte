<script lang="ts">
  import { useMermaid } from "../lib/mermaid";
</script>

<div class="content" use:useMermaid>
  <h1>Folders &amp; Rendering</h1>
  <p class="intro">
    A folder in DMART is deceptively simple — and quietly one of the most
    powerful concepts in the platform. It is at once a <strong>structural
    node</strong> (the thing that makes a subpath browsable) and a
    <strong>declarative control panel</strong> that tells the admin UI exactly
    how to list, sort, filter, paginate and edit everything inside it, and tells
    the backend exactly what is allowed to live there. All of that lives in one
    small JSON body validated against a schema called
    <code>folder_rendering</code>. This page dissects every property.
  </p>

  <!-- ═══ A FOLDER IS JUST AN ENTRY ═══ -->
  <div class="feature-section">
    <h2>1. A folder is just an entry</h2>
    <p>
      There is no special <code>Folder</code> class with dozens of fields. A
      folder is an <a href="/data-model">entry</a> like any other, with
      <code>resource_type = folder</code>. It inherits the exact same Meta as a
      user or a blog post — uuid, shortname, ownership, tags, timestamps. It adds
      <strong>no fields of its own</strong>.
    </p>
    <p>
      All of a folder's "rendering" power lives entirely in its
      <strong>payload body</strong>, a JSON object whose
      <code>schema_shortname</code> is <code>folder_rendering</code>. That body
      is the subject of this whole page.
    </p>

    <div class="diagram-container">
      <pre class="mermaid">
graph TD
    F["Folder entry<br/>(resource_type = folder)"] --> M["Meta<br/>uuid, shortname, owner, tags…"]
    F --> P["Payload"]
    P --> SS["schema_shortname:<br/>folder_rendering"]
    P --> B["body = the rendering config<br/>index_attributes, allow_*, query, icons…"]
    B --> UI["Admin UI reads it → renders the listing"]
    B --> BE["Backend reads it → enforces what may be created here"]
      </pre>
    </div>

    <div class="highlight">
      The folder does not store its children. It stores <em>the rules and the
      view</em> for its children. The children are ordinary entries that happen
      to share its subpath.
    </div>
  </div>

  <!-- ═══ ANATOMY ON DISK ═══ -->
  <div class="feature-section">
    <h2>2. Anatomy: where the config actually lives</h2>
    <p>
      At runtime a folder is a single row in PostgreSQL like any entry, but when
      a space is exported to disk (DMART's import / export &amp; seed format) the
      split between a folder's <em>meta</em> and its <em>body</em> becomes
      physically visible. The meta sits inside the subpath's <code>.dm</code>
      directory; the body is a sibling JSON file named after the folder, one
      level up.
    </p>

    <div class="code-container tree">
      <pre><code>{`spaces/management/
├── schema.json                       ← the BODY  (the folder_rendering config)
└── schema/                           ← the /schema subpath
    └── .dm/
        └── meta.folder.json          ← the META  (points at ../schema.json as body)`}</code></pre>
    </div>

    <p>The meta simply references the body file and names the schema:</p>
    <div class="code-container">
      <pre><code>{`// management/schema/.dm/meta.folder.json
{
  "uuid": "b9b2b289-7f7c-4d40-a5a5-e896a9c146b4",
  "shortname": "schema",
  "is_active": true,
  "owner_shortname": "dmart",
  "payload": {
    "content_type": "json",
    "schema_shortname": "folder_rendering",   // ← validated against THE schema
    "body": "schema.json"                      // ← the sibling file with the config
  }
}`}</code></pre>
    </div>
  </div>

  <!-- ═══ THE SCHEMA: CENTRALIZED + EXACT ═══ -->
  <div class="feature-section">
    <h2>3. The <code>folder_rendering</code> schema — centralized &amp; exact</h2>
    <p>
      Every folder in every space is validated against a <strong>single</strong>
      canonical schema that lives in the <code>management</code> space at
      <code>management/schema/folder_rendering</code>. Two design decisions make
      it strict and safe:
    </p>
    <div class="grid-list">
      <div class="item">
        <strong>Centralized</strong>
        <span>The schema validator special-cases the shortname <code>folder_rendering</code> and always resolves it from the <code>management</code> space — so one definition governs all spaces, and you never copy it per space.</span>
      </div>
      <div class="item">
        <strong>Exact</strong>
        <span><code>additionalProperties: false</code> at every level. An unknown or <em>misspelled</em> field is rejected, not silently ignored — you find the typo immediately instead of debugging a prop that "does nothing".</span>
      </div>
      <div class="item">
        <strong>Minimal required</strong>
        <span>The only required property is <code>index_attributes</code>. A folder with nothing but one index attribute is valid; everything else is optional and defaulted.</span>
      </div>
    </div>
    <p class="code-note">
      Because validation is exact, the props below are the <strong>complete</strong>
      vocabulary. There is no hidden <code>columns</code>, <code>render_type</code>
      or <code>list_columns</code> — those don't exist here. What you see is what
      a folder can declare.
    </p>
  </div>

  <!-- ═══ PROPS: COLUMNS & DISPLAY ═══ -->
  <div class="feature-section">
    <h2>4. Props — display &amp; columns</h2>
    <p>
      These control what the listing (the "index page") looks like: which
      columns appear, their headers, the folder's icons, and the label for the
      shortname column.
    </p>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>Property</th><th>Type</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>index_attributes</code> <em>(required)</em></td>
            <td><code>[&#123;key, name&#125;]</code></td>
            <td>The star of the show. Each item is a column: <code>key</code> is the entry field/attribute to read, <code>name</code> is the header text shown. Order = column order. Must be unique. See §8.</td>
          </tr>
          <tr>
            <td><code>shortname_title</code></td>
            <td><code>string</code></td>
            <td>The header label used for the shortname column (e.g. "Permission Shortname", "API Name") — lets a technical <code>shortname</code> read as a friendly noun.</td>
          </tr>
          <tr>
            <td><code>search_columns</code></td>
            <td><code>[&#123;key, name&#125;]</code></td>
            <td>Which columns appear in the search/results view when searching within the folder. Same <code>&#123;key, name&#125;</code> shape as index_attributes.</td>
          </tr>
          <tr>
            <td><code>csv_columns</code></td>
            <td><code>[&#123;key, name&#125;]</code></td>
            <td>Which columns (and their headers) are written when the list is exported to CSV.</td>
          </tr>
          <tr>
            <td><code>icon</code></td>
            <td><code>string</code></td>
            <td>The folder's main icon, shown next to it in the tree/sidebar.</td>
          </tr>
          <tr>
            <td><code>icon_opened</code></td>
            <td><code>string</code></td>
            <td>Icon shown when the folder is expanded.</td>
          </tr>
          <tr>
            <td><code>icon_closed</code></td>
            <td><code>string</code></td>
            <td>Icon shown when the folder is collapsed.</td>
          </tr>
          <tr>
            <td><code>enable_pdf_schema_shortnames</code></td>
            <td><code>string[]</code></td>
            <td>For entries using one of these schemas, the UI shows a "download as PDF" icon.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ PROPS: CONTENT POLICY ═══ -->
  <div class="feature-section">
    <h2>5. Props — what may live here (server-enforced)</h2>
    <p>
      These four are not just UI hints — the <strong>backend</strong> enforces
      them whenever a child is created, updated, or moved into the folder. An
      empty (or absent) array means "no restriction". See §9 for the enforcement
      details.
    </p>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>Property</th><th>Type</th><th>What it restricts</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>content_resource_types</code></td>
            <td><code>string[]</code> (enum)</td>
            <td>A child's <code>resource_type</code> must be one of these. Values are drawn from the full resource-type enum (<code>content</code>, <code>ticket</code>, <code>folder</code>, <code>media</code>, …).</td>
          </tr>
          <tr>
            <td><code>content_schema_shortnames</code></td>
            <td><code>string[]</code></td>
            <td>A child that declares a <code>payload.schema_shortname</code> must use one of these. Also drives which form the UI loads (see §8).</td>
          </tr>
          <tr>
            <td><code>workflow_shortnames</code></td>
            <td><code>string[]</code></td>
            <td>A <code>ticket</code> created here that declares a <code>workflow_shortname</code> must use one of these.</td>
          </tr>
          <tr>
            <td><code>unique_fields</code></td>
            <td><code>string[][]</code></td>
            <td>A list of composite uniqueness constraints. Each inner list is a set of fields that together must be unique across all entries in the folder — e.g. <code>[["email"], ["first_name","last_name"]]</code>.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ PROPS: ACTION TOGGLES ═══ -->
  <div class="feature-section">
    <h2>6. Props — action toggles</h2>
    <p>
      Booleans that show or hide the corresponding buttons/affordances in the
      admin UI for this folder. They shape what an operator <em>can do</em> from
      the listing.
    </p>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>Property</th><th>Default</th><th>Effect</th></tr>
        </thead>
        <tbody>
          <tr><td><code>allow_view</code></td><td><code>true</code></td><td>Allow opening/viewing a resource inside the folder.</td></tr>
          <tr><td><code>allow_create</code></td><td><code>true</code></td><td>Show the "create resource" button (gates the create form).</td></tr>
          <tr><td><code>allow_create_category</code></td><td><code>false</code></td><td>Allow creating a <em>sub-folder</em> (a "category") inside this folder.</td></tr>
          <tr><td><code>allow_update</code></td><td><code>true</code></td><td>Allow editing existing resources.</td></tr>
          <tr><td><code>allow_delete</code></td><td><code>false</code></td><td>Allow deleting resources.</td></tr>
          <tr><td><code>allow_csv</code></td><td><code>false</code></td><td>Show the CSV <strong>download</strong> button (export the displayed list).</td></tr>
          <tr><td><code>allow_upload_csv</code></td><td><code>false</code></td><td>Show the CSV <strong>upload</strong> feature (batch-create from a CSV).</td></tr>
          <tr><td><code>use_media</code></td><td><code>false</code></td><td>Declares that entries here carry a media attachment (surfaces media affordances).</td></tr>
        </tbody>
      </table>
    </div>
    <p class="code-note">
      These are UI gates for a smooth operator experience — they are <em>not</em>
      a security boundary. Real authorization is always enforced by
      <a href="/access-control">RBAC + ACLs</a> on the server regardless of what a
      folder's toggles say.
    </p>
  </div>

  <!-- ═══ PROPS: QUERY / SORT / FILTER ═══ -->
  <div class="feature-section">
    <h2>7. Props — query, sort, filter &amp; behavior</h2>
    <p>
      These decide <em>which</em> entries the listing loads, in what order, and
      how it behaves — including the powerful ability to back a folder by a
      search instead of by its own subpath.
    </p>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>Property</th><th>Type</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>query</code></td>
            <td><code>&#123;type, search, filter_types&#125;</code></td>
            <td><code>type</code> is <code>"subpath"</code> (list the folder's own contents) or <code>"search"</code> (list the results of a saved search query instead). <code>search</code> is the <a href="/query-search">query string</a>; <code>filter_types</code> narrows resource types.</td>
          </tr>
          <tr>
            <td><code>append_subpath</code></td>
            <td><code>string</code></td>
            <td>A string appended to the query subpath — lets a folder point its listing at a nested path below itself.</td>
          </tr>
          <tr>
            <td><code>sort_by</code></td>
            <td><code>string</code></td>
            <td>The field name used to order the listing (e.g. <code>created_at</code>, <code>shortname</code>).</td>
          </tr>
          <tr>
            <td><code>sort_type</code></td>
            <td><code>"ascending" | "descending"</code></td>
            <td>The direction of the sort.</td>
          </tr>
          <tr>
            <td><code>filter</code></td>
            <td><code>object[]</code></td>
            <td>Additional filter options offered above the listing.</td>
          </tr>
          <tr>
            <td><code>disable_filter</code></td>
            <td><code>boolean</code></td>
            <td>Hides the search/filter icon entirely for this folder.</td>
          </tr>
          <tr>
            <td><code>expand_children</code></td>
            <td><code>boolean</code></td>
            <td>Whether the folder auto-expands its children in the tree.</td>
          </tr>
          <tr>
            <td><code>stream</code></td>
            <td><code>boolean</code></td>
            <td>Enables a folder-level <strong>websocket watch</strong> — the listing updates live as entries change.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ INDEX_ATTRIBUTES DEEP DIVE ═══ -->
  <div class="feature-section">
    <h2>8. <code>index_attributes</code> in depth</h2>
    <p>
      This is the one required property and the heart of folder rendering. It is
      an ordered array of column descriptors, each a two-field object:
    </p>

    <div class="code-container">
      <pre><code>{`"index_attributes": [
  { "key": "shortname",        "name": "API Name"  },   // column 1
  { "key": "subpath",          "name": "Sub path"  },   // column 2
  { "key": "end_point",        "name": "End point" },   // column 3  (a payload.body field)
  { "key": "verb",             "name": "Verb"      }    // column 4  (a payload.body field)
]`}</code></pre>
    </div>

    <div class="grid-list">
      <div class="item">
        <strong>key</strong>
        <span>Which value to read from each entry. It can be a Meta field (<code>shortname</code>, <code>created_at</code>, <code>owner_shortname</code>) or a field inside the entry's <code>payload.body</code> (<code>end_point</code>, <code>verb</code>).</span>
      </div>
      <div class="item">
        <strong>name</strong>
        <span>The human-friendly column header rendered in the table. Purely presentational.</span>
      </div>
    </div>

    <h3>Fallback columns</h3>
    <p>
      If a folder somehow has no usable index attributes, the admin UI falls back
      to a sensible default set so the listing is never blank:
    </p>
    <div class="code-container">
      <pre><code>{`[
  { "key": "status",     "name": "Status" },
  { "key": "created_at", "name": "Created At" },
  { "key": "updated_at", "name": "Updated At" },
  { "key": "author",     "name": "Author" }
]`}</code></pre>
    </div>

    <h3>Editing columns live</h3>
    <p>
      Operators don't hand-edit JSON. The admin UI exposes a
      <strong>column-settings modal</strong> that adds, removes and reorders
      <code>index_attributes</code> visually, then writes them back into
      <code>payload.body.index_attributes</code> via a folder <code>update</code>
      request. The folder config is data you edit through the same CRUD API as
      everything else.
    </p>
  </div>

  <!-- ═══ HOW THE UI RENDERS A FOLDER ═══ -->
  <div class="feature-section">
    <h2>9. How the admin UI renders a folder</h2>
    <p>
      Putting the props together, here is the exact pipeline the admin SPA (CXB /
      Catalog) runs when you open a folder:
    </p>

    <div class="diagram-container">
      <pre class="mermaid">
sequenceDiagram
    participant UI as Admin UI
    participant API as DMART API
    UI->>API: GET folder entry (meta + payload.body)
    API-->>UI: folder_rendering config
    UI->>UI: applyFolderContentDefaults() fills missing props
    UI->>UI: build columns from index_attributes (or fallback)
    UI->>API: query (type=subpath/search, sort_by, sort_type, filter_types)
    API-->>UI: page of entries
    UI->>UI: render table — one column per index_attribute
    UI->>UI: toolbar buttons gated by allow_create / allow_csv / allow_upload_csv …
    Note over UI: click "Create" → load form from content_schema_shortnames
      </pre>
    </div>

    <ol>
      <li><strong>Load</strong> the folder entry and read <code>payload.body</code>.</li>
      <li><strong>Default</strong> every missing property (see §10) — crucially with <code>??</code>, so an explicit <code>false</code> from the server is preserved, not overwritten by a truthy default.</li>
      <li><strong>Columns</strong> from <code>index_attributes</code>, or the fallback set.</li>
      <li><strong>Fetch</strong> entries: <code>query.type</code> decides subpath-listing vs search; <code>sort_by</code>/<code>sort_type</code> order them (default <code>created_at</code> / <code>descending</code>).</li>
      <li><strong>Toolbar</strong>: the create button appears only if <code>allow_create</code>; CSV download only if <code>allow_csv</code>; CSV upload only if <code>allow_upload_csv</code>; and so on.</li>
      <li><strong>Create form</strong>: driven by <code>content_schema_shortnames</code> — <em>zero</em> schemas → a free-form entry; <em>one</em> → that schema's form is auto-loaded and rendered; <em>many</em> → the user picks which schema first.</li>
    </ol>
  </div>

  <!-- ═══ SERVER ENFORCEMENT ═══ -->
  <div class="feature-section">
    <h2>10. Content policy is enforced on the server</h2>
    <p>
      The three content arrays plus uniqueness are not merely UI conveniences.
      On every create / update / move, the backend reads the <em>parent
      folder's</em> config and validates the child against it:
    </p>
    <ul>
      <li><code>content_resource_types</code> — the child's resource type must be allowed.</li>
      <li><code>content_schema_shortnames</code> — a schema-declaring child must use an allowed schema.</li>
      <li><code>workflow_shortnames</code> — a ticket's workflow must be allowed.</li>
    </ul>
    <p>Semantics that matter in practice:</p>
    <div class="grid-list">
      <div class="item">
        <strong>Empty = open</strong>
        <span>An empty or absent array imposes no restriction. Restrictions are opt-in.</span>
      </div>
      <div class="item">
        <strong>Fails open</strong>
        <span>If the parent folder can't be read, enforcement is skipped rather than blocking the write.</span>
      </div>
      <div class="item">
        <strong>Toggleable</strong>
        <span>Global enforcement is controlled by <code>ENFORCE_FOLDER_CONTENT_POLICY</code> (default <code>true</code>).</span>
      </div>
    </div>
  </div>

  <!-- ═══ DEFAULTS ═══ -->
  <div class="feature-section">
    <h2>11. Default values</h2>
    <p>
      When a property is absent, the admin UI applies these defaults (using
      <code>??</code> so a real <code>false</code>/empty value is never clobbered):
    </p>
    <div class="table-container">
      <table>
        <thead>
          <tr><th>Group</th><th>Default</th></tr>
        </thead>
        <tbody>
          <tr><td><code>allow_view</code>, <code>allow_create</code>, <code>allow_update</code></td><td><code>true</code></td></tr>
          <tr><td><code>allow_delete</code>, <code>allow_create_category</code>, <code>allow_csv</code>, <code>allow_upload_csv</code>, <code>use_media</code>, <code>stream</code>, <code>expand_children</code>, <code>disable_filter</code></td><td><code>false</code></td></tr>
          <tr><td><code>index_attributes</code>, <code>content_schema_shortnames</code>, <code>content_resource_types</code>, <code>*_columns</code>, <code>workflow_shortnames</code></td><td><code>[]</code></td></tr>
          <tr><td><code>query</code></td><td><code>&#123; type: "", search: "", filter_types: [] &#125;</code></td></tr>
          <tr><td><code>icon</code>, <code>icon_opened</code>, <code>icon_closed</code>, <code>shortname_title</code></td><td><code>""</code></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ WORKED EXAMPLES ═══ -->
  <div class="feature-section">
    <h2>12. Worked examples (real seed folders)</h2>

    <div class="step-section">
      <h3>a. Minimal, read-only listing — <code>management/permissions</code></h3>
      <p class="code-note">One column, everything locked down. A pure browse view.</p>
      <div class="code-container">
        <pre><code>{`{
  "shortname_title": "Permission Shortname",
  "content_schema_shortnames": [],
  "index_attributes": [
    { "key": "shortname", "name": "Permission Shortname" }
  ],
  "allow_create": false,
  "allow_update": false,
  "allow_delete": false,
  "use_media": false,
  "filter": [],
  "allow_view": true
}`}</code></pre>
      </div>
    </div>

    <div class="step-section">
      <h3>b. Rich, editable listing — <code>applications/api</code></h3>
      <p class="code-note">
        Four columns (two of them payload fields), full CRUD, CSV export,
        auto-expanding tree, constrained to one schema and the <code>content</code> type.
      </p>
      <div class="code-container">
        <pre><code>{`{
  "shortname_title": "API Name",
  "content_schema_shortnames": ["api"],
  "content_resource_types": ["content"],
  "index_attributes": [
    { "key": "shortname",  "name": "name" },
    { "key": "subpath",    "name": "Sub path" },
    { "key": "end_point",  "name": "End point" },
    { "key": "verb",       "name": "Verb" }
  ],
  "expand_children": true,
  "allow_create": true,
  "allow_update": true,
  "allow_delete": true,
  "allow_csv": true,
  "use_media": false,
  "allow_view": true
}`}</code></pre>
      </div>
    </div>

    <div class="step-section">
      <h3>c. Distinct search view — <code>management/notifications</code></h3>
      <p class="code-note">
        Two schemas allowed, and a bespoke <code>search_columns</code> set that
        differs from the index columns.
      </p>
      <div class="code-container">
        <pre><code>{`{
  "shortname_title": "ID",
  "content_schema_shortnames": ["system_notification_request", "admin_notification_request"],
  "content_resource_types": ["content"],
  "index_attributes": [
    { "key": "shortname",  "name": "Shortname" },
    { "key": "on_subpath", "name": "On Subpath" },
    { "key": "on_action",  "name": "On Action" },
    { "key": "on_state",   "name": "On State" },
    { "key": "priority",   "name": "Priority" }
  ],
  "search_columns": [
    { "key": "shortname",  "name": "username" },
    { "key": "on_subpath", "name": "On Subpath" }
  ],
  "allow_create": true,
  "allow_update": true,
  "allow_delete": true,
  "allow_view": false
}`}</code></pre>
      </div>
    </div>

    <div class="step-section">
      <h3>d. Query-backed folder — <code>management/health_check</code></h3>
      <p class="code-note">
        Instead of listing its own subpath, this folder lists the results of a
        <code>search</code> query, sorted by creation time.
      </p>
      <div class="code-container">
        <pre><code>{`{
  "index_attributes": [ { "key": "shortname", "name": "name" } ],
  "sort_by": "created_at",
  "sort_type": "ascending",
  "query": { "type": "search", "search": "" },
  "content_schema_shortnames": [],
  "content_resource_types": [],
  "workflow_shortnames": [],
  "enable_pdf_schema_shortnames": [],
  "allow_create": false,
  "allow_view": false
}`}</code></pre>
      </div>
    </div>
  </div>

  <!-- ═══ VALIDATION & THE FIXER ═══ -->
  <div class="feature-section">
    <h2>13. Validation, strictness &amp; the auto-fixer</h2>
    <p>
      Because the schema is exact, a folder body is rejected at write time (and
      at seed/startup) if it contains an unknown field or misses
      <code>index_attributes</code>. To repair legacy folders that predate the
      tightened schema, DMART ships a CLI:
    </p>
    <div class="code-container">
      <pre><code>{`dmart fix-folder-rendering [space] [--apply]`}</code></pre>
    </div>
    <ul>
      <li><strong>Strips</strong> fields that aren't in the canonical schema (kills typos and dead props).</li>
      <li><strong>Fills</strong> a required-but-missing <code>index_attributes</code> with <code>[]</code>.</li>
      <li><strong>Widens</strong> non-empty content-policy arrays so they still cover the folder's existing children (won't retroactively orphan data).</li>
      <li><strong>Reports</strong> invalid <code>content_resource_types</code> enum values without silently deleting them.</li>
    </ul>
    <p class="code-note">
      Run it without <code>--apply</code> for a dry-run report; add
      <code>--apply</code> to write the fixes. See the
      <a href="/cli">CLI reference</a>.
    </p>
  </div>
</div>

<style>
</style>
