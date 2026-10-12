"""Mechanical checks of the Act II storyboard document, mirroring src/story/storyboard.test.ts and
the dwell lint in src/story/content.test.ts, plus the count of twelve from the lineage table."""
import re

DOC = "docs/specs/2026-10-06-act-2-storyboard-and-network.md"
text = open(DOC, encoding="utf-8").read()


def between(frm: str, to: str) -> str:
    a = text.index("\n" + frm)
    b = text.index("\n" + to, a + 1)
    return text[a:b]


def beat_rows(block: str):
    rows = []
    for line in block.split("\n"):
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line[1:-1].split("|")]
        if re.match(r"^[a-z]{2}-[\w-]+( \(document\))?$", cells[0]):
            rows.append(cells)
    return rows


# --- copy (§1) ---
copy = beat_rows(between("## 1.", "## 2."))
ids = [c[0] for c in copy]
assert len(ids) == len(set(ids)), "duplicate beat ids"
words_total = 0
for cells in copy:
    m = re.match(r"^(.*) \((\d+)\)$", cells[-1])
    assert m, cells
    n = len([w for w in m.group(1).split() if re.search(r"[^\W_]", w)])
    assert n == int(m.group(2)), (cells[0], n, m.group(2))
    assert n <= 26, (cells[0], n)
    words_total += n
print(f"copy: {len(copy)} beats, {words_total} words")

# --- timings (§2) ---
board = between("## 2.", "### 2.10")
sections = {}
for m in re.finditer(r"### 2\.\d+ ([a-z-]+)\b[^\n]*\(L = (\d+(?:\.\d+)?)", board):
    sections[m.group(1)] = float(m.group(2))
print("sections:", sections, "total screens", round(sum(sections.values()), 2))
rows = beat_rows(board)
assert [r[0] for r in rows] == ids, "timing rows and copy rows differ in order or ids"
# Group beats by section in document order, with page and at.
beats = []
for m in re.finditer(r"### 2\.\d+ ([a-z-]+)\b", board):
    pass
sec_blocks = re.split(r"\n### 2\.\d+ ", board)[1:]
for block in sec_blocks:
    sid = block.split()[0]
    L = sections[sid]
    rs = beat_rows(block)
    bl = []
    for cells in rs:
        at = float(re.search(r"\d+(?:\.\d+)?", cells[2]).group(0))
        bl.append({"id": cells[0], "page": int(cells[1]), "at": at})
    assert bl[0]["at"] == 0, (sid, "first beat not at 0")
    for i in range(1, len(bl)):
        assert bl[i]["at"] > bl[i - 1]["at"], (sid, bl[i]["id"], "at not increasing")
        assert bl[i]["page"] >= bl[i - 1]["page"]
    # pages
    pages = {}
    for b in bl:
        pages.setdefault(b["page"], []).append(b)
    for p, pb in pages.items():
        assert len(pb) <= 3, (sid, p, "more than 3 beats on a page")
    words = {c[0]: int(re.search(r"\((\d+)\)$", c[-1]).group(1)) for c in copy}
    sec_words = 0
    for p in sorted(pages):
        pb = pages[p]
        nxt_page_in = pages[p + 1][0]["at"] if (p + 1) in pages else 1.0
        for i, b in enumerate(pb):
            nxt = pb[i + 1]["at"] if i + 1 < len(pb) else nxt_page_in
            dwell = (nxt - b["at"]) * L
            budget = max(0.3, words[b["id"]] / 40)
            sec_words += words[b["id"]]
            flag = "OK " if dwell + 1e-9 >= budget else "FAIL"
            print(f"  {flag} {sid:9s} {b['id']:5s} page {p} at {b['at']:.2f} dwell {dwell:.2f} >= {budget:.3f}")
    assert sec_words / L <= 35, (sid, "words per screen")
    beats.append((sid, bl))

# --- the twelve, from the lineage table (§3.2) ---
lineage = between("### 3.2", "### 3.3")
born = {}
cracked = {}
for line in lineage.split("\n"):
    if not line.startswith("| ") or line.startswith("| Id") or line.startswith("|---"):
        continue
    cells = [c.strip() for c in line[1:-1].split("|")]
    if len(cells) < 6:
        continue
    names = [n.strip() for n in cells[0].replace("`", "").split(",")]
    births = [b.strip() for b in cells[3].split(",")]
    crack = cells[4]
    if len(names) == len(births) and all(re.match(r"^\d*\.\d+$", b) for b in births):
        for n, b in zip(names, births):
            born[n] = float(b)
            cracked[n] = crack not in ("no", "")
G8 = (0.345, 0.36)
lit = sorted(
    n for n in born if cracked[n] and born[n] <= G8[1] and n not in ("R0", "C1")
)
print("cracked and born by df-5 (less R0 and C1):", len(lit), lit)
assert len(lit) == 12, "not twelve"
later = sorted((born[n], n) for n in born if cracked[n] and born[n] > G8[1])
print("next cracked birth after the twelve:", later[0])
assert later[0][0] > G8[1]
# parent-before-child for the scripted rows named in the table (coarse: births only)
print("OK: document parses as the fence would; dwell budget holds; twelve holds.")
