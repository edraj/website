Unlocking the true value of your data. In today's digital landscape, data is often touted as the "new oil," yet for many organizations, it remains a burden — scattered, locked in proprietary formats, and difficult to manage. **DMART** changes that narrative.

DMART transforms your data from a liability into a true asset. By treating data as a commodity that is easy to author, share, and extend, DMART empowers businesses of all sizes to regain control over their information. It is not just a database; it is a **Data-as-a-Service (DaaS)** platform.

## Data First Philosophy

Traditional systems trap your data inside complex applications. DMART flips this model:

```mermaid
graph TD
    subgraph Traditional["Traditional App-Centric Model"]
        App1["Application A"] <--> DB1[("Database A")]
        App2["Application B"] <--> DB2[("Database B")]
        App3["Application C"] <--> DB3[("Database C")]
    end

    subgraph DMART["DMART Data-Centric Model"]
        D_App1["Website"] --> API{"Unified API"}
        D_App2["Mobile App"] --> API
        D_App3["Microservice"] --> API
        API <--> Engine["DMART Engine"]
        Engine <--> Store[("PostgreSQL or SQLite<br/>+ JSON Export")]
    end
```

**Ownership** Your data lives in a standard PostgreSQL or SQLite database you control, and can be exported in full to plain JSON files at any time — no proprietary lock-in.

**Accessibility** A unified, standardized API layer means any application or microservice can access your data securely through one consistent interface.

**Resilience** Data is stored in battle-tested PostgreSQL or SQLite and can be exported to human-readable JSON files, keeping it structured for longevity, version control, and easy inspection.

## Tailored Benefits for Every Scale

Whether you are a solo entrepreneur or a large enterprise, DMART adapts to your specific needs.

### 1. Small Business: Agility & Simplicity

For startups, local shops, and independent professionals, technical complexity is the enemy.

- **All-in-One Solution:** Use DMART as a backend for your website (CMS), a customer database (CRM), and a product inventory system simultaneously.

- **Low Maintenance:** A single self-contained binary with "batteries-included" features like user management and access control.

- **Cost-Effective:** Deploy easily on standard hardware or cloud instances without complex database licensing.

- **Rapid Launch:** Quickly spin up a professional online presence with built-in content management and messaging.

### 2. Medium Business: Structure & Scalability

As your business grows, so does the chaos of your data. DMART provides the structure needed to scale efficiently.

- **Process Automation:** Leverage built-in workflows and activity management (ticketing) to streamline operations.

- **Unified Data View:** Consolidate dispersed information into a single "Source of Truth."

- **Enhanced Security:** Robust role-based access control (RBAC), with per-entry ACLs and row filters, ensures employees only see what they need, and administrator accounts sign in with a password and a one-time code.

- **Audit & Compliance:** Creates, updates and moves are recorded in the entry's history — who changed what, and when.

### 3. Big Business: Innovation & Shared Identity

Large enterprises often struggle with "Shadow IT" and the slow pace of corporate IT. DMART serves as an agile layer.

- **Rapid Prototyping:** Build and test new internal tools or customer-facing apps in days, not months.

- **Departmental Independence:** Give specific departments their own DMART instances while remaining compliant.

- **Microservice Backbone:** Lightweight, flexible operational data store for microservices with common user session and security model.

- **Shared Identity:** One DMART can be the user directory for the others: replicas keep a read-only copy of its users and groups in step with it and answer LDAP sign-ins on their own while it is down, its LDAP directory serves mail servers and other directory clients, and its OpenID Connect provider gives every app one sign-in. An existing LDAP directory moves in with `dmart import-ldif`. Syncing data between instances is designed but not built yet.

- **Future-Proofing:** Standard, open formats ensure data is never obsolete regardless of technology shifts.

```mermaid
graph TD
    Dir["Primary DMART<br/>users, groups, OIDC sign-in"]
    Dir -->|"directory feed"| HR["HR Dept<br/>DMART node"]
    Dir -->|"directory feed"| Sales["Sales Dept<br/>DMART node"]
    Dir -->|"directory feed"| R_D["R&D Dept<br/>DMART node"]
```

## Conclusion

DMART is more than software; it is a strategic approach to information management. It simplifies the complex, secures the vulnerable, and liberates your data to drive value across your entire organization.

**Stop managing databases. Start managing assets with DMART.**
