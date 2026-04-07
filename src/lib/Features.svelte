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
  <h1>Features</h1>
  <p class="intro">
    D-MART is a versatile Data-as-a-Service (DaaS) platform designed to simplify
    data management for modern applications.
  </p>

  <div class="feature-section">
    <h2>Unified Data Management</h2>
    <p>D-MART treats data as a first-class citizen.</p>
    <div class="grid-list">
      <div class="item">
        <strong>Flexible "Entries"</strong>
        <span
          >Core unit of data representing anything from a record to a document.</span
        >
      </div>
      <div class="item">
        <strong>Structured & Unstructured</strong>
        <span>Handle JSON alongside text and binary files.</span>
      </div>
      <div class="item">
        <strong>Attachments</strong>
        <span>Associate files directly with an entry.</span>
      </div>
      <div class="item">
        <strong>Hierarchical</strong>
        <span>Organize data into Spaces and Subpaths.</span>
      </div>
    </div>

    <div class="diagram-container">
      <pre class="mermaid">
graph TD
    Space[Space] --> Folder[Folder]
    Folder --> Entry[Entry]
    Entry --> Meta[Metadata]
    Entry --> Payload[Payload]
    Entry --> Attachments[Attachments]
      </pre>
    </div>
  </div>

  <div class="feature-section">
    <h2>Search & Discovery</h2>
    <p>Effortless information retrieval.</p>
    <ul>
      <li><strong>Full-Text Search</strong>: Across all data.</li>
      <li><strong>Advanced Filtering</strong>: By tags, dates, authors.</li>
      <li><strong>SQL Full-Text</strong>: Native database search capabilities.</li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>Collaboration</h2>
    <p>Built-in tools for teamwork.</p>

    <div class="diagram-container">
      <pre class="mermaid">
stateDiagram-v2
    [*] --> Open
    Open --> InProgress
    InProgress --> Review
    Review --> Resolved
    Resolved --> [*]
      </pre>
    </div>

    <ul>
      <li><strong>Ticketing</strong>: Trackable tickets with states.</li>
      <li><strong>Workflows</strong>: Custom state transitions.</li>
      <li><strong>Assignments</strong>: Assign entries to users.</li>
      <li><strong>Comments</strong>: Threaded discussions.</li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>Access Control</h2>
    <p>Granular security configuration.</p>
    <ul>
      <li><strong>Spaces</strong>: Distinct workspaces.</li>
      <li><strong>RBAC</strong>: Role-Based Access Control.</li>
      <li><strong>Permissions</strong>: Folder or entry level.</li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>Integration</h2>
    <p>Seamless ecosystem integration.</p>

    <div class="diagram-container">
      <pre class="mermaid">
sequenceDiagram
    participant App
    participant API
    participant Store

    App->>API: Create Entry
    API->>Store: Persist
    Store-->>API: Success
    API->>App: 201 Created
      </pre>
    </div>

    <ul>
      <li><strong>RESTful API</strong>: Comprehensive interaction.</li>
      <li><strong>Plugins</strong>: Extend functionality.</li>
      <li><strong>Webhooks</strong>: Trigger actions on change.</li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>Operations</h2>
    <p>Flexible deployment.</p>
    <ul>
      <li><strong>Container-Ready</strong>: Docker/Podman support.</li>
      <li><strong>Offline</strong>: Air-gapped capable.</li>
      <li><strong>File-System</strong>: Human-readable storage.</li>
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

  .intro {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 2rem;
    font-family: var(--font-sans);
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

  .grid-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .item {
    background: var(--bg-color);
    padding: 1rem;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .item strong {
    color: var(--text-main);
    font-size: 1rem;
    text-transform: uppercase;
  }

  .item span {
    font-size: 0.9rem;
    color: var(--text-secondary);
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
