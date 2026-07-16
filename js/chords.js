/* Chord library.
 * frets/fingers are arrays of 6, ordered low E → high e.
 * fret: -1 = muted, 0 = open, n = fret number. finger: 0 = none, 1–4 = index–pinky. */
/* Null prototype: chord names become object keys, and AI/localStorage data must
 * never be able to hit __proto__ / constructor and pollute Object.prototype. */
window.CHORDS = Object.assign(Object.create(null), {
  A:  { name: "A",  desc: "A major — three fingers in a row on fret 2.",        frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Am: { name: "Am", desc: "A minor — like E major moved down one string.",      frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  C:  { name: "C",  desc: "C major — the classic first campfire chord.",        frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  D:  { name: "D",  desc: "D major — a tight triangle on the top strings.",     frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { name: "Dm", desc: "D minor — moody cousin of D major.",                 frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  E:  { name: "E",  desc: "E major — big, open, and loud. All six strings.",    frets: [0, 2, 2, 1, 0, 0],  fingers: [0, 2, 3, 1, 0, 0] },
  Em: { name: "Em", desc: "E minor — the easiest chord there is. Two fingers.", frets: [0, 2, 2, 0, 0, 0],  fingers: [0, 2, 3, 0, 0, 0] },
  F:  { name: "F",  desc: "F major (small shape) — no barre needed yet.",       frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1] },
  G:  { name: "G",  desc: "G major — a big stretch, worth every bit of it.",    frets: [3, 2, 0, 0, 0, 3],  fingers: [2, 1, 0, 0, 0, 3] },
  B7: { name: "B7", desc: "B7 — the door out of the key of E.",                 frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
});

/* Standard-tuning open string frequencies, low E → high e */
window.STRING_FREQS = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
window.STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

window.getChord = function (name) {
  return window.CHORDS[name] || null;
};

/* Songs added by AI can register new shapes at runtime.
 * Validates aggressively: this data crosses a trust boundary. */
window.CHORD_NAME_RE = /^[A-G][#♯b♭]?[A-Za-z0-9#♯b♭+°()\/]{0,9}$/;

window.registerChord = function (shape) {
  if (!shape || typeof shape.name !== "string") return;
  if (!window.CHORD_NAME_RE.test(shape.name)) return; // also blocks __proto__ etc.
  const ints = (arr, lo, hi) =>
    Array.isArray(arr) && arr.length === 6 &&
    arr.every((v) => Number.isInteger(v) && v >= lo && v <= hi);
  if (!ints(shape.frets, -1, 24)) return;
  const fingers = ints(shape.fingers, 0, 4) ? shape.fingers : [0, 0, 0, 0, 0, 0];
  window.CHORDS[shape.name] = {
    name: shape.name,
    desc: typeof shape.desc === "string" ? shape.desc.slice(0, 120) : "Added by AI",
    frets: shape.frets,
    fingers,
  };
};
