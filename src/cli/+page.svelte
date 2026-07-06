<script lang="ts">
</script>

<div class="content">
    <h1>DMART CLI</h1>
    <p class="intro">
        <code>dmart</code> is a single self-contained Native-AOT binary that is
        both the server and the CLI client. The same executable starts the
        ASP.NET Core / Kestrel HTTP server and exposes subcommands for managing
        data, applying schema migrations, seeding sample spaces, running health
        checks, and more.
    </p>

    <div class="feature-section">
        <h2>Usage</h2>
        <div class="code-container">
            <pre><code>dmart [subcommand] [options]</code></pre>
        </div>
        <p>
            With no subcommand, <code>dmart</code> prints its help. Configuration
            is resolved once at startup from
            <code>$BACKEND_ENV &rarr; ./config.env &rarr; ~/.dmart/config.env</code>,
            then overlaid with environment variables.
        </p>
    </div>

    <div class="feature-section">
        <h2>Available Commands</h2>

        <div class="step-section">
            <h3>1. serve</h3>
            <p>
                Starts the DMART HTTP server (ASP.NET Core Minimal APIs on
                Kestrel). This is the default action when a non-flag argument is
                passed.
            </p>
            <p><strong>Options:</strong></p>
            <ul>
                <li>
                    <code>--cxb-config &lt;path&gt;</code>: Path to the CXB admin
                    UI <code>config.json</code> file.
                </li>
            </ul>
            <div class="code-container">
                <pre><code>dmart serve --cxb-config my_cxb_config.json</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>2. migrate</h3>
            <p>
                Creates or updates the PostgreSQL schema without starting the
                server. Idempotent &mdash; safe to run repeatedly.
            </p>
            <div class="code-container">
                <pre><code>dmart migrate</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>3. seed</h3>
            <p>
                Seeds the bundled sample spaces and/or populates the database.
                The sample spaces are embedded in the binary, so seeding works
                standalone.
            </p>
            <p><strong>Modes:</strong></p>
            <ul>
                <li>
                    no argument: copy bundled spaces to the spaces folder <em>and</em>
                    import them into the database.
                </li>
                <li>
                    <code>files-only</code>: copy bundled spaces to the spaces
                    folder (fallback <code>~/.dmart/spaces</code>).
                </li>
                <li>
                    <code>db-only</code>: import the spaces folder into the
                    database.
                </li>
                <li>
                    <code>--force</code>: overwrite existing files / upsert
                    existing rows (default: skip both).
                </li>
            </ul>
            <div class="code-container">
                <pre><code>dmart seed
dmart seed files-only
dmart seed db-only --force</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>4. import</h3>
            <p>
                Loads a zip or folder export into the database. By default,
                existing rows are skipped (idempotent).
            </p>
            <p><strong>Options:</strong></p>
            <ul>
                <li><code>-r</code> / <code>--replace</code>: overwrite existing rows.</li>
                <li><code>--fast</code>, <code>--fast-parallelism=N</code>, <code>--batch-size=N</code>: tune throughput.</li>
                <li>
                    <code>--resume</code>: resume a crashed filesystem import from
                    a sidecar checkpoint
                    (<code>&lt;source&gt;/.dmart-import-checkpoint.json</code>).
                </li>
            </ul>
            <div class="code-container">
                <pre><code>dmart import school.zip
dmart import ./spaces --fast --replace</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>5. export</h3>
            <p>
                Exports a space to a zip archive in the DMART on-disk layout
                (<code>spaces/</code> + <code>.dm/meta.*.json</code>). This layout
                is a transfer/backup format &mdash; PostgreSQL remains the source
                of truth.
            </p>
            <p><strong>Output resolution:</strong></p>
            <ul>
                <li><code>--output</code> unset &rarr; <code>./&lt;space&gt;.zip</code></li>
                <li><code>--output .</code> &rarr; <code>./&lt;space&gt;.zip</code></li>
                <li><code>--output some/dir/</code> &rarr; <code>some/dir/&lt;space&gt;.zip</code></li>
                <li><code>--output snap.zip</code> &rarr; <code>snap.zip</code></li>
            </ul>
            <div class="code-container">
                <pre><code>dmart export school
dmart export school --output .
dmart export school --output snapshots/school.zip</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>6. preflight</h3>
            <p>
                Scans a legacy filesystem export for integrity issues (duplicate
                UUIDs, missing owners, schema-noncompliant payloads) and auto-fixes
                them before <code>dmart import</code>.
            </p>
            <div class="code-container">
                <pre><code>dmart preflight ./spaces
dmart preflight --dry-run --workers 4 ./spaces</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>7. settings</h3>
            <p>
                Prints the effective settings as JSON (secrets redacted). Shares
                its projection with <code>GET /info/settings</code> so CLI and API
                output stay in sync.
            </p>
            <div class="code-container">
                <pre><code>dmart settings</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>8. passwd</h3>
            <p>
                Sets the password for a user (Argon2-hashed). The shortname may be
                passed positionally; passwords are read from a prompt, never the
                command line.
            </p>
            <div class="code-container">
                <pre><code>dmart passwd
dmart passwd dmart</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>9. check</h3>
            <p>Runs health checks on a space.</p>
            <div class="code-container">
                <pre><code>dmart check
dmart check school hard</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>10. selfcheck</h3>
            <p>
                Smoke-tests the running HTTP surface (login + CRUD + query) against
                a live server.
            </p>
            <div class="code-container">
                <pre><code>dmart selfcheck --url http://localhost:8282 --admin dmart --password-stdin</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>11. fix-folder-rendering</h3>
            <p>
                Repairs legacy folder payload bodies to match the canonical
                <code>folder_rendering</code> schema (strips unknown fields, adds
                required-but-missing ones, widens policy arrays). Content is never
                touched. Dry-run by default; pass <code>--apply</code> to write.
            </p>
            <div class="code-container">
                <pre><code>dmart fix-folder-rendering school
dmart fix-folder-rendering school --apply</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>12. update_query_policies</h3>
            <p>
                Recomputes <code>query_policies</code> for every entry and updates
                rows whose stored value drifted (e.g. owner / is_active changed
                outside the write path).
            </p>
            <div class="code-container">
                <pre><code>dmart update_query_policies
dmart update_query_policies --batch-size 500</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>13. fix_query_policies</h3>
            <p>
                Backfills <code>entries.query_policies</code> for rows written
                before write-time population landed. Idempotent.
            </p>
            <div class="code-container">
                <pre><code>dmart fix_query_policies
dmart fix_query_policies school --dry-run</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>14. create-users-folders</h3>
            <p>
                Backfills each user's personal folders
                (<code>notifications</code>, <code>private</code>,
                <code>protected</code>, <code>public</code>, <code>inbox</code>).
                Idempotent &mdash; existing folders are left untouched.
            </p>
            <div class="code-container">
                <pre><code>dmart create-users-folders</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>15. init</h3>
            <p>
                Initializes <code>~/.dmart</code> with config files, generating a
                fresh random <code>JWT_SECRET</code>.
            </p>
            <div class="code-container">
                <pre><code>dmart init</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>16. cli</h3>
            <p>
                Interactive CLI client for talking to a running DMART server.
                Supports a REPL, a single command, or a script.
            </p>
            <div class="code-container">
                <pre><code>dmart cli
dmart cli c myspace get /myspace/folder
dmart cli s ./script.txt</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>17. version</h3>
            <p>
                Prints version and build info as JSON (version, branch, build date,
                and .NET runtime).
            </p>
            <div class="code-container">
                <pre><code>dmart version</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>18. help</h3>
            <p>Prints the list of available subcommands.</p>
            <div class="code-container">
                <pre><code>dmart help</code></pre>
            </div>
        </div>
    </div>
</div>

<style>
  .step-section h3:first-child {
    margin-top: 0;
  }
</style>
