p = '<scratchpad>/pub/motes-of-work.html'
s = open(p).read()
s = s.replace(
    'Particles assemble a machine: <strong>warm motes</strong> are what a person specified, <strong>cool motes</strong> are what agents filled in. Act I builds a bicycle from a brief that looks complete, and gets it confidently, unrideably wrong.',
    'Told like a picture book. Particles assemble a bicycle: <strong>blue dots</strong> are the agent\'s work, <strong>gold dots</strong> are where a person looked closely. Act I builds a bike from a list that looks complete, gets it confidently, unrideably wrong, then starts again with a drawing first.',
)
s = s.replace(
    'Act I in four sections: the brief and the build, the reveal, the rewind, and the spec. Scroll slowly; scroll back to rewind.',
    'Act I, about 17 screens: the list and the build, the reveal, taking it apart, and starting again. Each line appears when it is its turn; scroll slowly, and back to rewind.',
)
start = s.index('      <li><strong>The brief lights up')
end = s.index('      <li>On the bench, try')
s = s[:start] + '''      <li><strong>The list lights up line by line as the bike builds,</strong> and the camera goes to each part as its line lights: the chain, the front wheel turning, the brakes.</li>
      <li><strong>The reveal.</strong> The seat sits on top of the steering post over the basket and turns with the wheel; the handlebars stick out at the back. The frame is built around the mistake.</li>
      <li><strong>Starting again.</strong> The agent draws the bike first, in white lines, and makes the same mistake. You point it out; the lines re-form. Then gold lands on the seat, bars and pedals, and blue builds the rest.</li>
''' + s[end:]
open(p, 'w').write(s)
