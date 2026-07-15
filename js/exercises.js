/* Beginner exercises. Steps are either
 *   { type: "note",  string, fret, finger, label }
 *   { type: "chord", chord, beats }   — hold a chord for N beats
 */
(() => {
  const note = (string, fret, finger, label) => ({ type: "note", string, fret, finger, label });

  // 1-2-3-4 spider crawl across every string
  const spider = [];
  for (let s = 0; s < 6; s++)
    for (let f = 1; f <= 4; f++)
      spider.push(note(s, f, f, `${window.STRING_NAMES[s]} string · fret ${f}`));

  // C major scale, open position, up and back down
  const cMajorUp = [
    note(1, 3, 3, "C"), note(2, 0, 0, "D"), note(2, 2, 2, "E"), note(2, 3, 3, "F"),
    note(3, 0, 0, "G"), note(3, 2, 2, "A"), note(4, 0, 0, "B"), note(4, 1, 1, "C"),
  ];
  const cMajor = [...cMajorUp, ...cMajorUp.slice(0, -1).reverse()];

  // A minor pentatonic, position 1 (5th fret) — the riff-maker's scale
  const pentaUp = [
    note(0, 5, 1, "A"), note(0, 8, 4, "C"), note(1, 5, 1, "D"), note(1, 7, 3, "E"),
    note(2, 5, 1, "G"), note(2, 7, 3, "A"), note(3, 5, 1, "C"), note(3, 7, 3, "D"),
    note(4, 5, 1, "E"), note(4, 8, 4, "G"), note(5, 5, 1, "A"), note(5, 8, 4, "C"),
  ];
  const penta = [...pentaUp, ...pentaUp.slice(0, -1).reverse()];

  // Chord changes: G → C → D loop
  const chordChanges = [];
  for (let i = 0; i < 4; i++)
    ["G", "C", "D", "C"].forEach((c) => chordChanges.push({ type: "chord", chord: c, beats: 4 }));

  window.EXERCISES = [
    {
      id: "spider",
      title: "Spider Crawl (1-2-3-4)",
      tag: "warm-up",
      desc: "One finger per fret, every string. Builds finger independence and gets your hand warm.",
      tempo: 60,
      steps: spider,
    },
    {
      id: "cmajor",
      title: "C Major Scale",
      tag: "scales",
      desc: "The do-re-mi scale in open position, up and back down. Learn where the notes live.",
      tempo: 60,
      steps: cMajor,
    },
    {
      id: "penta",
      title: "A Minor Pentatonic",
      tag: "scales",
      desc: "Five notes, position 1 at the 5th fret. The scale behind almost every rock solo.",
      tempo: 70,
      steps: penta,
    },
    {
      id: "changes",
      title: "Chord Changes: G · C · D",
      tag: "chords",
      desc: "Four beats per chord. Try to land all fingers at once — smooth beats fast.",
      tempo: 60,
      steps: chordChanges,
    },
  ];

  /* ── Exercise player ─────────────────────────────────────────────── */
  window.ExercisePlayer = class ExercisePlayer {
    constructor(fretboard, ui) {
      this.fb = fretboard;
      this.ui = ui; // { stepLabel, stepDetail, progress, playBtn }
      this.exercise = null;
      this.index = 0;
      this.playing = false;
      this.timer = null;
      this.tempo = 60;
    }

    load(exercise) {
      this.stop();
      this.exercise = exercise;
      this.tempo = exercise.tempo;
      this.index = 0;
      this._show();
    }

    _show() {
      const step = this.exercise.steps[this.index];
      if (!step) return;
      if (step.type === "note") {
        this.fb.showNote(step.string, step.fret, step.finger);
        this.ui.stepLabel.textContent = step.label;
        this.ui.stepDetail.textContent =
          step.fret === 0
            ? `open ${window.STRING_NAMES[step.string]} string`
            : `${window.STRING_NAMES[step.string]} string · fret ${step.fret} · finger ${step.finger}`;
        window.GuitarAudio.pluck(step.string, step.fret);
      } else {
        const chord = window.getChord(step.chord);
        this.fb.showChord(chord, { light: true });
        this.ui.stepLabel.textContent = step.chord;
        this.ui.stepDetail.textContent = `hold for ${step.beats} beats`;
        window.GuitarAudio.strum(chord, "D");
      }
      this.ui.progress.style.width = `${((this.index + 1) / this.exercise.steps.length) * 100}%`;
    }

    _stepDuration() {
      const step = this.exercise.steps[this.index];
      const beat = 60000 / this.tempo;
      return step.type === "chord" ? beat * step.beats : beat;
    }

    play() {
      if (!this.exercise) return;
      window.GuitarAudio.ensureCtx();
      this.playing = true;
      this.ui.playBtn.textContent = "⏸ Pause";
      this._show();
      this._schedule();
    }

    _schedule() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (!this.playing) return;
        this.index = (this.index + 1) % this.exercise.steps.length;
        this._show();
        this._schedule();
      }, this._stepDuration());
    }

    pause() {
      this.playing = false;
      clearTimeout(this.timer);
      this.ui.playBtn.textContent = "▶ Play";
    }

    stop() {
      this.pause();
      this.index = 0;
    }

    next() { this.pause(); this.index = (this.index + 1) % this.exercise.steps.length; this._show(); }
    prev() { this.pause(); this.index = (this.index - 1 + this.exercise.steps.length) % this.exercise.steps.length; this._show(); }
    setTempo(t) { this.tempo = t; }
  };
})();
