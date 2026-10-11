def edit(p, pairs):
    s = open(p).read()
    for old, new in pairs:
        assert old in s, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w").write(s)


edit(
    "/home/user/mow-compare/src/compare/controls.ts",
    [
        (
            """  preset('Exploded', 'Mid-assembly: parts hang just off their places, against the ghost of the finished machine.', {""",
            """  preset('Exploded', "Mid-assembly: parts hang just off their places, against the finished machine's ghost.", {""",
        ),
        (
            """  preset('Faults 0.6', 'Every fault at 0.6 (jitter 0.25): the machine malfunctions against the ghost of its intent.', {""",
            """  preset('Faults 0.6', 'Every fault at 0.6 but jitter (0.25): the machine malfunctions against its ghost.', {""",
        ),
        (
            """  initial: PanelSettings;
  /** Anything the author changed""",
            """  initial: PanelSettings;
  /** Where the budget selector goes: the panel header, beside the page title. */
  header: HTMLElement;
  /** Anything the author changed""",
        ),
        (
            """  root.append(
    el(
      'div',
      { className: 'heading-row' },
      el('h2', {}, 'Mechanism'),
      el('label', { htmlFor: 'budget', className: 'sr-only' }, 'Motes per machine'),
      budget,
    ),
    picker,""",
            """  opts.header.append(el('label', { htmlFor: 'budget', className: 'sr-only' }, 'Motes per machine'), budget);
  root.append(
    picker,""",
        ),
    ],
)
edit(
    "/home/user/mow-compare/src/compare/compare.ts",
    [
        (
            """  onChange,
  onResetView: resetView,
});""",
            """  header: document.querySelector('#panel header') as HTMLElement,
  onChange,
  onResetView: resetView,
});""",
        ),
    ],
)
edit(
    "/home/user/mow-compare/src/compare/compare.css",
    [
        (
            """/* The Mechanism heading, with the one budget selector at its right. */
.heading-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 4px;
}

.heading-row h2 {
  margin-bottom: 3px;
}

.heading-row select {
  padding: 1px 4px;
}
""",
            """/* The page title, with the one budget selector at its right. */
#panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

#panel header select {
  padding: 1px 4px;
}
""",
        ),
    ],
)
