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
    <h2>Introduction</h2>
    <p>
      DMART is a Data-as-a-Service (DaaS) platform. It treats data as
      commodities, optimized for small to medium footprints (&lt;=300M entries),
      using SQL database.
    </p>
  </div>

  <div class="feature-section">
    <h2>Architecture</h2>
    <p>Microservices-friendly with clear separation.</p>

    <div class="diagram-container">
      <pre class="mermaid">
graph TD
    User[User] -->|HTTP| LB[Load Balancer]
    LB -->|ASGI| API[FastAPI]

    subgraph "Backend"
        API -->|RW| FS[File System]
        API -->|RW| DB[(SQL Database)]
    end

    subgraph "Frontend"
        SPA[Svelte] --> API
    end
      </pre>
    </div>

    <h3>Backend Stack</h3>
    <ul>
      <li><strong>Language:</strong> Python 3.12+ (asyncio).</li>
      <li><strong>Web:</strong> FastAPI, Pydantic.</li>
      <li><strong>Storage:</strong> SQL database (PostgreSQL/SQLite).</li>
      <li><strong>Auth:</strong> JWT stateless.</li>
    </ul>

    <h3>Frontend Stack</h3>
    <ul>
      <li><strong>Framework:</strong> Svelte + Vite.</li>
      <li><strong>Routing:</strong> Routify.</li>
      <li><strong>UI:</strong> Flowbite / SvelteStrap.</li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>Data Model</h2>
    <p>Entry-oriented model inheriting from <code>Meta</code>.</p>

    <div class="diagram-container">
      <pre class="mermaid">
classDiagram
    class Resource
    class Payload
    class Meta

    Resource &lt;|-- Payload
    Resource &lt;|-- Meta
    Meta &lt;|-- Space
    Meta &lt;|-- Entry
      </pre>
    </div>

    <h3>Hierarchy</h3>
    <ul>
      <li><strong>Space:</strong> Top-level container.</li>
      <li><strong>Subpath:</strong> Logical folder.</li>
      <li>
        <strong>Entry:</strong> Atomic unit (UUID, Meta, Payload, Attachments).
      </li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>Key Features</h2>

    <h3>Storage</h3>
    <p>Human-readable SQL database. Built for ACID compliance.</p>

    <h3>Search</h3>
    <p>SQL-backed full-text search. Filtering, aggregation.</p>

    <h3>Access Control</h3>
    <p>RBAC + ACL. Granular permissions.</p>

    <h3>Workflows</h3>
    <p>Ticketing system with state transitions.</p>

    <h3>Plugins</h3>
    <p>Event-driven architecture.</p>
  </div>

  <div class="feature-section">
    <h2>API Structure</h2>
    <ul>
      <li><strong><code>/managed</code></strong>: CRUD, Query.</li>
      <li><strong><code>/user</code></strong>: Auth, Profile.</li>
      <li><strong><code>/public</code></strong>: Read-only.</li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>Deployment</h2>
    <ul>
      <li><strong>Containerized:</strong> Docker/Podman.</li>
      <li><strong>Config:</strong> Environment variables.</li>
      <li><strong>Offline:</strong> Airgapped support.</li>
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
    font-size: 1.2rem;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-main);
    text-transform: uppercase;
    border-bottom: 1px dashed var(--border-color);
    display: inline-block;
  }

  p {
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  ul {
    margin-bottom: 1rem;
    padding-left: 1.2rem;
    list-style-type: square;
  }

  li {
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
  }

  strong {
    color: var(--text-main);
    font-weight: 700;
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
