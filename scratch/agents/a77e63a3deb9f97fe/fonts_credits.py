import os
os.chdir('.')
fonts = """/*
 * Self-hosted type (SIL Open Font License 1.1; notices in CREDITS.md). Vite fingerprints the files
 * and rewrites these urls, relative to the built stylesheet under BASE_PATH=./, so nothing is
 * fetched from the network. A browser fetches a face only when text is set in it.
 */
@font-face {
  font-family: 'Literata';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(./literata-400.woff) format('woff');
}

@font-face {
  font-family: 'Literata';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url(./literata-400-italic.woff) format('woff');
}

@font-face {
  font-family: 'Instrument Serif';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url(./instrument-serif-400-italic.woff) format('woff');
}
"""
open('src/fonts/fonts.css', 'w').write(fonts)

p = 'CREDITS.md'
s = open(p).read()
a = s.index("The typefaces ship, unmodified")
b = s.index("```\nSIL OPEN FONT LICENSE")
s = s[:a] + """The typefaces ship, unmodified, as WOFF files in the essay (`src/fonts/`), under the SIL Open Font
License 1.1, whose text follows the notices.

- Literata (regular and italic): the essay's text.
  `Copyright 2017 The Literata Project Authors (https://github.com/googlefonts/literata)`
- Instrument Serif (italic): the ask of the brief.
  `Copyright 2022 The Instrument Serif Project Authors (https://github.com/Instrument/instrument-serif)`

""" + s[b:]
open(p, 'w').write(s)

p = 'src/credits/credits.test.ts'
s = open(p).read()
for l in [
    "    expect(html).toContain('Copyright 2020 The Newsreader Project Authors');\n",
    "    expect(html).toContain('Copyright 2024 The Geist Project Authors');\n",
    "    expect(html).toContain('Copyright 2019 IBM Corp.');\n",
]:
    assert l in s
    s = s.replace(l, '')
open(p, 'w').write(s)
