import os

os.chdir('/home/user/motes-of-work')
s = ''


def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b)


p = 'src/compare/compare.ts'
s = open(p).read()
rep("""/** Mote systems by mechanism and budget, built on first use and kept: switching back is instant. */
const systems = new Map<string, { motes: MoteSystem; scene: Scene }>();
function system(id: MechanismId, budget: Budget): { motes: MoteSystem; scene: Scene } {
  const key = `${id}@${budget}`;
  let s = systems.get(key);
  if (!s) {
    const motes = createMoteSystem(mechanisms[id], budget, MOTE_SEED);
    const scene = new Scene();
    scene.add(motes.object);
    s = { motes, scene };
    systems.set(key, s);
  }
  return s;
}
""", """/** Mote systems by mechanism and budget; only the current view's budget is kept alive. */
const systems = new SystemCache<MechanismId, { motes: MoteSystem; scene: Scene; dispose(): void }>((id, budget) => {
  const motes = createMoteSystem(mechanisms[id], budget, MOTE_SEED);
  const scene = new Scene();
  scene.add(motes.object);
  return {
    motes,
    scene,
    dispose() {
      scene.remove(motes.object);
      motes.dispose();
    },
  };
});

let building = false;
/**
 * Build the missing systems after the "Building" overlay has had a chance to paint (two animation
 * frames), then draw. Building 100k motes takes long enough on the CPU to want saying so.
 */
function buildThenDraw(ids: MechanismId[], budget: Budget): void {
  if (building) return;
  building = true;
  const names = ids.map((id) => mechanismMeta[id].label.toLowerCase()).join(', ');
  buildingEl.textContent = `Building ${names}, ${budget / 1000}k motes…`;
  buildingEl.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const id of ids) systems.get(id, budget);
      buildingEl.hidden = true;
      building = false;
      requestFrame();
    }),
  );
}
""")
rep("""const notice = document.getElementById('notice') as HTMLElement;
""", """const notice = document.getElementById('notice') as HTMLElement;
const buildingEl = document.getElementById('building') as HTMLElement;
""")
rep("""/** One frame: every pane at the same slider state, through the shared rig. */
function draw(now: number): void {
  if (!renderer) return;
  const settings = panel.settings();
""", """/** One frame: every pane at the same slider state, through the shared rig. */
function draw(now: number): void {
  if (!renderer) return;
  const settings = panel.settings();
  const list = panes();
  const budget = settings.budgets[settings.sideBySide ? 'grid' : 'single'];
  // A budget or view change frees the systems of every other budget.
  systems.keepOnly(budget);
  const missing = list.filter((id): id is MechanismId => id !== null && !systems.has(id, budget));
  if (missing.length > 0) {
    buildThenDraw(missing, budget);
    return;
  }
""")
rep("""  const state = currentState();
  const list = panes();
  const cols = settings.sideBySide ? 2 : 1;
  const rows = cols;
  const budget = settings.budgets[settings.sideBySide ? 'grid' : 'single'];
""", """  const state = currentState();
  const cols = settings.sideBySide ? 2 : 1;
  const rows = cols;
""")
rep("    const { motes, scene } = system(id, budget);", "    const { motes, scene } = systems.get(id, budget);")
rep("""    frames: () => frameCount,
  };""", """    frames: () => frameCount,
    systems: () => systems.keys(),
  };""")
rep("""  /** Frames rendered so far. */
  frames(): number;
}""", """  /** Frames rendered so far. */
  frames(): number;
  /** Live mote systems, `<id>@<budget>`. */
  systems(): string[];
}""")
rep("import { BUDGETS, createPanel", "import { SystemCache } from './systemCache';\nimport { BUDGETS, createPanel")
open(p, 'w').write(s)

p = 'src/compare/compare.html'
s = open(p).read()
rep("""      <p id="notice" hidden></p>""", """      <p id="building" role="status" hidden></p>
      <p id="notice" hidden></p>""")
open(p, 'w').write(s)
print('ok')
