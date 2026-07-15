/* 1-Minute Chord Changes — the classic beginner drill.
 * Pick a chord pair, hit start, and tap (button or spacebar) every time you
 * land the chord cleanly. Score = changes per minute; best scores persist. */
window.ChangeTrainer = class ChangeTrainer {
  static PAIRS = [
    ["G", "C"], ["G", "D"], ["C", "D"],
    ["Em", "Am"], ["A", "D"], ["Am", "E"],
  ];
  static DURATION = 60; // seconds

  constructor(fretboard, ui) {
    this.fb = fretboard;
    // ui: { chord, info, time, count, best, startBtn, tapBtn }
    this.ui = ui;
    this.pair = ChangeTrainer.PAIRS[0];
    this.running = false;
    this.timer = null;
  }

  static bestKey(pair) { return `fretflow.best.${pair[0]}-${pair[1]}`; }
  static getBest(pair) { return +localStorage.getItem(ChangeTrainer.bestKey(pair)) || 0; }

  setPair(pair) {
    if (this.running) return;
    this.pair = pair;
    this.side = 0;
    this._showChord({ silent: true });
    this.ui.count.textContent = "0";
    this.ui.time.textContent = ChangeTrainer.DURATION;
    const best = ChangeTrainer.getBest(pair);
    this.ui.best.textContent = best || "—";
    this.ui.info.textContent = `Practice switching ${pair[0]} ↔ ${pair[1]}. Hit start, then tap every time you land the chord.`;
  }

  _showChord({ silent = false } = {}) {
    const chord = window.getChord(this.pair[this.side]);
    this.fb.showChord(chord, { light: !silent });
    this.ui.chord.textContent = chord.name;
    if (!silent) window.GuitarAudio.strum(chord, "D");
  }

  start() {
    if (this.running) { this.stop(); return; }
    window.GuitarAudio.ensureCtx();
    this.running = true;
    this.count = 0;
    this.side = 0;
    this.timeLeft = ChangeTrainer.DURATION;
    this.ui.count.textContent = "0";
    this.ui.time.textContent = this.timeLeft;
    this.ui.startBtn.textContent = "⏹ Stop";
    this.ui.tapBtn.disabled = false;
    this.ui.info.textContent = "Go! Land the chord, tap, switch, repeat.";
    this._showChord({ silent: true });
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.ui.time.textContent = this.timeLeft;
      if (this.timeLeft <= 0) this._finish();
    }, 1000);
  }

  tap() {
    if (!this.running) return;
    this.count++;
    this.side = 1 - this.side;
    this.ui.count.textContent = this.count;
    this._showChord();
  }

  _finish() {
    clearInterval(this.timer);
    this.running = false;
    this.ui.startBtn.textContent = "▶ Start 60s";
    this.ui.tapBtn.disabled = true;
    const best = ChangeTrainer.getBest(this.pair);
    if (this.count > best) {
      localStorage.setItem(ChangeTrainer.bestKey(this.pair), this.count);
      this.ui.best.textContent = this.count;
      this.ui.info.textContent = `⏰ Time! ${this.count} changes — new personal best! 🎉`;
    } else {
      this.ui.info.textContent = `⏰ Time! ${this.count} changes (best: ${best}). 30+ means you're ready to use these chords in songs.`;
    }
  }

  stop() {
    clearInterval(this.timer);
    this.running = false;
    this.ui.startBtn.textContent = "▶ Start 60s";
    this.ui.tapBtn.disabled = true;
    this.ui.time.textContent = ChangeTrainer.DURATION;
  }
};
