import type { MechanismId } from './index';
import { blurb as bikeBlurb, label as bikeLabel } from './bike';
import { blurb as gearsBlurb, label as gearsLabel } from './gears';
import { blurb as steamBlurb, label as steamLabel } from './steam';
import { blurb as strandbeestBlurb, label as strandbeestLabel } from './strandbeest';
import { blurb as watchBlurb, label as watchLabel } from './watch';

export interface MechanismMeta {
  /** Display name, sentence case. */
  label: string;
  /** One sentence: what the machine is and what its wrong twin does. */
  blurb: string;
}

/**
 * Names and one-line descriptions for the comparison page, read from each mechanism module's
 * `label` and `blurb` exports. Keyed by the registry, so registering a mechanism without adding it
 * here fails the type check (and meta.test.ts).
 */
export const mechanismMeta: Record<MechanismId, MechanismMeta> = {
  bike: { label: bikeLabel, blurb: bikeBlurb },
  gears: { label: gearsLabel, blurb: gearsBlurb },
  steam: { label: steamLabel, blurb: steamBlurb },
  strandbeest: { label: strandbeestLabel, blurb: strandbeestBlurb },
  watch: { label: watchLabel, blurb: watchBlurb },
};
