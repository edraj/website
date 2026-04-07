<script lang="ts">
</script>

<div class="content">
    <h1>DMART CLI</h1>
    <p class="intro">
        The <code>dmart</code> script is the primary entry point for managing the
        DMART backend. It provides commands for running the server, interacting
        via CLI, managing data, performing migrations, and more.
    </p>

    <div class="feature-section">
        <h2>Usage</h2>
        <div class="code-container">
            <pre><code>dmart &lt;command&gt; [arguments]</code></pre>
        </div>
    </div>

    <div class="feature-section">
        <h2>Available Commands</h2>

        <div class="step-section">
            <h3>1. serve</h3>
            <p>Starts the DMART FastAPI backend server using Hypercorn.</p>
            <p><strong>Options:</strong></p>
            <ul>
                <li>
                    <code>--open-cxb</code>: Opens the CXB page in the browser after
                    the server starts.
                </li>
                <li>
                    <code>--dmart-config &lt;path&gt;</code>: Path to
                    <code>config.env</code> file.
                </li>
                <li>
                    <code>--cxb-config &lt;path&gt;</code>: Path to CXB
                    <code>config.json</code> file.
                </li>
            </ul>
            <div class="code-container">
                <pre><code>dmart serve --open-cxb --dmart-config my_custom_config.env</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>2. hyper</h3>
            <p>
                Starts the application using Hypercorn with full access to its
                command-line arguments.
            </p>
            <p><strong>Options:</strong></p>
            <ul>
                <li>
                    Accepts all standard <code>hypercorn</code> arguments (-b, -w,
                    --certfile, --keyfile).
                </li>
                <li><code>--open-cxb</code>: Opens CXB page in browser.</li>
            </ul>
            <div class="code-container">
                <pre><code>dmart hyper -b 0.0.0.0:8000 -w 4</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>3. cli</h3>
            <p>
                Starts the interactive shell/CLI for communicating with the DMART
                backend.
            </p>
            <div class="code-container">
                <pre><code>dmart cli
dmart cli --config my_cli_config.ini</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>4. ws</h3>
            <p>Starts the standalone WebSocket server.</p>
            <div class="code-container">
                <pre><code>dmart ws --dmart-config prod_config.env</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>5. wt</h3>
            <p>Starts the standalone WebTransporter server.</p>
            <div class="code-container">
                <pre><code>dmart wt</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>6. export</h3>
            <p>Exports data from the database into a JSON-based ZIP archive.</p>
            <p><strong>Options:</strong></p>
            <ul>
                <li>
                    <code>--space_name &lt;name&gt;</code>: Specific space to export
                    (optional).
                </li>
                <li>
                    <code>--output &lt;path&gt;</code>: Output path for the ZIP file.
                </li>
            </ul>
            <div class="code-container">
                <pre><code>dmart export --output all_spaces.zip
dmart export --space_name school --output .
dmart export --space_name school --output school.zip</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>7. import</h3>
            <p>Imports data from a ZIP archive or directory into the database.</p>
            <div class="code-container">
                <pre><code>dmart import school.zip</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>8. settings</h3>
            <p>Prints the current application settings as formatted JSON.</p>
            <div class="code-container">
                <pre><code>dmart settings</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>9. set_password</h3>
            <p>Sets or updates an administrator password securely.</p>
            <div class="code-container">
                <pre><code>dmart set_password</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>10. migrate</h3>
            <p>Executes Alembic database migrations.</p>
            <div class="code-container">
                <pre><code>dmart migrate</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>11. init</h3>
            <p>
                Initializes the DMART environment by copying sample spaces to
                <code>~/.dmart/spaces</code>.
            </p>
            <div class="code-container">
                <pre><code>dmart init</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>12. update_query_policies</h3>
            <p>Updates query policies in the SQL database.</p>
            <div class="code-container">
                <pre><code>dmart update_query_policies</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>13. apply_plugin_config</h3>
            <p>
                Reads <code>~/.dmart/plugins_config.json</code> and patches plugin
                configurations.
            </p>
            <div class="code-container">
                <pre><code>dmart apply_plugin_config</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>14. info</h3>
            <p>Prints detailed version information as formatted JSON.</p>
            <div class="code-container">
                <pre><code>dmart info</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>15. version</h3>
            <p>Prints the current Git tag of the application.</p>
            <div class="code-container">
                <pre><code>dmart version</code></pre>
            </div>
        </div>

        <div class="step-section">
            <h3>16. help</h3>
            <p>Prints the list of available commands.</p>
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
