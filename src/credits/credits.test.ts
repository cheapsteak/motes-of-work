import { describe, expect, it } from 'vitest';
import { creditsHtml } from './credits';

describe('credits', () => {
  it('carries the notice of every ported source and shipped library and font', () => {
    const html = creditsHtml();
    expect(html).toContain('BSD 2-Clause License');
    expect(html).toContain('Copyright (c) 2017-2019, Revar Desmera');
    expect(html).toContain('Copyright © 2010-2026 three.js authors');
    expect(html).toContain('Copyright (c) 2018+, MarkedJS');
    expect(html).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(html).toContain('Copyright 2017 The Literata Project Authors');
    expect(html).toContain('Copyright 2022 The Instrument Serif Project Authors');
  });
});
