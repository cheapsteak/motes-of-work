// Reads ?view=desktop|portrait&moment=brief|reveal, sets the stage frame and fills the panel.
// The brief shows the reordered lines (seat+handlebars first); the first two are met, as at
// story progress 0.08 (saddle, bars and both wheels settled; fork, brakes and frame still loose).
(function () {
  const q = new URLSearchParams(location.search);
  const view = q.get('view') === 'portrait' ? 'portrait' : 'desktop';
  const moment = q.get('moment') === 'reveal' ? 'reveal' : 'brief';
  document.body.dataset.view = view;
  document.body.dataset.moment = moment;

  const FRAMES = '../mobile/';
  const frame = moment === 'brief' ? 'desktop-0.08.png' : 'desktop-0.42.png';
  const stage = document.getElementById('stage');
  const url = `url(${FRAMES}${frame})`;
  stage.style.setProperty('--frame', url);
  if (view === 'desktop') {
    stage.style.backgroundImage = url;
    const patch = document.createElement('div'); patch.id = 'patch'; stage.append(patch);
  }
  else {
    // Crop geometry of the desktop frame's bike half (1280x800 source), see shared.css.
    const crop = moment === 'brief'
      ? { x0: 600, w: 680, cy: 380, target: 0.33 }
      : { x0: 600, w: 680, cy: 405, target: 0.34 };
    const s = 390 / crop.w; // scale so the crop fills the portrait width
    const h = Math.round(800 * s);
    const top = Math.round(crop.target * window.innerHeight - crop.cy * s);
    stage.style.setProperty('--crop-x', `${-Math.round(crop.x0 * s)}px`);
    stage.style.setProperty('--crop-h', `${h}px`);
    stage.style.setProperty('--crop-top', `${top}px`);
  }

  const BRIEF = `
    <p class="run">01 &mdash; The brief</p>
    <p>You hand an agent a brief. It looks complete.</p>
    <div class="brief">
      <p class="brief-ask">Build me a bike for getting around town.</p>
      <ul class="brief">
        <li data-met>A comfy seat and a set of handlebars, both adjustable so it fits people of different heights.</li>
        <li data-met>Two wheels, with the pedals driving the back one through a chain.</li>
        <li>The front wheel turns so you can steer.</li>
        <li>Hand brakes and a bell.</li>
        <li>Sturdy, but light enough to carry up a flight of stairs.</li>
      </ul>
    </div>
    <p>The swarm floods in. Every requirement is met.</p>`;

  const REVEAL = `
    <p class="run">02 &mdash; It runs</p>
    <p>It runs. It passes every test you wrote: pedal, and it moves; turn the front wheel, and it steers.</p>
    <p>Now try to ride it. The seat is on the steering column. The handlebars stick out of the seat tube. Nothing in it is warm: no person touched the parts that meet a person.</p>
    <p>Every line is met. Nobody wrote down that you sit on the seat and steer with the handlebars, because nobody would think to.</p>`;

  document.querySelector('.panel').innerHTML = moment === 'brief' ? BRIEF : REVEAL;
})();
