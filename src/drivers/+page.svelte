<script lang="ts">
  let copiedCommand = $state<string | null>(null);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      copiedCommand = text;
      setTimeout(() => {
        copiedCommand = null;
      }, 2000);
    });
  }
</script>

<div class="content">
  <h1>Drivers & SDKs</h1>
  <p class="intro">Integrate DMART with official client libraries.</p>

  <div class="feature-section">
    <h2>Python</h2>
    <div class="grid-list">
      <div class="item">
        <strong>pydmart</strong>
        <span>Official Python client.</span>
        <div class="code-container">
          <div class="code-block">pip install pydmart</div>
          <button class="copy-btn" onclick={() => copyToClipboard('pip install pydmart')} aria-label="Copy command">
            {#if copiedCommand === 'pip install pydmart'}
              ✓
            {:else}
              📋
            {/if}
          </button>
        </div>
        <a href="https://pypi.org/project/pydmart/" target="_blank" rel="noopener noreferrer">PyPI &rarr;</a>
      </div>
      <div class="item">
        <strong>dmart</strong>
        <span>Core package & CLI.</span>
        <div class="code-container">
          <div class="code-block">pip install dmart</div>
          <button class="copy-btn" onclick={() => copyToClipboard('pip install dmart')} aria-label="Copy command">
            {#if copiedCommand === 'pip install dmart'}
              ✓
            {:else}
              📋
            {/if}
          </button>
        </div>
        <a href="https://pypi.org/project/dmart/" target="_blank" rel="noopener noreferrer">PyPI &rarr;</a>
      </div>
    </div>
  </div>

  <div class="feature-section">
    <h2>TypeScript / JavaScript</h2>
    <div class="grid-list">
      <div class="item">
        <strong>@edraj/tsdmart</strong>
        <span>Fully typed client for Node, Deno, Bun, and browsers.</span>
        <div class="code-container">
          <div class="code-block">npm install @edraj/tsdmart</div>
          <button class="copy-btn" onclick={() => copyToClipboard('npm install @edraj/tsdmart')} aria-label="Copy command">
            {#if copiedCommand === 'npm install @edraj/tsdmart'}
              ✓
            {:else}
              📋
            {/if}
          </button>
        </div>
        <a href="https://www.npmjs.com/package/@edraj/tsdmart" target="_blank" rel="noopener noreferrer">NPM &rarr;</a>
      </div>
    </div>
  </div>

  <div class="feature-section">
    <h2>Dart / Flutter</h2>
    <div class="grid-list">
      <div class="item">
        <strong>dmart</strong>
        <span>Native Dart package for cross-platform apps.</span>
        <div class="code-container">
          <div class="code-block">flutter pub add dmart</div>
          <button class="copy-btn" onclick={() => copyToClipboard('flutter pub add dmart')} aria-label="Copy command">
            {#if copiedCommand === 'flutter pub add dmart'}
              ✓
            {:else}
              📋
            {/if}
          </button>
        </div>
        <a href="https://pub.dev/packages/dmart" target="_blank" rel="noopener noreferrer">pub.dev &rarr;</a>
      </div>
    </div>
  </div>
</div>

<style>
  .grid-list {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .item {
    gap: 0.5rem;
  }

  .code-container {
    display: flex;
    align-items: center;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .code-block {
    padding: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    white-space: nowrap;
    overflow-x: auto;
    flex-grow: 1;
    border-right: 1px solid var(--border-color);
  }

  .copy-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    font-size: 1rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s, background-color 0.2s;
    min-width: 40px;
  }

  .copy-btn:hover {
    color: var(--text-main);
    background-color: var(--accent-light);
  }

  a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 700;
    font-size: 0.85rem;
    margin-top: auto;
    display: inline-block;
    transition: opacity 0.2s;
  }

  a:hover {
    text-decoration: underline;
    opacity: 0.85;
  }
</style>
