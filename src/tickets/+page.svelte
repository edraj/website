<script lang="ts">
  import { useMermaid } from "../lib/mermaid";
</script>

<div class="content" use:useMermaid>
    <h1>Tickets &amp; Workflows</h1>
    <p class="intro">
        A <strong>ticket</strong> is an ordinary DMART entry that additionally
        carries <em>workflow state</em>. Instead of freely editing a status
        field, callers advance a ticket through a declarative state machine — a
        <strong>workflow</strong> that itself lives in the store as data. Every
        transition is validated against the workflow definition, the actor's
        roles, and (where required) a resolution reason, then persisted through
        the same permission-gated update path as any other write.
    </p>

    <!-- ═══ WHAT IS A TICKET ═══ -->
    <div class="feature-section">
        <h2>What Is a Ticket</h2>
        <p>
            A ticket is an entry whose <code>resource_type</code> is
            <code>ticket</code> (one of the 30 resource types). On top of the
            usual Meta fields (<code>shortname</code>, <code>owner_shortname</code>,
            <code>acl</code>, <code>payload</code> …) the entry row carries a
            handful of ticket-specific columns, defined on
            <code>Dmart.Models.Core.Entry</code>:
        </p>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Field</th>
                        <th>Type</th>
                        <th>Meaning</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>state</code></td>
                        <td><code>string?</code></td>
                        <td>The current workflow state (e.g. <code>pending</code>, <code>approved</code>). Set to the workflow's <code>initial_state</code> at creation.</td>
                    </tr>
                    <tr>
                        <td><code>is_open</code></td>
                        <td><code>bool?</code></td>
                        <td>Whether the ticket is still active. <code>true</code> while the current state has outgoing transitions; <code>false</code> once it lands on a terminal (closed) state.</td>
                    </tr>
                    <tr>
                        <td><code>workflow_shortname</code></td>
                        <td><code>string?</code></td>
                        <td>Which workflow definition governs this ticket. Looked up when a transition is attempted.</td>
                    </tr>
                    <tr>
                        <td><code>reporter</code></td>
                        <td><code>Reporter?</code></td>
                        <td>Provenance for externally-submitted tickets (channel, distributor, etc.). See below.</td>
                    </tr>
                    <tr>
                        <td><code>collaborators</code></td>
                        <td><code>Dictionary&lt;string, string&gt;?</code></td>
                        <td>Named collaborator slots (e.g. <code>&#123;"assignee": "alice"&#125;</code>). Set via the <code>assign</code> request.</td>
                    </tr>
                    <tr>
                        <td><code>resolution_reason</code></td>
                        <td><code>string?</code></td>
                        <td>Why the ticket was closed / rejected. Required by transitions that declare <code>resolution_required</code>.</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <p class="code-note">
            A ticket is created with the normal
            <a href="/entity-lifecycle"><code>create</code> request</a> — you
            supply <code>workflow_shortname</code> and let the engine seed the
            initial state, or set <code>state</code> explicitly. Example
            create record:
        </p>
        <div class="code-container">
            <pre><code>{`POST /managed/request
{
  "space_name": "applications",
  "request_type": "create",
  "records": [
    {
      "resource_type": "ticket",
      "subpath": "api/v1/tickets",
      "shortname": "TCK-1042",
      "attributes": {
        "is_active": true,
        "workflow_shortname": "channel",
        "state": "new",
        "is_open": true,
        "payload": {
          "content_type": "json",
          "schema_shortname": "ticket",
          "body": { "summary": "Activate new POS", "priority": "high" }
        }
      }
    }
  ]
}`}</code></pre>
        </div>
        <p class="code-note">
            The folder a ticket lives in can constrain which workflows are
            legal through its <code>workflow_shortnames</code> setting — see
            <a href="/folders">Folders &amp; Rendering</a>. A ticket that
            declares a <code>workflow_shortname</code> must use one the folder
            allows.
        </p>
    </div>

    <!-- ═══ WORKFLOWS AS DATA ═══ -->
    <div class="feature-section">
        <h2>Workflows Are Data</h2>
        <p>
            A workflow is <em>not</em> code. It is a <code>content</code> entry
            (resource type <code>content</code>) stored under a
            <code>/workflows</code> folder in the management space. Its
            <code>payload.body</code> holds the state-machine definition. At
            transition time <code>WorkflowEngine</code> loads that entry —
            trying subpaths <code>/workflows</code>, <code>/workflow</code>,
            then <code>/</code> — deserialises the body, and evaluates the
            requested action against it.
        </p>

        <h3>Anatomy of a workflow body</h3>
        <div class="grid-list">
            <div class="item">
                <strong>initial_state</strong>
                <span>The state a new ticket starts in. May be a plain string, or an array of <code>&#123;name, roles&#125;</code> objects — in the array form the engine prefers the entry whose <code>roles</code> contains <code>"default"</code>, falling back to the first named entry.</span>
            </div>
            <div class="item">
                <strong>states[]</strong>
                <span>The list of states. Each has a machine <code>state</code> key, an optional display <code>name</code>, and a <code>next</code> array of outgoing transitions. A state with <em>no</em> <code>next</code> is terminal (closed).</span>
            </div>
            <div class="item">
                <strong>next[] transition</strong>
                <span>An <code>action</code> (the verb the caller invokes), a target <code>state</code> (the engine also accepts <code>to</code> for back-compat), an optional <code>roles</code> gate, and an optional <code>resolution_required</code> flag.</span>
            </div>
            <div class="item">
                <strong>resolutions[]</strong>
                <span>Optional per-state catalogue of allowed resolution reasons (each a <code>key</code> plus localized labels). Presentational — surfaced by the admin UI when a resolution is required.</span>
            </div>
        </div>

        <h3>Full workflow definition (payload.body)</h3>
        <p>
            This is the shape of a real seeded workflow (<code>management/workflows/channel</code>),
            trimmed to the essentials. Note that <code>new</code>,
            <code>pending</code>, <code>approved</code> and <code>completed</code>
            all have a <code>next</code> array (open states), while
            <code>failed</code> has none (terminal / closed):
        </p>
        <div class="code-container">
            <pre><code>{`{
  "initial_state": [
    { "name": "new", "roles": ["default"] }
  ],
  "states": [
    {
      "name": "New",
      "state": "new",
      "next": [
        { "action": "submit", "state": "pending", "roles": ["account_manager"] }
      ]
    },
    {
      "name": "Pending",
      "state": "pending",
      "next": [
        { "action": "approve", "state": "approved", "roles": ["backoffice"] },
        { "action": "reject",  "state": "rejected", "roles": ["backoffice"],
          "resolution_required": true }
      ]
    },
    {
      "name": "Approved",
      "state": "approved",
      "next": [
        { "action": "complete", "state": "completed", "roles": ["backoffice"] },
        { "action": "fail",     "state": "failed",    "roles": ["backoffice"] }
      ]
    },
    {
      "name": "Rejected",
      "state": "rejected",
      "next": [
        { "action": "re_submit", "state": "pending", "roles": ["account_manager"] }
      ],
      "resolutions": [
        { "key": "missing_documents", "en": "Missing Documents" },
        { "key": "Others",            "en": "Others" }
      ]
    },
    {
      "name": "Completed",
      "state": "completed",
      "next": [
        { "action": "update", "state": "pending", "roles": ["account_manager"] }
      ]
    },
    { "name": "Failed", "state": "failed" }
  ]
}`}</code></pre>
        </div>

        <div class="highlight">
            <strong>Open vs. closed is derived, not stored on the workflow.</strong>
            The engine's <code>CheckOpenState</code> looks up the target state
            in <code>states[]</code> and reports it <em>open</em> if it has a
            <code>next</code> field, <em>closed</em> if it does not. That result
            becomes the ticket's <code>is_open</code> after the transition — so
            landing on <code>failed</code> above sets
            <code>is_open = false</code>, while landing on <code>pending</code>
            keeps it <code>true</code>.
        </div>
    </div>

    <!-- ═══ STATE MACHINE DIAGRAM ═══ -->
    <div class="feature-section">
        <h2>The State Machine</h2>
        <p>
            The workflow above describes this machine. Solid arrows are
            transitions; each is labelled with the <code>action</code> that
            triggers it. <code>failed</code> is terminal (closed); every other
            state is open.
        </p>
        <div class="diagram-container">
            <pre class="mermaid">
stateDiagram-v2
    [*] --&gt; new
    new --&gt; pending: submit
    pending --&gt; approved: approve
    pending --&gt; rejected: reject (resolution_required)
    approved --&gt; completed: complete
    approved --&gt; failed: fail
    rejected --&gt; pending: re_submit
    completed --&gt; pending: update
    failed --&gt; [*]
            </pre>
        </div>
        <p class="code-note">
            Because <code>rejected</code> and <code>completed</code> still have
            outgoing transitions, they are <em>open</em> states even though they
            read like end states — a rejected ticket can be re-submitted, a
            completed one re-opened. Only <code>failed</code> has no
            <code>next</code>, so it is the sole closed state here.
        </p>
    </div>

    <!-- ═══ PROGRESS-TICKET ENDPOINT ═══ -->
    <div class="feature-section">
        <h2>Advancing a Ticket: <code>progress-ticket</code></h2>
        <p>
            Tickets are never advanced by patching <code>state</code> directly.
            They use a dedicated endpoint that runs the workflow engine:
        </p>
        <div class="path-example">
            <code>PUT /managed/progress-ticket/&#123;space&#125;/&#123;subpath&#125;/&#123;shortname&#125;/&#123;action&#125;</code>
        </div>
        <p>
            The trailing path segments are the ticket's location and the
            <code>action</code> to invoke; the JSON body carries the resolution
            and an optional comment:
        </p>
        <div class="code-container">
            <pre><code>{`PUT /managed/progress-ticket/applications/api/v1/tickets/TCK-1042/reject
{
  "resolution": "missing_documents",
  "comment": "ID scan unreadable"
}`}</code></pre>
        </div>
        <p class="code-note">
            The body accepts <code>resolution</code> <em>or</em>
            <code>resolution_reason</code> (both map to the ticket's
            <code>resolution_reason</code> column), plus an optional
            <code>comment</code>. A missing/empty body is allowed for
            transitions that do not require a resolution.
        </p>

        <h3>What the engine enforces</h3>
        <p>
            <code>WorkflowService.ProgressAsync</code> +
            <code>WorkflowEngine.EvaluateAsync</code> apply these checks, in
            order, before any write happens:
        </p>
        <div class="grid-list">
            <div class="item">
                <strong>1 · Ticket &amp; workflow exist</strong>
                <span>The ticket must exist and carry a non-empty <code>workflow_shortname</code>, and that workflow entry must load and contain a <code>states</code> array.</span>
            </div>
            <div class="item">
                <strong>2 · Current state is known</strong>
                <span>The ticket's <code>state</code> must match a state in the workflow, and that state must have a <code>next</code> array (not terminal).</span>
            </div>
            <div class="item">
                <strong>3 · Action is a valid transition</strong>
                <span>Some entry in <code>next</code> must have <code>action</code> equal to the URL's action, with a non-empty target <code>state</code>.</span>
            </div>
            <div class="item">
                <strong>4 · Actor holds a required role</strong>
                <span>If the transition lists <code>roles</code>, the actor (resolved to their user's roles) must hold at least one of them — otherwise the transition is refused.</span>
            </div>
            <div class="item">
                <strong>5 · Resolution when required</strong>
                <span>If the transition sets <code>resolution_required: true</code>, a <code>resolution_reason</code> must be present in the body — else the request fails with <code>MISSING_DATA</code>.</span>
            </div>
        </div>

        <p class="code-note">
            When all checks pass, the service builds a patch —
            <code>state</code> = the new state, <code>is_open</code> = whether
            that state is open, and <code>resolution_reason</code> if supplied —
            and applies it through <code>EntryService.UpdateAsync</code> with the
            action override <code>progress_ticket</code> (so the permission walk
            gates on the <code>progress_ticket</code> action, not
            <code>update</code>). The success envelope echoes the outcome:
        </p>
        <div class="code-container">
            <pre><code>{`{
  "status": "success",
  "attributes": {
    "state": "rejected",
    "is_open": true
  }
}`}</code></pre>
        </div>

        <h3>Failure responses</h3>
        <p>
            The rejections are explicit. A few representative errors (all
            returned as <code>status: "failed"</code>):
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Cause</th>
                        <th>Error</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Ticket has no <code>workflow_shortname</code></td>
                        <td><code>WORKFLOW_BODY_NOT_FOUND</code> — "ticket has no workflow_shortname"</td>
                    </tr>
                    <tr>
                        <td>Action isn't a valid transition from the current state</td>
                        <td><code>INVALID_TICKET_STATUS</code> — "You can't progress from &#123;state&#125; using &#123;action&#125;"</td>
                    </tr>
                    <tr>
                        <td>Actor lacks a required role</td>
                        <td><code>INVALID_TICKET_STATUS</code> — "You don't have the permission to progress this ticket with action &#123;action&#125;"</td>
                    </tr>
                    <tr>
                        <td>Resolution required but omitted</td>
                        <td><code>MISSING_DATA</code> — "this transition requires a resolution_reason"</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ ASSIGN ═══ -->
    <div class="feature-section">
        <h2>Assigning: the <code>assign</code> Request</h2>
        <p>
            Handing a ticket to a new owner or collaborator is a first-class
            operation, distinct from a normal update. It goes through the
            standard <code>/managed/request</code> envelope with
            <code>request_type: "assign"</code> (one of the 7 request types) and
            is dispatched by <code>DispatchAssignAsync</code>:
        </p>
        <div class="code-container">
            <pre><code>{`POST /managed/request
{
  "space_name": "applications",
  "request_type": "assign",
  "records": [
    {
      "resource_type": "ticket",
      "subpath": "api/v1/tickets",
      "shortname": "TCK-1042",
      "attributes": {
        "owner_shortname": "backoffice_agent_7",
        "collaborators": { "assignee": "backoffice_agent_7" }
      }
    }
  ]
}`}</code></pre>
        </div>

        <div class="highlight">
            <strong>Why it isn't a plain update.</strong>
            <code>owner_shortname</code> is a <em>restricted field</em> — a
            regular <code>update</code> silently preserves the creation-time
            owner and can never transfer it. The <code>assign</code> path opts
            into exactly that one restricted field (<code>AssignRestrictedFields</code>)
            and gates the permission check on the <code>assign</code> action
            (not <code>update</code>) via an action override. This lets an admin
            grant "may reassign ownership" separately from "may edit content".
        </div>

        <p>The dispatcher's contract:</p>
        <div class="grid-list">
            <div class="item">
                <strong>owner_shortname required</strong>
                <span>Absent or empty → <code>MISSING_DATA</code> ("The owner_shortname is required").</span>
            </div>
            <div class="item">
                <strong>Target must exist</strong>
                <span>The new owner must be a real user in <code>management/users</code> → otherwise <code>OBJECT_NOT_FOUND</code>.</span>
            </div>
            <div class="item">
                <strong>Only ownership + collaborators change</strong>
                <span>The patch mutates <code>owner_shortname</code> plus optional <code>collaborators</code>; all other restricted fields stay untouched.</span>
            </div>
        </div>
    </div>

    <!-- ═══ REPORTER / PROVENANCE ═══ -->
    <div class="feature-section">
        <h2>Reporter &amp; Provenance</h2>
        <p>
            Tickets often originate outside the system — a phone channel, a
            mobile app, an automated bot. The optional <code>reporter</code>
            block (<code>Dmart.Models.Core.Reporter</code>) records where a
            ticket came from without conflating it with the DMART
            <code>owner_shortname</code>:
        </p>
        <div class="code-container">
            <pre><code>{`"reporter": {
  "type": "web",
  "name": "Retail Front Desk",
  "channel": "walk_in",
  "distributor": "north_dist_04",
  "governorate": "Baghdad",
  "msisdn": "07701234567",
  "channel_address": { "queue": "activation" }
}`}</code></pre>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Field</th><th>Purpose</th></tr>
                </thead>
                <tbody>
                    <tr><td><code>type</code></td><td>Origin kind. Mirrors the UserType convention — <code>web</code>, <code>mobile</code>, or <code>bot</code>.</td></tr>
                    <tr><td><code>name</code></td><td>Human/agent name that filed the ticket.</td></tr>
                    <tr><td><code>channel</code></td><td>The channel it arrived through.</td></tr>
                    <tr><td><code>distributor</code></td><td>Distributor / partner reference.</td></tr>
                    <tr><td><code>governorate</code></td><td>Geographic province of origin.</td></tr>
                    <tr><td><code>msisdn</code></td><td>Optional phone number of the reporter.</td></tr>
                    <tr><td><code>channel_address</code></td><td>Optional free-form address bag for channel-specific routing.</td></tr>
                </tbody>
            </table>
        </div>
        <p class="code-note">
            All reporter fields are optional strings (plus the
            <code>channel_address</code> map). The set above is exactly what the
            model exposes — treat <code>type</code>'s values as the
            <code>web|mobile|bot</code> convention rather than a rigidly
            enforced enum on this field.
        </p>
    </div>

    <!-- ═══ LOCKING ═══ -->
    <div class="feature-section">
        <h2>Locking Tickets</h2>
        <p>
            An agent working a ticket can place an entry lock so nobody else
            edits it underneath them. Locking is generic to all entries but is
            especially useful for tickets. It uses the <code>lock</code> and
            <code>unlock</code> actions (two of the 11 action types):
        </p>
        <div class="code-container">
            <pre><code>{`# take the lock
PUT    /managed/lock/ticket/applications/api/v1/tickets/TCK-1042

# release it
DELETE /managed/lock/applications/api/v1/tickets/TCK-1042`}</code></pre>
        </div>
        <p>
            While a lock is held, a plain <code>update</code> by anyone other
            than the lock holder is blocked. The permission gate runs first, so
            an unauthorized caller still gets a "not allowed" answer rather than
            a hint that the entry is merely locked.
        </p>
        <div class="highlight">
            <strong>Workflow actions bypass the lock.</strong> The lock block
            applies only to plain <code>update</code>. The workflow-authorized
            overrides — <code>progress_ticket</code> and <code>assign</code> —
            carry their own action grant and keep working even when a lock is
            parked, so a supervisor can reassign or progress a locked ticket
            whose holder has gone offline.
        </div>
    </div>

    <!-- ═══ CROSS-LINKS ═══ -->
    <div class="feature-section">
        <h2>Related Concepts</h2>
        <div class="grid-list">
            <div class="item">
                <strong><a href="/access-control">Access Control</a></strong>
                <span>The <code>progress_ticket</code>, <code>assign</code>, <code>lock</code> and <code>unlock</code> action types are all defined and gated here alongside the other 11 actions.</span>
            </div>
            <div class="item">
                <strong><a href="/folders">Folders &amp; Rendering</a></strong>
                <span>A folder's <code>workflow_shortnames</code> setting constrains which workflows tickets created there may use.</span>
            </div>
            <div class="item">
                <strong><a href="/entity-lifecycle">Entity Lifecycle</a></strong>
                <span>Tickets are created, updated and deleted through the same <code>/managed/request</code> envelope as every other entry.</span>
            </div>
        </div>
    </div>
</div>
