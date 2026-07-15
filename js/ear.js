/* The app's "ear" — shared mic capture used by exercise listen-mode and the
 * chord checker. Each frame produces:
 *   freq   — monophonic pitch via autocorrelation (single notes)
 *   chroma — 12-bin pitch-class energy profile (chords)
 *   rms    — loudness gate
 * Chord identity is judged by chroma coverage: how much of the incoming
 * energy lands on the chord's pitch classes. */
window.Ear = (() => {
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
  const NOTE_LABELS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const FFT_SIZE = 16384;

  class Ear {
    constructor({ onFrame, onError }) {
      this.onFrame = onFrame;
      this.onError = onError;
      this.running = false;
    }

    async start() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch (err) {
        this.onError && this.onError(err);
        return false;
      }
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.5;
      src.connect(this.analyser);
      this.timeBuf = new Float32Array(FFT_SIZE);
      this.freqBuf = new Float32Array(this.analyser.frequencyBinCount);
      this.running = true;
      this._loop();
      return true;
    }

    stop() {
      this.running = false;
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      if (this.ctx) this.ctx.close();
      this.stream = this.ctx = this.analyser = null;
    }

    _loop() {
      if (!this.running) return;
      this.analyser.getFloatTimeDomainData(this.timeBuf);
      this.analyser.getFloatFrequencyData(this.freqBuf);

      const slice = this.timeBuf.subarray(0, 2048);
      let rms = 0;
      for (let i = 0; i < slice.length; i++) rms += slice[i] * slice[i];
      rms = Math.sqrt(rms / slice.length);

      const freq = window.Tuner.autoCorrelate(slice, this.ctx.sampleRate);
      const chroma = Ear.chroma(this.freqBuf, this.ctx.sampleRate);
      this.onFrame({ rms, freq, chroma });
      requestAnimationFrame(() => this._loop());
    }

    /* Fold FFT energy (70–1100 Hz) into 12 pitch classes, normalized to sum 1 */
    static chroma(freqData, sampleRate) {
      const chroma = new Float32Array(12);
      const binHz = sampleRate / FFT_SIZE;
      const lo = Math.ceil(70 / binHz);
      const hi = Math.min(freqData.length - 1, Math.floor(1100 / binHz));
      let total = 0;
      for (let i = lo; i <= hi; i++) {
        const db = freqData[i];
        if (db < -90) continue;
        const p = Math.pow(10, db / 10);
        const f = i * binHz;
        const pc = ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
        chroma[pc] += p;
        total += p;
      }
      if (total > 0) for (let i = 0; i < 12; i++) chroma[i] /= total;
      return chroma;
    }
  }

  /* ── chord-recognition helpers ── */
  function chordPCs(chord) {
    const set = new Set();
    for (let s = 0; s < 6; s++)
      if (chord.frets[s] >= 0) set.add((OPEN_MIDI[s] + chord.frets[s]) % 12);
    return [...set];
  }

  function coverage(chroma, pcs) {
    let sum = 0;
    pcs.forEach((pc) => (sum += chroma[pc]));
    return sum;
  }

  /* Which library chord best explains this chroma? (size-normalized so
   * 4-note chords don't win just by covering more pitch classes) */
  function bestChord(chroma) {
    let best = null;
    for (const chord of Object.values(window.CHORDS)) {
      const pcs = chordPCs(chord);
      const cov = coverage(chroma, pcs);
      const score = cov / Math.sqrt(pcs.length);
      if (!best || score > best.score) best = { name: chord.name, score, cov };
    }
    return best;
  }

  /* Does this chroma sound like `expectedName`? */
  function verdict(chroma, expectedName) {
    const chord = window.CHORDS[expectedName];
    if (!chord) return { match: false, cov: 0, best: null };
    const cov = coverage(chroma, chordPCs(chord));
    const best = bestChord(chroma);
    const match = cov > 0.55 && (best.name === expectedName || cov >= best.cov * 0.92);
    return { match, cov, best };
  }

  function noteName(midi) {
    return NOTE_LABELS[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  }

  return Object.assign(Ear, { OPEN_MIDI, NOTE_LABELS, chordPCs, coverage, bestChord, verdict, noteName });
})();
