<script lang="ts">
  import { useMermaid } from "../lib/mermaid";
</script>

<div class="content" use:useMermaid>
  <h1>Technical Overview</h1>

  <div class="feature-section">
    <h2>1. Introduction</h2>
    <p>
      DMART (Data Mart) is a Data-as-a-Service (DaaS) platform designed to act
      as a streamlined, low-code information inventory system. It treats data
      assets as commodities, allowing for structured, unstructured, and binary
      data management. Optimized for small to medium data footprints (&lt;=300
      million primary entries), it uses a SQL database for data longevity and
      ACID compliance.
    </p>
  </div>

  <div class="feature-section">
    <h2>2. Architecture</h2>
    <p>
      DMART follows a microservices-friendly architecture with clear separation
      between the API layer, data processing, and storage.
    </p>

    <div class="diagram-container">
      <pre class="mermaid">
graph TD
    User["User / Client"] -->|"HTTP/REST"| LB["Load Balancer / Reverse Proxy"]
    LB -->|HTTP| API["ASP.NET Core (Kestrel)"]

    subgraph "Backend (AOT binary)"
        API -->|RW| SQL["PostgreSQL (Npgsql)"]
        API -->|"MCP /mcp"| MCP["MCP Server"]
    end

    subgraph "Embedded Frontend"
        CXB["CXB (/cxb)"] -->|"API Calls"| API
        CAT["Catalog (/cat)"] -->|"API Calls"| API
    end

    SQL -->|"Export (zip)"| Backup["Backup / Import-Export"]
      </pre>
    </div>

    <h3>Backend Stack</h3>
    <ul>
      <li>
        <strong>Language &amp; Runtime:</strong> C# on .NET 10, compiled ahead of
        time with <strong>Native AOT</strong> into a single self-contained
        binary (~50&nbsp;MB; 46&nbsp;MB arm64, 53&nbsp;MB x64) — no runtime install
          required. JSON is
        source-generated (System.Text.Json), and the same binary bundles both
        the server and the CLI client.
      </li>
      <li>
        <strong>Web Framework:</strong> ASP.NET Core Minimal APIs on the
        <strong>Kestrel</strong> HTTP server, built with the slim/AOT host
        (<code>WebApplication.CreateSlimBuilder</code>). Endpoints are
        route groups (<code>MapGroup</code>), not MVC controllers. Swagger/OpenAPI
        is served at <code>/docs</code>.
      </li>
      <li>
        <strong>Data Persistence:</strong>
        <strong>PostgreSQL</strong> (via Npgsql) is the single source of truth
        for all runtime data — ACID compliant with relational integrity. There
        is no Redis and no filesystem runtime store; caches are in-process only.
      </li>
      <li>
        <strong>Authentication:</strong> JWT Bearer (HS256, Argon2-hashed
        passwords), plus a full OAuth 2.1 Authorization Server with Google,
        Facebook, and Apple sign-in.
      </li>
      <li>
        <strong>Interoperability:</strong> Built-in MCP server at
        <code>/mcp</code> (Streamable HTTP) and WebSocket endpoints for realtime
        updates.
      </li>
    </ul>

    <h3>Frontend Stack</h3>
    <p>
      DMART ships two <strong>Svelte 5 + Vite</strong> admin SPAs that are
      <strong>embedded directly into the .NET binary</strong> and served by
      ASP.NET middleware — no separate frontend deployment:
    </p>
    <ul>
      <li>
        <strong>CXB (<code>/cxb</code>):</strong> the Customer eXperience Builder
        — the primary administrative interface.
      </li>
      <li>
        <strong>Catalog (<code>/cat</code>):</strong> a user-oriented SPA.
      </li>
      <li>
        <strong>Under the hood:</strong> Svelte 5, @roxi/routify v3, Vite, and
        Svelte stores for state.
      </li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>3. Data Model</h2>
    <p>
      DMART uses an <strong>Entry-oriented</strong> data model rather than a
      document-oriented one. All entities inherit from a base <code>Meta</code> class.
    </p>

    <h3>Resource Hierarchy</h3>
    <ul>
      <li>
        <strong>Space:</strong> Top-level container defining configuration like languages,
        plugins, and visibility.
      </li>
      <li>
        <strong>Subpath:</strong> Logical folder structure within a space (e.g.,
        <code>/content/posts</code>).
      </li>
      <li>
        <strong>Entry:</strong> Atomic unit of information with UUID, Shortname,
        Meta, Payload, and Attachments.
      </li>
    </ul>

    <h3>Key Data Structures</h3>
    <ul>
      <li>
        <strong>Meta:</strong> Base class (uuid, shortname, slug, acl, etc.).
      </li>
      <li><strong>Record:</strong> Flat representation for API I/O.</li>
      <li>
        <strong>Payload:</strong> Content type, schema reference, and body.
      </li>
      <li>
        <strong>Attachment:</strong> Extends Meta for attached resources. Subtypes:
        Media, Comment, Reaction, Relationship.
      </li>
      <li>
        <strong>DataAsset:</strong> Specialized attachments for tabular/binary
        data files — supported content types are <strong>CSV</strong>,
        <strong>JSONL</strong>, <strong>SQLite</strong>, and
        <strong>Parquet</strong>. Here <code>sqlite</code> is only a
        data-asset content type, never the database backend (the backend is
        always PostgreSQL).
      </li>
      <li>
        <strong>Ticket:</strong> Extends Meta for workflow states, reporters, and
        collaborators.
      </li>
    </ul>

    <div class="diagram-container">
      <pre class="mermaid">
classDiagram
    class Resource &#123;
        &lt;&lt;abstract&gt;&gt;
    &#125;
    class Payload &#123;
        +ContentType ContentType
        +string Body
    &#125;
    class Meta &#123;
        +Guid Uuid
        +string Shortname
        +Translation Displayname
        +Payload Payload
    &#125;

    Resource &lt;|-- Payload
    Resource &lt;|-- Meta

    Meta &lt;|-- Space
    Meta &lt;|-- Actor
    Meta &lt;|-- Group
    Meta &lt;|-- Content
    Meta &lt;|-- Schema
    Meta &lt;|-- Attachment
    Meta &lt;|-- Ticket

    Actor &lt;|-- User

    Attachment &lt;|-- DataAsset
    Attachment &lt;|-- Comment

    DataAsset &lt;|-- Csv
    DataAsset &lt;|-- Jsonl
    DataAsset &lt;|-- Sqlite
    DataAsset &lt;|-- Parquet
      </pre>
    </div>
  </div>

  <div class="feature-section">
    <h2>4. Key Features</h2>

    <h3>4.1 Storage &amp; Data Longevity</h3>
    <p>
      Data is stored in normalized PostgreSQL tables, ensuring ACID compliance
      and standard relational integrity. PostgreSQL is the sole runtime store;
      the on-disk <code>spaces/</code> + <code>.dm/</code> layout is used only as
      a portable import/export, seed, and migration format (zip round-trips),
      never as a live data store.
    </p>

    <h3>4.2 Advanced Search &amp; Querying</h3>
    <p>
      The <code>/query</code> endpoint supports a rich query language that is
      compiled to SQL. Search runs on PostgreSQL with trigram indexes
      (<code>pg_trgm</code> + GIN on jsonb), with optional
      <strong>pgvector</strong> semantic search for cosine-similarity matching:
    </p>
    <ul>
      <li>
        <strong>Filtering:</strong> By space, subpath, resource type, schema, and
        specific shortnames.
      </li>
      <li><strong>Full-text Search:</strong> Fuzzy matching on text fields.</li>
      <li>
        <strong>Aggregation:</strong> Grouping and reducing data (counts, sums).
      </li>
      <li>
        <strong>Sorting &amp; Pagination:</strong> <code>limit</code>,
        <code>offset</code>, <code>sort_by</code>.
      </li>
      <li>
        <strong>Specialized Queries:</strong> <code>history</code>,
        <code>events</code>, <code>tags</code>, <code>reports</code>.
      </li>
    </ul>

    <h3>4.3 Access Control (RBAC + ACL)</h3>
    <p>
      Security enforced via a comprehensive <code>AccessControl</code> module:
    </p>
    <ul>
      <li>
        <strong>Permission Scope:</strong> Action type, subpath, resource type, conditions,
        field-level restrictions.
      </li>
      <li>
        <strong>ACLs:</strong> Per-instance access overrides on individual entries.
      </li>
    </ul>

    <h3>4.4 Workflows &amp; Tickets</h3>
    <p>
      Ticketing system with state management and a <code>/progress-ticket</code>
      API for workflow transitions.
    </p>

    <h3>4.5 Data Import/Export</h3>
    <ul>
      <li>
        <strong>ZIP:</strong> Full space export/import preserving folder structure.
      </li>
      <li>
        <strong>CSV Export:</strong> Stream query results as CSV (<code
          >/csv</code
        > endpoint).
      </li>
      <li>
        <strong>CSV Import:</strong> Batch-create resources from CSV uploads (<code
          >/resources_from_csv</code
        >).
      </li>
    </ul>

    <h3>4.6 Plugin System</h3>
    <p>
      Event-driven plugin architecture built around two C# interfaces:
      <code>IApiPlugin</code> (new endpoints mounted at
      <code>/&#123;shortname&#125;</code>) and <code>IHookPlugin</code>
      (before/after action interceptors). Beyond managed C# plugins, DMART also
      loads <strong>native plugins</strong> from <code>~/.dmart/plugins</code> —
      either crash-safe subprocess executables (JSON-lines over stdin/stdout) or
      shared libraries via a C ABI — enabling extensions written in any language.
    </p>
  </div>

  <div class="feature-section">
    <h2>Request Flow</h2>

    <div class="diagram-container">
      <pre class="mermaid">
sequenceDiagram
    participant Client
    participant Middleware
    participant Router
    participant AccessControl
    participant PluginManager
    participant SqlAdapter

    Client->>Middleware: HTTP Request (Kestrel)
    Middleware->>Middleware: JWT Auth &amp; Logging
    Middleware->>Router: Route Request (Minimal API)
    Router->>AccessControl: Check Permissions (RBAC/ACL)
    alt Access Denied
        AccessControl-->>Client: 403 Forbidden
    else Access Granted
        Router->>PluginManager: Trigger Before Hooks
        PluginManager->>PluginManager: Run IHookPlugin handlers

        Router->>SqlAdapter: Perform Action (CRUD)
        SqlAdapter->>SqlAdapter: Persist to PostgreSQL &amp; Index

        Router->>PluginManager: Trigger After Hooks
        PluginManager->>PluginManager: Run async side effects (Task)

        Router-->>Client: HTTP Response
    end
      </pre>
    </div>
  </div>

  <div class="feature-section">
    <h2>5. API Structure</h2>
    <p>REST-like and resource-oriented. Key routers:</p>
    <ul>
      <li>
        <strong><code>/managed</code></strong>: Core content management (CRUD,
        Query, Import/Export).
        <ul>
          <li><code>/request</code>: Unified endpoint for batch operations.</li>
          <li><code>/query</code>: Main search endpoint.</li>
          <li><code>/entry</code>: Single entry metadata and payload.</li>
          <li><code>/payload</code>: Raw content/media retrieval.</li>
          <li>
            <code>/import</code> / <code>/export</code>: Bulk data operations.
          </li>
        </ul>
      </li>
      <li>
        <strong><code>/user</code></strong>: Authentication and profile
        management.
      </li>
      <li>
        <strong><code>/public</code></strong>: Read-only access for public
        content.
      </li>
      <li><strong><code>/qr</code></strong>: QR code generation.</li>
      <li>
        <strong><code>/info</code></strong>: System information and manifest.
      </li>
      <li>
        <strong><code>/mcp</code></strong>: Model Context Protocol server
        (Streamable HTTP) exposing DMART tools to AI clients, paired with the
        OAuth 2.1 Authorization Server for client onboarding.
      </li>
      <li>
        <strong><code>/docs</code></strong>: Swagger UI and OpenAPI schema
        (<code>/docs/openapi.json</code>).
      </li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>6. Data Asset Management</h2>
    <p>DMART natively handles analytical data files:</p>
    <ul>
      <li>
        Specialized support for <strong>SQLite</strong> attachments — perform
        SQL queries directly on attached files via the API. Note that
        <code>sqlite</code> here is a data-asset content type only, not the
        database backend (the backend is always PostgreSQL).
      </li>
      <li>
        <strong>Parquet</strong>, <strong>JSONL</strong>, and
        <strong>CSV</strong> are treated as first-class data citizens.
      </li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>7. Deployment</h2>
    <ul>
      <li>
        <strong>Single Binary:</strong> Native-AOT publish produces one
        self-contained <code>dmart</code> executable (~50&nbsp;MB) with no
        runtime dependency — copy and run. The embedded admin UIs and sample
        seed data ship inside it, and the same binary doubles as the CLI
        (<code>seed</code>, <code>import</code>, <code>export</code>,
        <code>migrate</code>).
      </li>
      <li>
        <strong>Containerized:</strong> Docker/Podman images available (<code
          >ghcr.io/edraj/csdmart</code
        >).
      </li>
      <li>
        <strong>Config:</strong> Environment variables / <code>config.env</code>,
        bound and validated once at startup (strict unknown-key rejection, no
        hot reload).
      </li>
      <li>
        <strong>External dependency:</strong> a PostgreSQL instance — no Redis,
        no separate search cluster required.
      </li>
    </ul>
  </div>
</div>

<style>
  ul ul {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
</style>
