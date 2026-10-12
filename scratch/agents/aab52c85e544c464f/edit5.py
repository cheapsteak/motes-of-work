p = '<mow-compare checkout>/src/compare/controls.ts'
s = open(p).read()
def rep(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)
rep("""  const pickButtons = opts.ids.map((id) =>
    el('button', { type: 'button', className: 'pick', textContent: opts.meta[id].label, title: opts.meta[id].blurb }),
  );""", """  // Buttons show the label's first word ("Steam", "Watch") so the four fit one line; the title says the rest.
  const pickButtons = opts.ids.map((id) =>
    el('button', {
      type: 'button',
      className: 'pick',
      textContent: opts.meta[id].label.split(' ')[0],
      title: `${opts.meta[id].label}: ${opts.meta[id].blurb}`,
    }),
  );""")
rep("""  root.append(
    el('h2', {}, 'Mechanism'),
    picker,
    blurb,
    el(
      'div',
      { className: 'row toggles' },
      el('div', { className: 'views', role: 'radiogroup', ariaLabel: 'View' }, ...viewRadios),
      el('label', { htmlFor: 'budget', className: 'sr-only' }, 'Motes per machine'),
      budget,
    ),""", """  root.append(
    el(
      'div',
      { className: 'heading-row' },
      el('h2', {}, 'Mechanism'),
      el('label', { htmlFor: 'budget', className: 'sr-only' }, 'Motes per machine'),
      budget,
    ),
    picker,
    blurb,
    el('div', { className: 'views', role: 'radiogroup', ariaLabel: 'View' }, ...viewRadios),""")
open(p, 'w').write(s)

p = '<mow-compare checkout>/src/compare/compare.css'
s = open(p).read()
rep("""h2 {
  margin: 9px 0 2px;""", """h2 {
  margin: 7px 0 2px;""")
rep(""".toggles {
  display: flex;
  gap: 6px;
  align-items: center;
}

.views {
  display: flex;
  gap: 9px;
}
""", """/* The Mechanism heading, with the one budget selector at its right. */
.heading-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 4px;
}

.heading-row select {
  padding: 1px 4px;
}

.views {
  display: flex;
  gap: 12px;
  min-height: 20px;
}
""")
rep(""".toggles select {
  margin-left: auto;
}

.toggles .check {
  overflow: visible;
}
""", "")
rep("""  min-height: 2.7em;
  margin: 5px 0 0;
  padding-left: 8px;""", """  min-height: 2.7em;
  margin: 5px 0 0;
  padding-left: 8px;
  font-size: 12px;""")
open(p, 'w').write(s)
