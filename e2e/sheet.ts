import { PNG } from 'pngjs';

// Contact and look sheets for the author (re-skin Task 9, stills.spec.ts): stills stitched with pngjs,
// no labels in the images. Each cell keeps its aspect; gutters are a grey a little lighter than the stage.

/** The gutter between cells, and its colour (lighter than the stage's #0B0D12, so cells read apart). */
export const GUTTER = 6;
const GUTTER_RGB = [0x2a, 0x2d, 0x35] as const;

/** A blank image of `width` x `height` in the gutter's colour (a spacer cell, too). */
export function blank(width: number, height: number): PNG {
  const out = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    out.data[i * 4] = GUTTER_RGB[0];
    out.data[i * 4 + 1] = GUTTER_RGB[1];
    out.data[i * 4 + 2] = GUTTER_RGB[2];
    out.data[i * 4 + 3] = 255;
  }
  return out;
}

/** `png` scaled to `height` px tall, its aspect kept: each output pixel the mean of the source pixels it covers (or the nearest, enlarging). */
export function toHeight(png: PNG, height: number): PNG {
  const k = png.height / height;
  const width = Math.max(1, Math.round(png.width / k));
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [x0, x1] = [Math.floor(x * k), Math.max(Math.floor(x * k) + 1, Math.floor((x + 1) * k))];
      const [y0, y1] = [Math.floor(y * k), Math.max(Math.floor(y * k) + 1, Math.floor((y + 1) * k))];
      const sum = [0, 0, 0];
      let n = 0;
      for (let sy = y0; sy < Math.min(y1, png.height); sy++)
        for (let sx = x0; sx < Math.min(x1, png.width); sx++) {
          const i = (sy * png.width + sx) * 4;
          for (let c = 0; c < 3; c++) sum[c] += png.data[i + c];
          n++;
        }
      const o = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) out.data[o + c] = Math.round(sum[c] / Math.max(1, n));
      out.data[o + 3] = 255;
    }
  return out;
}

/** `cells` side by side, top-aligned, a gutter between and round them. */
export function row(cells: readonly PNG[]): PNG {
  const height = Math.max(...cells.map((c) => c.height)) + 2 * GUTTER;
  const width = cells.reduce((w, c) => w + c.width + GUTTER, GUTTER);
  const out = blank(width, height);
  let x = GUTTER;
  for (const c of cells) {
    PNG.bitblt(c, out, 0, 0, c.width, c.height, x, GUTTER);
    x += c.width + GUTTER;
  }
  return out;
}

/** `rows` stacked, left-aligned, the sheet as wide as the widest (each already carries its gutters). */
export function stack(rows: readonly PNG[]): PNG {
  const out = blank(Math.max(...rows.map((r) => r.width)), rows.reduce((h, r) => h + r.height, 0));
  let y = 0;
  for (const r of rows) {
    PNG.bitblt(r, out, 0, 0, r.width, r.height, 0, y);
    y += r.height;
  }
  return out;
}

/** `cells` (all one size) in a grid of `cols` columns, in reading order, a gutter between and round them. */
export function grid(cells: readonly PNG[], cols: number): PNG {
  const rows: PNG[] = [];
  for (let i = 0; i < cells.length; i += cols) rows.push(row(cells.slice(i, i + cols)));
  return stack(rows);
}
