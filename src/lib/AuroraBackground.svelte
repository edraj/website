<div class="aurora" aria-hidden="true">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
  <svg class="grain" xmlns="http://www.w3.org/2000/svg">
    <filter id="aurora-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#aurora-grain)" />
  </svg>
</div>

<style>
  .aurora {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    overflow: hidden;
    contain: strict;
  }

  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.35;
    will-change: transform;
  }

  .blob-1 {
    top: -20%;
    left: -10%;
    width: 55vw;
    height: 55vw;
    background: radial-gradient(circle, var(--iri-1) 0%, transparent 70%);
  }

  .blob-2 {
    top: 10%;
    right: -15%;
    width: 60vw;
    height: 60vw;
    background: radial-gradient(circle, var(--iri-3) 0%, transparent 70%);
    opacity: 0.28;
  }

  .blob-3 {
    bottom: -25%;
    left: 10%;
    width: 65vw;
    height: 65vw;
    background: radial-gradient(circle, var(--iri-4) 0%, transparent 70%);
    opacity: 0.22;
  }

  .grain {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.04;
    mix-blend-mode: overlay;
  }

  :global(:root.dark) .blob-1 { opacity: 0.28; }
  :global(:root.dark) .blob-2 { opacity: 0.22; }
  :global(:root.dark) .blob-3 { opacity: 0.18; }
  :global(:root.dark) .grain { opacity: 0.06; }

  @media (prefers-color-scheme: dark) {
    :global(:root:not(.light)) .blob-1 { opacity: 0.28; }
    :global(:root:not(.light)) .blob-2 { opacity: 0.22; }
    :global(:root:not(.light)) .blob-3 { opacity: 0.18; }
    :global(:root:not(.light)) .grain { opacity: 0.06; }
  }

  @media (prefers-reduced-motion: no-preference) {
    .blob-1 { animation: drift-a 32s ease-in-out infinite alternate; }
    .blob-2 { animation: drift-b 40s ease-in-out infinite alternate; }
    .blob-3 { animation: drift-c 48s ease-in-out infinite alternate; }
  }

  @keyframes drift-a {
    0%   { transform: translate3d(0, 0, 0) scale(1); }
    100% { transform: translate3d(6vw, 4vw, 0) scale(1.08); }
  }

  @keyframes drift-b {
    0%   { transform: translate3d(0, 0, 0) scale(1); }
    100% { transform: translate3d(-5vw, 6vw, 0) scale(1.06); }
  }

  @keyframes drift-c {
    0%   { transform: translate3d(0, 0, 0) scale(1); }
    100% { transform: translate3d(4vw, -5vw, 0) scale(1.1); }
  }
</style>
