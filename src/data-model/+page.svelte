<script lang="ts">
  import { useMermaid } from "../lib/mermaid";
</script>

<div class="content" use:useMermaid>
  <h1>Data Model</h1>
  <p class="intro">
    Everything in DMART is an <strong>Entry</strong> — a single, uniformly
    addressed unit of information. There are no bespoke tables per feature, no
    separate "users API" versus "documents API": a user, a folder, a blog post,
    a support ticket, an uploaded PDF and a system log are all the same shape of
    object, distinguished only by a <code>resource_type</code>. Understand the
    Entry and its address, and you understand the whole platform.
  </p>

  <!-- ═══ THE LOCATOR ═══ -->
  <div class="feature-section">
    <h2>1. The Locator — how everything is addressed</h2>
    <p>
      Every entry is uniquely identified by a <strong>four-tuple</strong> called
      the <em>Locator</em>. Think of it as the full postal address of a piece of
      data. If you know these four values, you can read, update, or delete the
      entry — no numeric primary key required.
    </p>

    <div class="code-container">
      <pre><code>{`Locator = ( resource_type , space_name , subpath , shortname )
              │             │           │          │
              │             │           │          └ "article_42"   name, unique in the folder
              │             │           └─────────── "/blog/2026"   folder path in the space
              │             └─────────────────────── "myblog"       the space (tenant)
              └───────────────────────────────────── "content"      what kind of entry it is`}</code></pre>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>Part</th><th>Analogy</th><th>Rules</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>resource_type</code></td>
            <td>File type / class</td>
            <td>One of the 30 resource types (see §6). Discriminates the entry's shape and which table/validation applies.</td>
          </tr>
          <tr>
            <td><code>space_name</code></td>
            <td>Drive / tenant</td>
            <td>Top-level container. Every entry belongs to exactly one space.</td>
          </tr>
          <tr>
            <td><code>subpath</code></td>
            <td>Folder path</td>
            <td>Hierarchical, slash-separated (e.g. <code>/users/employees</code>). Stored with a leading slash internally; the leading slash is stripped on the wire.</td>
          </tr>
          <tr>
            <td><code>shortname</code></td>
            <td>Filename</td>
            <td>Unique within <code>(space, subpath)</code>. Allowed characters: <code>a–z A–Z 0–9 _</code> plus Arabic letters and Arabic-Indic digits, 1–64 chars.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="highlight">
      The Locator is a first-class object, not just a convention. Two entries can
      share a shortname as long as any other part of the tuple differs.
    </div>
  </div>

  <!-- ═══ SPACES & SUBPATHS ═══ -->
  <div class="feature-section">
    <h2>2. Spaces &amp; Subpaths</h2>

    <div class="diagram-container">
      <pre class="mermaid">
graph TD
    Root["DMART instance"] --> S1["Space: management"]
    Root --> S2["Space: applications"]
    Root --> S3["Space: myblog (yours)"]
    S3 --> P1["subpath: /"]
    S3 --> P2["subpath: /blog"]
    P2 --> P3["subpath: /blog/2026"]
    P3 --> E1["entry: article_42 (content)"]
    P3 --> E2["entry: article_43 (content)"]
    P2 --> F1["entry: 2026 (folder)"]
      </pre>
    </div>

    <h3>Space — the tenant boundary</h3>
    <p>
      A <strong>Space</strong> is the top-level organizational unit and the unit
      of isolation. It is itself an entry (<code>resource_type=space</code>) and
      carries configuration: which languages it supports, which plugins are
      active, whether indexing is enabled, whether it is hidden, its display
      ordinal, and which subfolders to hide.
    </p>
    <div class="grid-list">
      <div class="item">
        <strong>management</strong>
        <span>Always present. Holds users, groups, roles, permissions and the meta-schemas. Bootstrapped on first run.</span>
      </div>
      <div class="item">
        <strong>applications</strong>
        <span>Built-in catalog of app definitions, saved queries, configurations and translations.</span>
      </div>
      <div class="item">
        <strong>personal</strong>
        <span>Per-user private space for user-owned content.</span>
      </div>
      <div class="item">
        <strong>your spaces</strong>
        <span>Any number of custom spaces you create for your own domains.</span>
      </div>
    </div>

    <h3>Subpath — the folder hierarchy</h3>
    <p>
      A <strong>Subpath</strong> is a slash-separated path inside a space, exactly
      like a directory path in a filesystem. <code>/</code> is the root of the
      space. Subpaths are normalized (leading/trailing slashes handled
      consistently) so <code>blog/2026</code>, <code>/blog/2026</code> and
      <code>/blog/2026/</code> all resolve to the same folder.
    </p>
    <p>
      A subpath only "exists" as a browsable, configurable thing when a
      <strong>folder entry</strong> represents it. That folder is what carries
      display and behavior configuration for its contents — covered in depth on
      the <a href="/folders">Folders &amp; Rendering</a> page.
    </p>
  </div>

  <!-- ═══ ENTRY: FOUR LAYERS ═══ -->
  <div class="feature-section">
    <h2>3. The Entry — four layers</h2>
    <p>
      Every entry is composed of up to four layers. Only <strong>Meta</strong> is
      mandatory; the rest are optional and added as needed.
    </p>

    <div class="diagram-container">
      <pre class="mermaid">
graph LR
    Entry["Entry"] --> Meta["① Meta<br/>identity, ownership,<br/>timestamps, tags"]
    Entry --> Payload["② Payload<br/>JSON body (schema-validated)<br/>or file reference"]
    Entry --> Att["③ Attachments<br/>comments, media, reactions,<br/>relationships, locks, shares"]
    Entry --> Hist["④ History<br/>immutable diff<br/>of every change"]
      </pre>
    </div>

    <div class="grid-list">
      <div class="item">
        <strong>① Meta</strong>
        <span>System-level identity: uuid, shortname, ownership, ACLs, tags, display names, timestamps. Always present.</span>
      </div>
      <div class="item">
        <strong>② Payload</strong>
        <span>The actual content — a JSON object validated against a schema, or a pointer to an attached file. Optional.</span>
      </div>
      <div class="item">
        <strong>③ Attachments</strong>
        <span>Secondary entries bound to this one: comments, media, reactions, relationships, locks. Optional, unbounded.</span>
      </div>
      <div class="item">
        <strong>④ History</strong>
        <span>Append-only diff log. Every create/update/delete writes a row; the entry points at the latest one.</span>
      </div>
    </div>
  </div>

  <!-- ═══ META FIELDS ═══ -->
  <div class="feature-section">
    <h2>4. Meta — the fields every entry shares</h2>
    <p>
      Regardless of resource type, every entry inherits this common set of
      fields (the <code>Meta</code> base). Type-specific fields are layered on
      top (see §5).
    </p>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td><code>shortname</code></td><td>string</td><td>Identifier, unique within <code>(space, subpath)</code>.</td></tr>
          <tr><td><code>uuid</code></td><td>UUID</td><td>Permanent primary key. Never changes, even on rename or move.</td></tr>
          <tr><td><code>is_active</code></td><td>bool</td><td>Soft-active flag. The <code>is_active</code> permission condition checks it.</td></tr>
          <tr><td><code>slug</code></td><td>string</td><td>Optional URL-friendly alias.</td></tr>
          <tr><td><code>displayname</code></td><td>Translation</td><td>Per-language labels, e.g. <code>&#123; "en": "Articles", "ar": "مقالات" &#125;</code>.</td></tr>
          <tr><td><code>description</code></td><td>Translation</td><td>Per-language descriptions.</td></tr>
          <tr><td><code>tags</code></td><td>string[]</td><td>Free-form labels. Queryable with <code>@tags:foo</code>.</td></tr>
          <tr><td><code>owner_shortname</code></td><td>string</td><td>The user who owns the entry.</td></tr>
          <tr><td><code>owner_group_shortname</code></td><td>string</td><td>Owning group. Used by the <code>own</code> permission condition.</td></tr>
          <tr><td><code>created_at</code></td><td>timestamp</td><td>Set on insert.</td></tr>
          <tr><td><code>updated_at</code></td><td>timestamp</td><td>Refreshed on every write.</td></tr>
          <tr><td><code>payload</code></td><td>Payload</td><td>Content type, schema reference, and body (see §5).</td></tr>
          <tr><td><code>acl</code></td><td>Acl[]</td><td>Per-entry access-control overrides: <code>&#123;user_shortname, allowed_actions&#125;</code>.</td></tr>
          <tr><td><code>relationships</code></td><td>Relationship[]</td><td>Typed links to other entries.</td></tr>
          <tr><td><code>last_checksum_history</code></td><td>string</td><td>Pointer to the latest row in the history log.</td></tr>
          <tr><td><code>query_policies</code></td><td>string[]</td><td>Precomputed ACL policy strings for fast read-time filtering.</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ PAYLOAD & TYPE-SPECIFIC ═══ -->
  <div class="feature-section">
    <h2>5. Payload &amp; type-specific fields</h2>
    <p>
      The <strong>Payload</strong> is where an entry's real content lives. It is
      one of two things:
    </p>
    <ul>
      <li>
        <strong>Inline JSON</strong> — a structured object. If
        <code>schema_shortname</code> is set, the body is validated against that
        JSON Schema on every write.
      </li>
      <li>
        <strong>A file reference</strong> — <code>body</code> holds a filename
        and the bytes are fetched separately (images, PDFs, CSV, Parquet, …).
      </li>
    </ul>

    <div class="code-container">
      <pre><code>{`"payload": {
  "content_type": "json",          // json | markdown | html | image | pdf | csv | parquet | ...
  "schema_shortname": "article",   // optional — enables JSON-Schema validation
  "body": {                        // inline object, OR a filename string for file payloads
    "title": "Hello World",
    "body":  "First post."
  }
}`}</code></pre>
    </div>

    <h3>Type-specific extensions</h3>
    <p>Selected resource types add their own fields on top of Meta:</p>
    <div class="table-container">
      <table>
        <thead>
          <tr><th>Type</th><th>Adds</th></tr>
        </thead>
        <tbody>
          <tr><td><code>user</code></td><td><code>password</code> (hashed, never serialized), <code>roles</code>, <code>groups</code>, <code>email</code>, <code>msisdn</code>, OAuth ids, <code>locked_to_device</code>, verification &amp; login state.</td></tr>
          <tr><td><code>role</code></td><td><code>permissions</code> — list of permission shortnames.</td></tr>
          <tr><td><code>permission</code></td><td><code>subpaths</code>, <code>resource_types</code>, <code>actions</code>, <code>conditions</code>, <code>restricted_fields</code>, <code>allowed_fields_values</code>.</td></tr>
          <tr><td><code>ticket</code></td><td><code>state</code>, <code>is_open</code>, <code>workflow_shortname</code>, <code>reporter</code>, <code>collaborators</code>, <code>resolution_reason</code>.</td></tr>
          <tr><td><code>space</code></td><td><code>languages</code>, <code>active_plugins</code>, <code>indexing_enabled</code>, <code>hide_folders</code>, <code>hide_space</code>, <code>ordinal</code>, <code>icon</code>, <code>mirrors</code>.</td></tr>
          <tr><td><code>folder</code></td><td>A payload validated against the <code>folder_rendering</code> schema — how its contents are displayed. See <a href="/folders">Folders &amp; Rendering</a>.</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ RESOURCE TYPES ═══ -->
  <div class="feature-section">
    <h2>6. Resource-type catalog</h2>
    <p>
      There are 30 resource types. They all share the Meta base; the type only
      changes which extra fields exist, which table stores the entry, and which
      validation runs.
    </p>

    <div class="grid-list types">
      <div class="item">
        <strong>Identity</strong>
        <span><code>user</code>, <code>group</code></span>
      </div>
      <div class="item">
        <strong>Structure</strong>
        <span><code>folder</code>, <code>space</code></span>
      </div>
      <div class="item">
        <strong>Content</strong>
        <span><code>content</code>, <code>schema</code>, <code>data_asset</code>, <code>csv</code>, <code>jsonl</code>, <code>sqlite</code>, <code>parquet</code></span>
      </div>
      <div class="item">
        <strong>Workflow</strong>
        <span><code>ticket</code></span>
      </div>
      <div class="item">
        <strong>Social</strong>
        <span><code>comment</code>, <code>reply</code>, <code>post</code>, <code>reaction</code>, <code>notification</code>, <code>share</code></span>
      </div>
      <div class="item">
        <strong>Attachments</strong>
        <span><code>media</code>, <code>log</code>, <code>relationship</code>, <code>alteration</code>, <code>history</code>, <code>lock</code></span>
      </div>
      <div class="item">
        <strong>Management</strong>
        <span><code>role</code>, <code>permission</code>, <code>acl</code></span>
      </div>
      <div class="item">
        <strong>Extensions</strong>
        <span><code>locator</code>, <code>json</code>, <code>plugin_wrapper</code></span>
      </div>
    </div>
    <p class="code-note">
      On the wire, resource types are lowercase snake_case strings
      (<code>plugin_wrapper</code>, <code>data_asset</code>).
    </p>
  </div>

  <!-- ═══ ATTACHMENTS ═══ -->
  <div class="feature-section">
    <h2>7. Attachments — sub-entries bound to a parent</h2>
    <p>
      Attachments are themselves entries, stored in a dedicated table, that point
      back at a parent entry. They keep related information physically together
      without polluting the parent's payload.
    </p>
    <div class="table-container">
      <table>
        <thead>
          <tr><th>Attachment</th><th>What it is</th></tr>
        </thead>
        <tbody>
          <tr><td><code>media</code></td><td>An uploaded file (image, PDF, video, document) bound to the entry.</td></tr>
          <tr><td><code>comment</code> / <code>reply</code></td><td>Threaded discussion on the entry.</td></tr>
          <tr><td><code>reaction</code></td><td>An emoji / like reaction.</td></tr>
          <tr><td><code>relationship</code></td><td>A typed link to another entry (see also the Meta <code>relationships</code> field).</td></tr>
          <tr><td><code>lock</code></td><td>An advisory/enforced lock preventing concurrent edits (see Entity Lifecycle).</td></tr>
          <tr><td><code>share</code></td><td>A share grant exposing the entry to another party.</td></tr>
          <tr><td><code>alteration</code></td><td>A proposed/tracked change record.</td></tr>
        </tbody>
      </table>
    </div>
    <p>
      Every attachment carries an <code>author_locator</code> (who created it),
      optional <code>media</code> bytes, a text <code>body</code>, and a
      <code>state</code>.
    </p>
  </div>

  <!-- ═══ HISTORY ═══ -->
  <div class="feature-section">
    <h2>8. History &amp; alterations</h2>
    <p>
      DMART never silently overwrites. Every create, update, and delete writes a
      diff to the history log alongside the request headers that caused it. The
      entry's <code>last_checksum_history</code> field chains to the most recent
      entry, forming an auditable, tamper-evident trail.
    </p>
    <ul>
      <li>Query an entry's history via the <code>history</code> query type.</li>
      <li>The diff captures exactly which fields changed, from what to what.</li>
      <li>Because history is append-only, you get a complete audit log for free.</li>
    </ul>
  </div>

  <!-- ═══ ON-DISK LAYOUT ═══ -->
  <div class="feature-section">
    <h2>9. On-disk layout (the <code>.dm</code> convention)</h2>
    <p>
      DMART's live data lives in PostgreSQL, but it can be exported to — and
      seeded from — a human-readable folder tree, and the sample/fixture data
      ships as that tree. This <code>.dm</code> layout is the export, seed and
      backup representation of the model, not a runtime store. Understanding it
      demystifies the whole model, because the directory structure <em>is</em>
      the data model made visible.
    </p>

    <div class="code-container tree">
      <pre><code>{`spaces/
└── myblog/                              ← a Space
    ├── .dm/
    │   └── meta.space.json              ← space meta (languages, plugins, ordinal…)
    │
    ├── blog.json                        ← the FOLDER BODY for /blog  (rendering config)
    ├── blog/                            ← the /blog subpath
    │   ├── .dm/
    │   │   └── meta.folder.json         ← folder meta (points at ../blog.json as its body)
    │   │
    │   ├── article_42.json              ← a content entry's payload body
    │   └── .dm/
    │       └── article_42/
    │           ├── meta.content.json    ← the entry's meta
    │           └── attachments.comment/ ← attachments live beside the entry
    │
    └── schema/
        └── article.json                 ← a JSON Schema, referenced by payload.schema_shortname`}</code></pre>
    </div>

    <p class="code-note">
      Key idea: a folder's <strong>meta</strong> lives at
      <code>&lt;subpath&gt;/.dm/meta.folder.json</code>, while its
      <strong>body</strong> (the rendering config) is a sibling file named
      <code>&lt;shortname&gt;.json</code> in the parent directory. This split is
      exactly what the <a href="/folders">Folders &amp; Rendering</a> page dissects.
    </p>

    <div class="table-container">
      <table>
        <thead>
          <tr><th>File</th><th>Holds</th></tr>
        </thead>
        <tbody>
          <tr><td><code>.dm/meta.space.json</code></td><td>Space metadata.</td></tr>
          <tr><td><code>&lt;subpath&gt;/.dm/meta.folder.json</code></td><td>Folder metadata for that subpath.</td></tr>
          <tr><td><code>&lt;subpath&gt;/.dm/&lt;name&gt;/meta.&lt;type&gt;.json</code></td><td>An entry's meta.</td></tr>
          <tr><td><code>&lt;subpath&gt;/&lt;name&gt;.json</code></td><td>An entry's (or folder's) JSON payload body.</td></tr>
          <tr><td><code>schema/&lt;name&gt;.json</code></td><td>A JSON Schema definition.</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ═══ STORAGE ═══ -->
  <div class="feature-section">
    <h2>10. One source of truth, always exportable</h2>
    <p>
      DMART keeps a single, authoritative store — and guarantees you can always
      get your data back out as plain files. Those are two different things, not
      two competing storage modes.
    </p>
    <div class="grid-list">
      <div class="item">
        <strong>PostgreSQL — the sole source of truth</strong>
        <span>Every live read and write goes to PostgreSQL (via Npgsql). Narrow per-type tables (<code>users</code>, <code>roles</code>, <code>permissions</code>, <code>spaces</code>) plus a generic <code>entries</code> table, with <code>attachments</code> and <code>histories</code> alongside. ACID, relational integrity, and trigram (<code>pg_trgm</code> + GIN jsonb) full-text search — plus optional pgvector semantic search. There is no filesystem runtime store and no Redis; in-process caches only.</span>
      </div>
      <div class="item">
        <strong>The <code>.dm</code> tree — the export &amp; backup format</strong>
        <span>The human-readable folder tree shown above is how a space is <em>exported, seeded and backed up</em>, not how it is served. <code>dmart export</code> writes a space to a zip in this on-disk layout; <code>import</code> and <code>seed</code> read it back. Human-readable, diff-friendly, and trivially archived with <code>git</code> or <code>tar</code>.</span>
      </div>
    </div>
    <p>
      The wire format is the same in both directions: clients always send and
      receive the same <code>Record</code> envelope, whether it is being persisted
      to PostgreSQL or round-tripped through a <code>.dm</code> archive. This is
      what lets DMART promise <strong>data longevity with zero vendor lock-in</strong>:
      your data is standard PostgreSQL <em>and</em> can be exported to plain JSON
      files on disk at any time.
    </p>
  </div>
</div>

<style>
  .grid-list.types {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .item span code {
    font-size: 0.8em;
  }
</style>
