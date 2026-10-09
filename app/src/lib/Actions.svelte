<script>
  import { safeHref, isExternal } from "./site.js";

  let { actions = [] } = $props();
</script>

{#if actions.length > 0}
  <div class="actions">
    {#each actions as a}
      <a class="btn btn-{a.style}" href={safeHref(a.href)} rel={isExternal(a.href) ? "noopener" : undefined}>{a.label}</a>
    {/each}
  </div>
{/if}
