p = '/home/user/motes-of-work/vite.config.ts'
s = open(p).read()
old_head = """import { defineConfig } from 'vite';

// Config runs in Node; `types` is pinned to vite/client so declare just what we use.
declare const process: { env: Record<string, string | undefined> };

// `?raw` imports of .glsl / .md files work natively in Vite; their module types
// are declared in src/env.d.ts.
export default defineConfig({
"""
new_head = """import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { parseSection } from './src/story/loader';
import { storyMarkup } from './src/story/markup';

// Config runs in Node; `types` is pinned to vite/client so declare just what we use.
declare const process: { env: Record<string, string | undefined> };

const STORY_DIR = new URL('./src/story/', import.meta.url);
const STORY_SLOT = '<main id="story"></main>';

/**
 * Writes the story into the essay's page at build (and dev) time, from the same markdown and the
 * same markup the bundle checks it against (src/story/dom.ts), so the essay reads as a plain
 * document without JavaScript. Sections in filename order, as `loadStory` reads them.
 */
function prerenderStory(): Plugin {
  return {
    name: 'prerender-story',
    transformIndexHtml(html) {
      if (!html.includes(STORY_SLOT)) return html;
      const story = readdirSync(STORY_DIR)
        .filter((f) => f.endsWith('.md'))
        .sort()
        .map((f) => parseSection(readFileSync(new URL(f, STORY_DIR), 'utf8'), f));
      return html.replace(STORY_SLOT, `<main id="story">\\n${storyMarkup(story)}\\n</main>`);
    },
    configureServer(server) {
      // The page carries the story, so a copy edit needs the page itself reloaded, not just the bundle.
      server.watcher.on('change', (file) => {
        if (/[\\\\/]src[\\\\/]story[\\\\/][^\\\\/]+\\.md$/.test(file)) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

// `?raw` imports of .glsl / .md files work natively in Vite; their module types
// are declared in src/env.d.ts.
export default defineConfig({
  plugins: [prerenderStory()],
"""
assert s.count(old_head) == 1
s = s.replace(old_head, new_head)
open(p, 'w').write(s)

p = '/home/user/motes-of-work/index.html'
s = open(p).read()
s = s.replace('<html lang="en">', '<html lang="en" class="no-js">')
s = s.replace("""    <title>Motes of work</title>
""", """    <title>Motes of work</title>
    <script>
      // The first script: with JavaScript the story is driven by scroll; without it, it is a plain document.
      document.documentElement.classList.remove('no-js');
    </script>
""")
open(p, 'w').write(s)
print('ok')
