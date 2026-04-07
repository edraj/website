<script lang="ts">
  import mermaid from "mermaid";
  import { onMount } from "svelte";

  function isDarkMode() {
    return document.documentElement.classList.contains("dark");
  }

  async function renderMermaid() {
    const theme = isDarkMode() ? "dark" : "neutral";
    mermaid.initialize({ startOnLoad: false, theme });
    document.querySelectorAll(".mermaid[data-original]").forEach((el) => {
      el.removeAttribute("data-processed");
      el.innerHTML = el.getAttribute("data-original")!;
    });
    await mermaid.run();
  }

  onMount(() => {
    document.querySelectorAll("pre.mermaid").forEach((el) => {
      el.setAttribute("data-original", el.innerHTML);
    });
    renderMermaid();

    const onThemeChange = () => renderMermaid();
    window.addEventListener("themechange", onThemeChange);
    return () => window.removeEventListener("themechange", onThemeChange);
  });
</script>

<div class="content">
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
    LB -->|ASGI| API["FastAPI Backend"]

    subgraph "Backend Services"
        API -->|RW| SQL["SQL Database (e.g. PostgreSQL/SQLite)"]
    end

    subgraph "Frontend"
        SPA["Svelte SPA"] -->|"API Calls"| API
        Tauri["Tauri Desktop App"] -->|"API Calls"| API
    end

    SQL -->|Backup| Backup["Backup Systems"]
      </pre>
    </div>

    <h3>Backend Stack</h3>
    <ul>
      <li>
        <strong>Language:</strong> Python 3.12+ with extensive use of
        <code>asyncio</code> for concurrent request handling.
      </li>
      <li>
        <strong>Web Framework:</strong> FastAPI, leveraging Pydantic for data validation
        and OpenAPI schema generation.
      </li>
      <li><strong>ASGI Server:</strong> Hypercorn.</li>
      <li>
        <strong>Data Persistence:</strong> DMART uses a SQL database as the single source
        of truth:
        <ul>
          <li>
            <strong>PostgreSQL:</strong> Recommended for production deployments with
            ACID compliance and relational integrity.
          </li>
          <li>
            <strong>SQLite:</strong> Lightweight embedded option for development
            and small deployments.
          </li>
        </ul>
      </li>
      <li>
        <strong>Authentication:</strong> JWT-based stateless authentication.
      </li>
    </ul>

    <h3>Frontend Stack</h3>
    <ul>
      <li><strong>Framework:</strong> Svelte + Vite.</li>
      <li><strong>Routing:</strong> Routify (@roxi/routify).</li>
      <li><strong>State Management:</strong> Svelte Stores.</li>
      <li><strong>UI:</strong> Flowbite Svelte / SvelteStrap.</li>
      <li>
        <strong>Desktop:</strong> Tauri (Rust-based) for cross-platform desktop applications.
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
        <strong>DataAsset:</strong> Specialized attachments for Json, Csv, Sqlite,
        Duckdb, Parquet.
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
        +ConfigDict model_config
    &#125;
    class Payload &#123;
        +ContentType content_type
        +str body
    &#125;
    class Meta &#123;
        +UUID uuid
        +str shortname
        +Translation displayname
        +Payload payload
    &#125;

    Resource &lt;|-- Payload
    Resource &lt;|-- Meta

    Meta &lt;|-- Space
    Meta &lt;|-- Actor
    Meta &lt;|-- Group
    Meta &lt;|-- Content
    Meta &lt;|-- Schema
    Meta &lt;|-- Attachment

    Actor &lt;|-- User

    Attachment &lt;|-- DataAsset
    Attachment &lt;|-- Comment
    Attachment &lt;|-- Ticket

    DataAsset &lt;|-- Json
    DataAsset &lt;|-- Csv
    DataAsset &lt;|-- Sqlite
      </pre>
    </div>
  </div>

  <div class="feature-section">
    <h2>4. Key Features</h2>

    <h3>4.1 Storage &amp; Data Longevity</h3>
    <p>
      Data is stored in normalized database tables, ensuring ACID compliance
      and standard relational integrity. DMART supports PostgreSQL for
      production and SQLite for development/small deployments.
    </p>

    <h3>4.2 Advanced Search &amp; Querying</h3>
    <p>
      The <code>/query</code> endpoint supports a rich query language using native SQL
      with full-text search capabilities:
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
      Event-driven plugin architecture with API plugins (new endpoints) and Hook
      plugins (before/after action interceptors).
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
    participant DB_Adapter

    Client->>Middleware: HTTP Request
    Middleware->>Middleware: Auth &amp; Logging
    Middleware->>Router: Route Request
    Router->>AccessControl: Check Permissions (RBAC/ACL)
    alt Access Denied
        AccessControl-->>Client: 403 Forbidden
    else Access Granted
        Router->>PluginManager: Trigger Before Hooks
        PluginManager->>PluginManager: Run Sync Hooks

        Router->>DB_Adapter: Perform Action (CRUD)
        DB_Adapter->>DB_Adapter: Update Storage &amp; Index

        Router->>PluginManager: Trigger After Hooks
        PluginManager->>PluginManager: Run Async Side Effects

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
    </ul>
  </div>

  <div class="feature-section">
    <h2>6. Data Asset Management</h2>
    <p>DMART natively handles analytical data files:</p>
    <ul>
      <li>
        Specialized support for <strong>DuckDB</strong> and
        <strong>SQLite</strong> attachments — perform SQL queries directly on attached
        files via the API.
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
        <strong>Containerized:</strong> Docker/Podman images available (<code
          >ghcr.io/edraj/dmart</code
        >).
      </li>
      <li>
        <strong>Config:</strong> Environment variables via
        <code>config.env</code>.
      </li>
      <li>
        <strong>Admin Scripts:</strong> Helpers for passwords, reindexing, and backups.
      </li>
      <li>
        <strong>Offline:</strong> Scripts for air-gapped/offline installation.
      </li>
    </ul>
  </div>
</div>

<style>
  .content {
    color: var(--text-main);
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--text-main);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
    text-transform: uppercase;
  }

  .feature-section {
    margin-bottom: 3rem;
    padding: 1.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text-main);
    text-transform: uppercase;
  }

  h3 {
    font-size: 1.1rem;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-main);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px dashed var(--border-color);
    display: inline-block;
    padding-bottom: 0.2rem;
  }

  p {
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  ul {
    margin-bottom: 1rem;
    padding-left: 1.2rem;
    list-style-type: square;
  }

  ul ul {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }

  li {
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  strong {
    color: var(--text-main);
    font-weight: 700;
  }

  code {
    font-family: "Courier New", Courier, monospace;
    font-size: 0.85em;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    padding: 0.1rem 0.35rem;
  }

  .diagram-container {
    background: var(--bg-color);
    padding: 1rem;
    border: 1px solid var(--border-color);
    margin: 1.5rem 0;
    overflow-x: auto;
  }

  pre.mermaid {
    background: transparent;
    padding: 0;
    margin: 0;
    font-family: monospace;
    border: none;
  }
</style>
