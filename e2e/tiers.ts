// The e2e suite's two tiers (package.json): `npm run e2e:task` runs every test without the FULL_ONLY
// tag, at the end of each task; `npm run e2e:full` runs every test, before a push to main and before
// a publish. A spec file joins the full-only set by wrapping its tests in a describe with the tag;
// src/e2eTiers.test.ts holds that set and fails if a spec file sits in neither tier.
export const FULL_ONLY = '@full-only';
