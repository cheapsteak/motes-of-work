p = '<mow-compare checkout>/src/compare/compare.css'
s = open(p).read()
def rep(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)
rep(""".preset-blurb {
  min-height: 2.7em;
  margin: 4px 0 0;
}
""", """/* Set off from the mechanism blurb: a rule at the left and the text one step brighter. */
.preset-blurb {
  min-height: 2.7em;
  margin: 5px 0 0;
  padding-left: 8px;
  border-left: 2px solid rgba(255, 179, 71, 0.5);
  color: #c3bdd6;
}
""")
rep(""".picker button {
  padding: 4px 2px;
}
""", """.picker button {
  padding: 4px 2px;
}

/* Side by side: every mechanism is on screen, so none is picked and all read as shown. */
.picker.all button:disabled {
  opacity: 1;
  color: var(--accent);
  border-color: rgba(255, 179, 71, 0.45);
  background: transparent;
}

.cameras {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cameras button {
  padding: 3px 6px;
}

.cameras .quiet {
  margin-left: auto;
}
""")
rep(""".play-row {
  grid-template-columns: 84px 44px 1fr 44px;
  margin-top: 2px;
}

.toggles {
  display: flex;
  gap: 6px;
}
""", """.play-row {
  grid-template-columns: 52px 46px 46px auto 1fr 40px;
  margin-top: 2px;
}

.play-row .nudge {
  padding: 3px 0;
  font-variant-numeric: tabular-nums;
}

/* Sliders that Twin pair sets per pane. */
.row.overridden {
  opacity: 0.4;
}

.toggles {
  display: flex;
  gap: 6px;
  align-items: center;
}

.views {
  display: flex;
  gap: 9px;
}
""")
rep(""".toggles .quiet {
  margin-left: auto;
  white-space: nowrap;
}
""", """.toggles select {
  margin-left: auto;
}
""")
rep("""#panes.grid {
  grid-template: 1fr 1fr / 1fr 1fr;
}
""", """#panes.twin {
  grid-template: 1fr / 1fr 1fr;
}

#panes.grid {
  grid-template: 1fr 1fr / 1fr 1fr;
}
""")
rep("""#panes.grid .pane {""", """#panes.twin .pane,
#panes.grid .pane {""")
rep("""/* Credits */""", """/* Lighting (dev), ?dev=1 only */

details.dev {
  margin-top: 8px;
}

details.dev summary {
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.dev-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.dev-status {
  color: var(--muted);
}

.dev-json {
  width: 100%;
  height: 12em;
  margin-top: 4px;
  box-sizing: border-box;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--edge);
  font: 12px/1.3 ui-monospace, monospace;
}

/* Credits */""")
open(p, 'w').write(s)
