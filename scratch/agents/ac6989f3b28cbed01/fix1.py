import os
os.chdir('.')
s = ''


def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b)


p = 'src/compare/controls.ts'
s = open(p).read()
rep("""    input.addEventListener('input', () => {
      s.sliders[def.path] = Number(input.value);
      out.textContent = fmt(s.sliders[def.path]);
      changed();""", """    input.addEventListener('input', () => {
      s.sliders[def.path] = Number(input.value);
      out.textContent = fmt(s.sliders[def.path]);
      s.preset = null; // the state is no longer the preset's
      syncPreset();
      changed();""")
rep("""    play.textContent = s.playing ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', String(s.playing));
""", """    play.textContent = s.playing ? 'Pause' : 'Play'; // the label says what a click does
""")
rep("""  // Presets.
  const presets = PRESETS.map((p) => {
    const b = el('button', { type: 'button', className: 'preset', textContent: p.name });
    b.addEventListener('click', () => {
      s.sliders = { ...p.values };
      showSliders();
      changed();
    });
    return b;
  });
""", """  // Presets: the last one clicked stays marked (until a slider moves), with its description below.
  const presetBlurb = el('p', { className: 'preset-blurb' });
  const presets = PRESETS.map((p) => {
    const b = el('button', { type: 'button', className: 'preset', textContent: p.name });
    b.addEventListener('click', () => {
      s.sliders = { ...p.values };
      s.preset = p.name;
      showSliders();
      syncPreset();
      changed();
    });
    return b;
  });
  function syncPreset(): void {
    presets.forEach((b, i) => b.setAttribute('aria-pressed', String(PRESETS[i].name === s.preset)));
    const chosen = PRESETS.find((p) => p.name === s.preset);
    presetBlurb.textContent = chosen
      ? `${chosen.name}: ${chosen.blurb[0].toLowerCase()}${chosen.blurb.slice(1)}`
      : 'Custom state. A preset sets every slider at once.';
  }
""")
rep("""  const machine = group('Machine');
  machine.append(playRow);
""", """  const heading = (name: SliderGroup): HTMLElement[] => [
    el('h2', {}, name),
    el('p', { className: 'group-hint' }, GROUP_HINTS[name]),
  ];
  const machine = group('Machine');
  machine.append(playRow);
""")
rep("""    el('div', { className: 'presets' }, ...presets),
    el('h2', {}, 'Machine'),
    machine,
    el('h2', {}, 'Provenance'),
    group('Provenance'),
    el('h2', {}, 'Faults'),
    group('Faults', 'two'),
  );
  syncPicker();""", """    el('div', { className: 'presets' }, ...presets),
    presetBlurb,
    ...heading('Machine'),
    machine,
    ...heading('Provenance'),
    group('Provenance'),
    ...heading('Faults'),
    group('Faults', 'two'),
  );
  syncPicker();
  syncPreset();""")
rep("""  sideBySide: boolean;
  /** Motes per machine""", """  sideBySide: boolean;
  /** Name of the preset the sliders hold, or null once a slider has been moved by hand. */
  preset: string | null;
  /** Motes per machine""")
open(p, 'w').write(s)

p = 'src/compare/compare.ts'
s = open(p).read()
rep("""    sideBySide: false,
    budgets""", """    sideBySide: false,
    preset: PRESETS[0].name,
    budgets""")
open(p, 'w').write(s)

p = 'src/compare/compare.html'
s = open(p).read()
rep(' aria-hidden="false"', '')
open(p, 'w').write(s)
print('ok')
