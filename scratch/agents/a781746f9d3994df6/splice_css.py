import sys
p='src/style.css'
s=open(p).read()
a=s.index("/*\n * Auto-advance (src/autoAdvance/indicator.ts)")
b=s.index("/* Credits */")
s=s[:a]+open(sys.argv[1]).read()+s[b:]
old="""/*
 * Footer: out of flow at the very bottom of the page, inside the trailing spacer, so it never
 * changes the scroll range. Quiet until focused or hovered.
 */
#site-footer {
  position: absolute;
  right: var(--gutter);"""
new="""/*
 * Footer: out of flow at the very bottom of the page, inside the trailing spacer, so it never
 * changes the scroll range. Quiet until focused or hovered. Bottom left, clear of the auto-advance
 * ring in the bottom-right corner.
 */
#site-footer {
  position: absolute;
  left: var(--gutter);"""
assert old in s
s=s.replace(old,new)
open(p,'w').write(s)
