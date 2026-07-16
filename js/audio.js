/* Acoustic-ish guitar synth — Karplus-Strong plucked-string physical model.
 *
 * Each pluck is a burst of noise circulating in a delay line the length of the
 * string's period; a half-sample averaging filter damps the harmonics the way
 * a real string loses energy (highs die first), and an allpass stage tunes the
 * fractional delay so pitch is accurate to well under a cent. A pick-position
 * comb filter shapes the attack, per-string brightness mimics wound vs plain
 * strings, and playback runs through body-resonance filters (~100 Hz Helmholtz
 * + ~210 Hz top-plate modes). Buffers are cached per string/fret. */
window.GuitarAudio = (() => {
  let ctx = null;
  let bodyIn = null; // entry point of the shared body-resonance chain
  const bufferCache = new Map();

  /* per string (low E … high e): wound strings are darker and ring longer */
  const STRING_TONE = [
    { brightness: 0.35, dur: 3.0 },
    { brightness: 0.40, dur: 2.9 },
    { brightness: 0.45, dur: 2.7 },
    { brightness: 0.55, dur: 2.4 },
    { brightness: 0.65, dur: 2.1 },
    { brightness: 0.72, dur: 2.0 },
  ];

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();

      // body chain: peaking resonances -> gentle top rolloff -> compressor -> out
      const helmholtz = ctx.createBiquadFilter();
      helmholtz.type = "peaking";
      helmholtz.frequency.value = 100;
      helmholtz.Q.value = 2;
      helmholtz.gain.value = 4;

      const topPlate = ctx.createBiquadFilter();
      topPlate.type = "peaking";
      topPlate.frequency.value = 210;
      topPlate.Q.value = 1.5;
      topPlate.gain.value = 3;

      const air = ctx.createBiquadFilter();
      air.type = "highshelf";
      air.frequency.value = 4500;
      air.gain.value = -4;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;

      const master = ctx.createGain();
      master.gain.value = 0.6;

      helmholtz.connect(topPlate).connect(air).connect(comp).connect(master).connect(ctx.destination);
      bodyIn = helmholtz;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* Pure Karplus-Strong render (no AudioContext needed — unit-testable).
   * Returns a Float32Array normalized to ±0.8. */
  function synthPluck(freq, sampleRate, { brightness = 0.6, dur = 2.2, pickPos = 0.16 } = {}) {
    // Loop delay budget: the ring buffer contributes L samples, the averaging
    // filter reads taps at L and L-1 (net L-0.5), and the allpass adds `frac`.
    // So pick L, frac such that (L - 0.5) + frac = P exactly.
    const P = sampleRate / freq;                 // target period in samples
    const L = Math.max(2, Math.floor(P + 0.5));  // integer delay-line length
    const frac = P - L + 0.5;                    // remainder handled by allpass
    const C = (1 - frac) / (1 + frac);

    // excitation: lowpassed noise (string stiffness) + pick-position comb
    const exc = new Float32Array(L);
    let lp = 0;
    for (let i = 0; i < L; i++) {
      lp += brightness * ((Math.random() * 2 - 1) - lp);
      exc[i] = lp;
    }
    const pp = Math.max(1, Math.round(L * pickPos));
    for (let i = L - 1; i >= pp; i--) exc[i] -= 0.9 * exc[i - pp];

    const len = Math.floor(sampleRate * dur);
    const out = new Float32Array(len);
    const buf = Float32Array.from(exc);
    // Each sample passes the rho multiplier once per loop circulation (every P
    // samples), so scale the per-pass decay accordingly: rho^(sr*dur/P) = -60 dB.
    const rho = Math.exp((Math.log(0.001) * P) / (sampleRate * dur));
    let ptr = 0, prevAvg = 0, prevY = 0;

    for (let n = 0; n < len; n++) {
      const cur = buf[ptr];
      const nxt = buf[(ptr + 1) % L];
      const avg = 0.5 * (cur + nxt);            // damping lowpass (delay +0.5)
      const y = C * avg + prevAvg - C * prevY;  // allpass fractional tuning
      prevAvg = avg;
      prevY = y;
      out[n] = cur;
      buf[ptr] = y * rho;
      ptr = (ptr + 1) % L;
    }

    // normalize
    let peak = 0;
    for (let n = 0; n < len; n++) peak = Math.max(peak, Math.abs(out[n]));
    if (peak > 0) for (let n = 0; n < len; n++) out[n] *= 0.8 / peak;
    return out;
  }

  function getBuffer(string, fret) {
    const ac = ensureCtx();
    const key = `${string}:${fret}:${ac.sampleRate}`;
    let buffer = bufferCache.get(key);
    if (!buffer) {
      const freq = window.STRING_FREQS[string] * Math.pow(2, (fret || 0) / 12);
      const tone = STRING_TONE[string];
      const data = synthPluck(freq, ac.sampleRate, tone);
      buffer = ac.createBuffer(1, data.length, ac.sampleRate);
      buffer.getChannelData(0).set(data);
      bufferCache.set(key, buffer);
    }
    return buffer;
  }

  /* string: 0 (low E) … 5 (high e), fret: 0+ */
  function pluck(string, fret, when = 0, gainVal = 0.5) {
    const ac = ensureCtx();
    const t = ac.currentTime + when;
    const src = ac.createBufferSource();
    src.buffer = getBuffer(string, fret);
    // ±3 cents of per-pluck detune — cached buffers never sound machine-identical
    src.playbackRate.value = Math.pow(2, (Math.random() * 6 - 3) / 1200);
    const g = ac.createGain();
    g.gain.value = gainVal * (0.9 + Math.random() * 0.2);
    src.connect(g).connect(bodyIn);
    src.start(t);
  }

  /* Strum a chord shape. dir: "D" (low→high) or "U" (high→low).
   * Down strums roll a touch slower and lean on the bass; up strums are
   * quicker, lighter, and treble-heavy — like a real wrist. */
  function strum(chord, dir = "D") {
    ensureCtx();
    const order = [];
    for (let s = 0; s < 6; s++) if (chord.frets[s] >= 0) order.push(s);
    if (dir === "U") order.reverse();
    const step = dir === "D" ? 0.022 : 0.014;
    order.forEach((s, i) => {
      const when = i * step + Math.random() * 0.006; // human jitter
      const emphasis = dir === "D"
        ? (i === 0 ? 0.55 : 0.42)              // bass note leads a down strum
        : (s >= 3 ? 0.42 : 0.3);               // up strums favor treble strings
      pluck(s, chord.frets[s], when, emphasis);
    });
  }

  return { pluck, strum, ensureCtx, _synth: synthPluck };
})();
