import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Sync fence: the page's mote colour tokens (src/style.css, used by the brief's lit mote) and the
// colours the mote shader draws must be the same three colours.
const css = readFileSync('src/style.css', 'utf8');
const frag = readFileSync('src/scene/mote/shaders/mote.frag.glsl', 'utf8');

function cssTokens(): Record<string, string> {
  return Object.fromEntries(
    [...css.matchAll(/--(agent|human|dialogue):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1].toLowerCase(), m[2].toLowerCase()]),
  );
}

/** Shader constants `const vec3 NAME = vec3(r, g, b);` as #rrggbb. */
function shaderColours(): Record<string, string> {
  const hex = (c: string) => Math.round(Number(c) * 255).toString(16).padStart(2, '0');
  return Object.fromEntries(
    [...frag.matchAll(/const vec3 (HUMAN|AGENT|DIALOGUE) = vec3\(([^,]+),([^,]+),([^)]+)\)/g)].map((m) => [
      m[1].toLowerCase(),
      `#${hex(m[2])}${hex(m[3])}${hex(m[4])}`,
    ]),
  );
}

describe('mote colours', () => {
  it('are the same in the page tokens and the mote shader', () => {
    const shader = shaderColours();
    expect(Object.keys(shader).sort()).toEqual(['agent', 'dialogue', 'human']);
    expect(cssTokens()).toEqual(shader);
  });
});
