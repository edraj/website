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
  <h1>Feature Overview</h1>
  <p class="intro">
    D-MART is a versatile Data-as-a-Service (DaaS) platform designed to simplify
    data management for modern applications. It acts as a central repository for
    structured data, documents, and media, providing a unified interface for
    storage, retrieval, and collaboration.
  </p>

  <div class="feature-section">
    <h2>1. Unified Data Management</h2>
    <p>
      D-MART treats data as a first-class citizen, moving beyond traditional
      database constraints.
    </p>
    <div class="grid-list">
      <div class="item">
        <strong>Flexible "Entries"</strong>
        <span
          >The core unit of data — can represent anything from a simple record
          to a complex document.</span
        >
      </div>
      <div class="item">
        <strong>Structured &amp; Unstructured</strong>
        <span
          >Seamlessly handle JSON data alongside text, markdown, and binary
          files (images, PDFs, videos).</span
        >
      </div>
      <div class="item">
        <strong>Attachments</strong>
        <span
          >Associate any number of files (documents, media) directly with an
          entry, keeping related information together.</span
        >
      </div>
      <div class="item">
        <strong>Hierarchical</strong>
        <span
          >Organize data into intuitive Spaces and Subpaths, similar to a file
          system.</span
        >
      </div>
    </div>

    <div class="diagram-container">
      <pre class="mermaid">
graph TD
    Space["Space: Project/Business"] --> Folder["Folder: Category"]
    Folder --> Entry["Entry: Core Data Unit"]
    Entry -->|Has| Meta["Metadata: ID, Tags, Owner"]
    Entry -->|Has| Payload["Payload: JSON, Text, Binary"]
    Entry -->|Has| Attachments["Attachments: Files, Media"]
    Attachments --> Doc["Document.pdf"]
    Attachments --> Img["Image.png"]
      </pre>
    </div>
  </div>

  <div class="feature-section">
    <h2>2. Powerful Search &amp; Discovery</h2>
    <p>Finding information is effortless with D-MART's robust search engine.</p>
    <ul>
      <li>
        <strong>Full-Text Search:</strong> Instantly search across all data, including
        structured fields and text content.
      </li>
      <li>
        <strong>Advanced Filtering:</strong> Filter results by tags, creation dates,
        authors, and specific data attributes.
      </li>
      <li>
        <strong>Native SQL Search:</strong> Uses SQL full-text search capabilities
        for high-performance querying.
      </li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>3. Collaboration &amp; Workflow Automation</h2>
    <p>Built-in tools to manage processes and teamwork.</p>

    <div class="diagram-container">
      <pre class="mermaid">
stateDiagram-v2
    [*] --> Open
    Open --> InProgress: Assign to User
    InProgress --> Review: Work Completed
    Review --> Resolved: Approved
    Review --> InProgress: Request Changes
    Resolved --> [*]
      </pre>
    </div>

    <ul>
      <li>
        <strong>Ticketing System:</strong> Transform any data entry into a trackable
        ticket with states (e.g., "Open," "In Progress," "Resolved").
      </li>
      <li>
        <strong>Custom Workflows:</strong> Define custom state transitions and rules
        to match your specific business processes.
      </li>
      <li>
        <strong>Assignments:</strong> Assign entries or tickets to specific users
        or roles.
      </li>
      <li>
        <strong>Comments &amp; Reactions:</strong> Collaborate directly on data entries
        with threaded comments and emoji reactions.
      </li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>4. Comprehensive Access Control</h2>
    <p>Security is granular and configurable to match organizational needs.</p>
    <ul>
      <li>
        <strong>Spaces:</strong> Distinct workspaces to isolate data and projects.
      </li>
      <li>
        <strong>Role-Based Access Control (RBAC):</strong> Define roles (e.g., Admin,
        Editor, Viewer) with specific permissions.
      </li>
      <li>
        <strong>Granular Permissions:</strong> Control access at the folder or even
        individual entry level (Create, Read, Update, Delete).
      </li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>5. Integration &amp; Extensibility</h2>
    <p>Designed to integrate seamlessly with your existing ecosystem.</p>

    <div class="diagram-container">
      <pre class="mermaid">
sequenceDiagram
    participant App as External App
    participant API as D-MART API
    participant Plugin as Plugin System
    participant Store as Data Store

    App->>API: Create New Entry (POST)
    API->>Plugin: Execute Pre-Save Hook
    Plugin-->>API: Validated / Modified Data
    API->>Store: Persist Data
    Store-->>API: Success
    API->>App: 201 Created
    API->>Plugin: Execute Post-Save Hook (Notification)
      </pre>
    </div>

    <ul>
      <li>
        <strong>RESTful API:</strong> A comprehensive, documented API for interacting
        with every aspect of the platform.
      </li>
      <li>
        <strong>Plugin Architecture:</strong> Extend functionality with custom plugins
        for logic, validation, or external integrations.
      </li>
      <li>
        <strong>Webhooks &amp; Notifications:</strong> Trigger actions or send notifications
        (Email, SMS) based on data changes or workflow events.
      </li>
    </ul>
  </div>

  <div class="feature-section">
    <h2>6. Deployment &amp; Operations</h2>
    <p>Built for flexibility and reliability in various environments.</p>
    <ul>
      <li>
        <strong>Container-Ready:</strong> Easily deployable via Docker/Podman for
        consistent environments.
      </li>
      <li>
        <strong>Offline Capability:</strong> Supports air-gapped deployments, allowing
        data synchronization when connectivity is restored.
      </li>
      <li>
        <strong>Flexible Storage:</strong> Choose between a human-readable file
        structure (<code>'file'</code> mode) for longevity and ease of backup,
        or a standard SQL database (<code>'sql'</code> mode) for enterprise integration.
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

  .intro {
    font-size: 1.05rem;
    color: var(--text-secondary);
    margin-bottom: 2.5rem;
    font-family: var(--font-sans);
    line-height: 1.7;
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
    line-height: 1.6;
  }

  ul {
    margin-bottom: 1rem;
    padding-left: 1.2rem;
    list-style-type: square;
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
    line-height: 1.4;
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
