/* Tiny pluck synth so lit strings are also heard.
 * One shared AudioContext, created lazily on first user interaction. */
window.GuitarAudio = (() => {
  let ctx = null;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* Soft Karplus-Strong-ish pluck: filtered triangle with fast decay */
  function pluckFreq(freq, when = 0, gainVal = 0.22) {
    const ac = ensureCtx();
    const t = ac.currentTime + when;

    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq * 6, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.5);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainVal, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);

    osc.connect(filter).connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  /* string: 0 (low E) … 5 (high e), fret: 0+ */
  function pluck(string, fret, when = 0) {
    const freq = window.STRING_FREQS[string] * Math.pow(2, (fret || 0) / 12);
    pluckFreq(freq, when);
  }

  /* Strum a chord shape. dir: "D" (low→high) or "U" (high→low) */
  function strum(chord, dir = "D") {
    const order = [];
    for (let s = 0; s < 6; s++) if (chord.frets[s] >= 0) order.push(s);
    if (dir === "U") order.reverse();
    order.forEach((s, i) => pluck(s, chord.frets[s], i * 0.035));
  }

  return { pluck, strum, ensureCtx };
})();
