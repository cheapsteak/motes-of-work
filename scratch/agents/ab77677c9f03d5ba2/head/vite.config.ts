import { defineConfig } from 'vite';

// Config runs in Node; `types` is pinned to vite/client so declare just what we use.
declare const process: { env: Record<string, string | undefined> };

// `?raw` imports of .glsl / .md files work natively in Vite; their module types
// are declared in src/env.d.ts.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    rolldownOptions: {
      // Multi-page: each page keeps its path relative to the root in dist/.
      input: {
        main: 'index.html',
        parity: 'src/parity/parity.html',
        compare: 'src/compare/compare.html',
        spikesIndex: 'src/spikes/index.html',
        spikesFill: 'src/spikes/fill.html',
        spikesVertex: 'src/spikes/vertex.html',
        spikesFloattex: 'src/spikes/floattex.html',
        spikesCaps: 'src/spikes/caps.html',
      },
    },
  },
});
