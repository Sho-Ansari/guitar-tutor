/* Microphone tuner — autocorrelation pitch detection (ACF2+),
 * mapped to the nearest standard-tuning guitar string. */
window.Tuner = class Tuner {
  constructor({ onPitch, onError }) {
    this.onPitch = onPitch;
    this.onError = onError;
    this.running = false;
    this.buf = new Float32Array(2048);
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
    this.analyser.fftSize = 2048;
    src.connect(this.analyser);
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
    this.analyser.getFloatTimeDomainData(this.buf);
    const freq = Tuner.autoCorrelate(this.buf, this.ctx.sampleRate);
    if (freq > 0) this.onPitch(this._analyze(freq));
    requestAnimationFrame(() => this._loop());
  }

  /* Map a frequency to note name + nearest guitar string + cents offset */
  _analyze(freq) {
    const NOTES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const midi = 69 + 12 * Math.log2(freq / 440);
    const nearest = Math.round(midi);
    const cents = Math.round((midi - nearest) * 100);
    const noteName = NOTES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1);

    // nearest standard-tuning string
    let stringIdx = 0, best = Infinity;
    window.STRING_FREQS.forEach((f, i) => {
      const d = Math.abs(Math.log2(freq / f));
      if (d < best) { best = d; stringIdx = i; }
    });
    const target = window.STRING_FREQS[stringIdx];
    const stringCents = Math.round(1200 * Math.log2(freq / target));

    return { freq, noteName, cents, stringIdx, stringCents, inTune: Math.abs(stringCents) <= 6 };
  }

  /* Classic ACF2+ autocorrelation. Returns frequency in Hz, or -1 if no clear pitch. */
  static autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // too quiet

    // trim silence at the edges
    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    const sliced = buf.slice(r1, r2);
    const N = sliced.length;
    if (N < 64) return -1;

    const c = new Float32Array(N);
    for (let lag = 0; lag < N; lag++) {
      let sum = 0;
      for (let i = 0; i < N - lag; i++) sum += sliced[i] * sliced[i + lag];
      c[lag] = sum;
    }

    let d = 0;
    while (d < N - 1 && c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < N; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    if (maxpos <= 0) return -1;

    // parabolic interpolation around the peak
    let T0 = maxpos;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1] || 0;
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    const freq = sampleRate / T0;
    return freq > 50 && freq < 1500 ? freq : -1;
  }
};
