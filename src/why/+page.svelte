<script lang="ts">
  import { useMermaid } from "../lib/mermaid";
</script>

<div class="content" use:useMermaid>
  <h1>Why DMART?</h1>
  <p class="intro">
    Unlocking the true value of your data. In today's digital landscape, data is
    often touted as the "new oil," yet for many organizations, it remains a
    burden — scattered, locked in proprietary formats, and difficult to manage. <strong
      >DMART</strong
    > changes that narrative.
  </p>
  <p class="intro">
    DMART transforms your data from a liability into a true asset. By treating
    data as a commodity that is easy to author, share, and extend, DMART
    empowers businesses of all sizes to regain control over their information.
    It is not just a database; it is a <strong>Data-as-a-Service (DaaS)</strong>
    platform.
  </p>

  <div class="feature-section">
    <h2>Data First Philosophy</h2>
    <p>
      Traditional systems trap your data inside complex applications. DMART
      flips this model:
    </p>

    <div class="diagram-container">
      <pre class="mermaid">
graph TD
    subgraph Traditional["Traditional App-Centric Model"]
        App1["Application A"] &lt;--&gt; DB1[("Database A")]
        App2["Application B"] &lt;--&gt; DB2[("Database B")]
        App3["Application C"] &lt;--&gt; DB3[("Database C")]
    end

    subgraph DMART["DMART Data-Centric Model"]
        D_App1["Website"] --&gt; API&#123;"Unified API"&#125;
        D_App2["Mobile App"] --&gt; API
        D_App3["Microservice"] --&gt; API
        API &lt;--&gt; Engine["DMART Engine"]
        Engine &lt;--&gt; Store[("Data Assets&#60;br/&#62;Files or Database")]
    end
      </pre>
    </div>

    <div class="grid-list">
      <div class="item">
        <strong>Ownership</strong>
        <span
          >Choose between a standard SQL database for enterprise
          compatibility, or a lightweight embedded SQLite for simplicity.</span
        >
      </div>
      <div class="item">
        <strong>Accessibility</strong>
        <span
          >A unified, standardized API layer means any application or
          microservice can access your data securely, regardless of the
          underlying storage.</span
        >
      </div>
      <div class="item">
        <strong>Resilience</strong>
        <span
          >Whether file-based or SQL-backed, your data is structured for
          longevity, version control, and easy inspection.</span
        >
      </div>
    </div>
  </div>

  <div class="feature-section">
    <h2>Tailored Benefits for Every Scale</h2>
    <p>
      Whether you are a solo entrepreneur or a large enterprise, DMART adapts to
      your specific needs.
    </p>

    <h3>1. Small Business: Agility &amp; Simplicity</h3>
    <p>
      For startups, local shops, and independent professionals, technical
      complexity is the enemy.
    </p>
    <ul>
      <li>
        <strong>All-in-One Solution:</strong> Use DMART as a backend for your website
        (CMS), a customer database (CRM), and a product inventory system simultaneously.
      </li>
      <li>
        <strong>Low Maintenance:</strong> Simple file-based structure with "batteries-included"
        features like user management and access control.
      </li>
      <li>
        <strong>Cost-Effective:</strong> Deploy easily on standard hardware or cloud
        instances without complex database licensing.
      </li>
      <li>
        <strong>Rapid Launch:</strong> Quickly spin up a professional online presence
        with built-in content management and messaging.
      </li>
    </ul>

    <h3>2. Medium Business: Structure &amp; Scalability</h3>
    <p>
      As your business grows, so does the chaos of your data. DMART provides the
      structure needed to scale efficiently.
    </p>
    <ul>
      <li>
        <strong>Process Automation:</strong> Leverage built-in workflows and activity
        management (ticketing) to streamline operations.
      </li>
      <li>
        <strong>Unified Data View:</strong> Consolidate dispersed information into
        a single "Source of Truth."
      </li>
      <li>
        <strong>Enhanced Security:</strong> Robust role-based access control (RBAC)
        ensures employees only see what they need.
      </li>
      <li>
        <strong>Audit &amp; Compliance:</strong> Every change is tracked — complete
        history of who changed what and when.
      </li>
    </ul>

    <h3>3. Big Business: Innovation &amp; Federation</h3>
    <p>
      Large enterprises often struggle with "Shadow IT" and the slow pace of
      corporate IT. DMART serves as an agile layer.
    </p>
    <ul>
      <li>
        <strong>Rapid Prototyping:</strong> Build and test new internal tools or
        customer-facing apps in days, not months.
      </li>
      <li>
        <strong>Departmental Independence:</strong> Give specific departments their
        own DMART instances while remaining compliant.
      </li>
      <li>
        <strong>Microservice Backbone:</strong> Lightweight, flexible operational
        data store for microservices with common user session and security model.
      </li>
      <li>
        <strong>Data Federation:</strong> Connect multiple DMART instances for seamless
        collaboration across business units.
      </li>
      <li>
        <strong>Future-Proofing:</strong> Standard, open formats ensure data is never
        obsolete regardless of technology shifts.
      </li>
    </ul>

    <div class="diagram-container">
      <pre class="mermaid">
graph LR
    subgraph Enterprise_Ecosystem["Enterprise Ecosystem"]
        direction TB
        HR["HR Dept&#60;br/&#62;DMART Node"] &lt;--&gt; Fed(("Federation Layer"))
        Sales["Sales Dept&#60;br/&#62;DMART Node"] &lt;--&gt; Fed
        R_D["R&amp;D Dept&#60;br/&#62;DMART Node"] &lt;--&gt; Fed

        Fed --&gt; GlobalSearch["Global Search &amp; Analytics"]
        Fed --&gt; CorpPortal["Corporate Portal"]
    end
      </pre>
    </div>
  </div>

  <div class="feature-section">
    <h2>Conclusion</h2>
    <p>
      DMART is more than software; it is a strategic approach to information
      management. It simplifies the complex, secures the vulnerable, and
      liberates your data to drive value across your entire organization.
    </p>
    <p class="highlight">
      <strong>Stop managing databases. Start managing assets with DMART.</strong
      >
    </p>
  </div>
</div>

<style>
</style>
