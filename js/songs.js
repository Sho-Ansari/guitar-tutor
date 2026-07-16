/* Song library + follow-along player.
 * style: "strum" (default) or "picking".
 * strum: one bar of eighth-note slots. "D" down, "U" up, "-" no strum.
 *        4/4 songs use 8 slots, 3/4 songs use 6.
 * pattern (picking songs): one bar of eighth-note slots; each is null (rest)
 *        or { s, f } — s = string index 0 (low E) … 5 (high e), or -1 for the
 *        current chord's bass string; f = right-hand finger "p"|"i"|"m"|"a".
 * sections[].chords: [{ chord, beats }]
 */
window.SONGS = [
  {
    title: "Amazing Grace",
    artist: "Traditional",
    tempo: 70,
    beatsPerBar: 3,
    strum: "D-DU-U",
    tag: "2 chords to start",
    sections: [
      { name: "Verse", chords: [
        { chord: "G", beats: 3 }, { chord: "G", beats: 3 }, { chord: "C", beats: 3 }, { chord: "G", beats: 3 },
        { chord: "G", beats: 3 }, { chord: "G", beats: 3 }, { chord: "D", beats: 3 }, { chord: "D", beats: 3 },
        { chord: "G", beats: 3 }, { chord: "G", beats: 3 }, { chord: "C", beats: 3 }, { chord: "G", beats: 3 },
        { chord: "Em", beats: 3 }, { chord: "D", beats: 3 }, { chord: "G", beats: 3 }, { chord: "G", beats: 3 },
      ]},
    ],
  },
  {
    title: "House of the Rising Sun",
    artist: "Traditional",
    tempo: 78,
    beatsPerBar: 3,
    strum: "D-DUDU",
    tag: "minor & moody",
    sections: [
      { name: "Verse", chords: [
        { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "D", beats: 3 }, { chord: "F", beats: 3 },
        { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "E", beats: 3 }, { chord: "E", beats: 3 },
        { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "D", beats: 3 }, { chord: "F", beats: 3 },
        { chord: "Am", beats: 3 }, { chord: "E", beats: 3 }, { chord: "Am", beats: 3 }, { chord: "Am", beats: 3 },
      ]},
    ],
  },
  {
    title: "Happy Birthday",
    artist: "Traditional",
    tempo: 90,
    beatsPerBar: 3,
    strum: "D-D-DU",
    tag: "instant crowd-pleaser",
    sections: [
      { name: "Song", chords: [
        { chord: "G", beats: 3 }, { chord: "D", beats: 3 }, { chord: "D", beats: 3 }, { chord: "G", beats: 3 },
        { chord: "G", beats: 3 }, { chord: "C", beats: 3 }, { chord: "G", beats: 3 }, { chord: "D", beats: 3 }, { chord: "G", beats: 3 },
      ]},
    ],
  },
  {
    title: "Scarborough Fair",
    artist: "Traditional",
    tempo: 84,
    beatsPerBar: 3,
    strum: "D--U-U",
    tag: "gentle & folky",
    sections: [
      { name: "Verse", chords: [
        { chord: "Am", beats: 3 }, { chord: "Am", beats: 3 }, { chord: "G", beats: 3 }, { chord: "Am", beats: 3 },
        { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "D", beats: 3 }, { chord: "Am", beats: 3 },
        { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "G", beats: 3 }, { chord: "Em", beats: 3 },
        { chord: "Am", beats: 3 }, { chord: "G", beats: 3 }, { chord: "Am", beats: 3 }, { chord: "Am", beats: 3 },
      ]},
    ],
  },
];

/* Built-in fingerpicking songs — same format, style: "picking" */
(() => {
  const p = (s, f) => ({ s, f });
  const CLASSIC_ARP = [p(-1, "p"), p(3, "i"), p(4, "m"), p(5, "a"), p(4, "m"), p(3, "i")]; // THE beginner pattern

  window.SONGS.push(
    {
      title: "House of the Rising Sun",
      artist: "Traditional · fingerstyle",
      style: "picking",
      tempo: 104,
      beatsPerBar: 3,
      pattern: CLASSIC_ARP,
      strum: "D-----",
      tag: "the classic first picking song",
      sections: [
        { name: "Verse", chords: [
          { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "D", beats: 3 }, { chord: "F", beats: 3 },
          { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "E", beats: 3 }, { chord: "E", beats: 3 },
          { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "D", beats: 3 }, { chord: "F", beats: 3 },
          { chord: "Am", beats: 3 }, { chord: "E", beats: 3 }, { chord: "Am", beats: 3 }, { chord: "Am", beats: 3 },
        ]},
      ],
    },
    {
      title: "Greensleeves",
      artist: "Traditional · fingerstyle",
      style: "picking",
      tempo: 96,
      beatsPerBar: 3,
      pattern: [p(-1, "p"), p(3, "i"), p(4, "m"), p(-1, "p"), p(3, "i"), p(4, "m")], // p-i-m twice a bar
      strum: "D-----",
      tag: "gentle waltz picking",
      sections: [
        { name: "Verse", chords: [
          { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "G", beats: 3 }, { chord: "Em", beats: 3 },
          { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "E", beats: 3 }, { chord: "E", beats: 3 },
        ]},
        { name: "Chorus", chords: [
          { chord: "C", beats: 3 }, { chord: "C", beats: 3 }, { chord: "G", beats: 3 }, { chord: "Em", beats: 3 },
          { chord: "Am", beats: 3 }, { chord: "E", beats: 3 }, { chord: "Am", beats: 3 }, { chord: "Am", beats: 3 },
        ]},
      ],
    },
    {
      title: "Scarborough Fair",
      artist: "Traditional · fingerstyle",
      style: "picking",
      tempo: 88,
      beatsPerBar: 3,
      pattern: [p(-1, "p"), p(4, "m"), p(3, "i"), p(5, "a"), p(3, "i"), p(4, "m")], // inside-out arpeggio
      strum: "D-----",
      tag: "flowing & folky",
      sections: [
        { name: "Verse", chords: [
          { chord: "Am", beats: 3 }, { chord: "Am", beats: 3 }, { chord: "G", beats: 3 }, { chord: "Am", beats: 3 },
          { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "D", beats: 3 }, { chord: "Am", beats: 3 },
          { chord: "Am", beats: 3 }, { chord: "C", beats: 3 }, { chord: "G", beats: 3 }, { chord: "Em", beats: 3 },
          { chord: "Am", beats: 3 }, { chord: "G", beats: 3 }, { chord: "Am", beats: 3 }, { chord: "Am", beats: 3 },
        ]},
      ],
    },
    {
      title: "Arpeggio Study in C",
      artist: "Practice piece",
      style: "picking",
      tempo: 76,
      beatsPerBar: 4,
      pattern: [p(-1, "p"), null, p(3, "i"), p(4, "m"), p(5, "a"), p(4, "m"), p(3, "i"), null],
      strum: "D-------",
      tag: "pattern drill · 4 chords",
      playingNotes: "Keep the thumb on the bass and let every note ring into the next.",
      sections: [
        { name: "Loop", chords: [
          { chord: "C", beats: 4 }, { chord: "Am", beats: 4 }, { chord: "Dm", beats: 4 }, { chord: "G", beats: 4 },
        ]},
      ],
    },
  );
})();

/* Sanitize a song coming from an untrusted source (AI response or
 * localStorage). Returns a clean copy, or null if structurally invalid.
 * Everything is length-capped, type-checked, and range-clamped. */
window.sanitizeSong = function (raw) {
  if (!raw || typeof raw !== "object") return null;
  const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
  const int = (v, lo, hi, dflt) =>
    Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : dflt;

  const song = {
    title: str(raw.title, 80) || "Untitled",
    artist: str(raw.artist, 80) || "Unknown",
    tag: str(raw.tag, 40),
    playingNotes: str(raw.playingNotes, 240),
    tempo: int(raw.tempo, 40, 200, 80),
    beatsPerBar: raw.beatsPerBar === 3 ? 3 : 4,
    sections: [],
    chordShapes: [],
  };

  // strum: exactly beatsPerBar*2 slots of D / U / -
  const slots = song.beatsPerBar * 2;
  const strumSrc = str(raw.strum, 16);
  song.strum = (strumSrc + "-".repeat(slots)).slice(0, slots)
    .split("").map((c) => (c === "D" || c === "U" ? c : "-")).join("");

  // picking style: pattern of {s: -1..5, f: p|i|m|a} | null per slot
  song.style = raw.style === "picking" ? "picking" : "strum";
  song.pattern = [];
  if (song.style === "picking") {
    if (!Array.isArray(raw.pattern)) return null;
    for (const pick of raw.pattern.slice(0, slots)) {
      if (pick == null) { song.pattern.push(null); continue; }
      if (!Number.isInteger(pick.s) || pick.s < -1 || pick.s > 5) return null;
      song.pattern.push({ s: pick.s, f: ["p", "i", "m", "a"].includes(pick.f) ? pick.f : "p" });
    }
    while (song.pattern.length < slots) song.pattern.push(null);
    if (!song.pattern.some(Boolean)) return null; // all rests = not a pattern
  }

  if (!Array.isArray(raw.sections) || raw.sections.length === 0) return null;
  for (const sec of raw.sections.slice(0, 20)) {
    if (!sec || !Array.isArray(sec.chords)) return null;
    const chords = [];
    for (const c of sec.chords.slice(0, 128)) {
      if (!c || typeof c.chord !== "string" || !window.CHORD_NAME_RE.test(c.chord)) return null;
      chords.push({ chord: c.chord, beats: int(c.beats, 1, 16, song.beatsPerBar) });
    }
    if (chords.length === 0) return null;
    song.sections.push({ name: str(sec.name, 40) || "Section", chords });
  }

  // chord shapes are fully re-validated by registerChord; just cap and copy
  if (Array.isArray(raw.chordShapes)) {
    song.chordShapes = raw.chordShapes.slice(0, 24).filter(
      (s) => s && typeof s.name === "string" && Array.isArray(s.frets)
    );
  }
  return song;
};

/* Songs the AI added, persisted per-browser */
(function loadSavedSongs() {
  try {
    const saved = JSON.parse(localStorage.getItem("fretflow.songs") || "[]");
    if (!Array.isArray(saved)) return;
    saved.slice(0, 200).forEach((raw) => {
      const song = window.sanitizeSong(raw); // storage is user-editable — never trust it
      if (!song) return;
      song.chordShapes.forEach(window.registerChord);
      window.SONGS.push(song);
    });
  } catch (_) { /* corrupt storage — ignore */ }
})();

window.saveAISong = function (song) {
  const saved = JSON.parse(localStorage.getItem("fretflow.songs") || "[]");
  saved.push(song);
  localStorage.setItem("fretflow.songs", JSON.stringify(saved));
};

/* ── Follow-along player ──────────────────────────────────────────── */
window.SongPlayer = class SongPlayer {
  constructor(fretboard, ui) {
    this.fb = fretboard;
    this.ui = ui; // { chordNow, chordNext, section, strumRow, beatRow, playBtn }
    this.playing = false;
    this.timer = null;
  }

  load(song) {
    this.stop();
    this.song = song;
    this.tempo = song.tempo;
    this.slots = this._buildSlots(song);
    this.pos = 0;
    this._renderStrumRow();
    this._renderBeatRow();
    this._showSlot(0, { silent: true });
  }

  /* Flatten sections into eighth-note slots */
  _buildSlots(song) {
    const perBar = song.beatsPerBar * 2;
    const picking = song.style === "picking";
    const slots = [];
    for (const section of song.sections) {
      for (const entry of section.chords) {
        const n = entry.beats * 2;
        for (let i = 0; i < n; i++) {
          const barPos = slots.length % perBar;
          slots.push({
            chord: entry.chord,
            section: section.name,
            strumChar: picking ? "-" : (song.strum[barPos] || "-"),
            pick: picking ? song.pattern[barPos] : null,
            barPos,
          });
        }
      }
    }
    return slots;
  }

  /* Which string does a pick target for this chord? -1 = the chord's bass;
   * a muted string falls back to the bass so patterns work on any shape. */
  static resolveString(chord, s) {
    if (s >= 0 && s <= 5 && chord.frets[s] >= 0) return s;
    for (let i = 0; i < 6; i++) if (chord.frets[i] >= 0) return i;
    return 0;
  }

  _renderStrumRow() {
    this.ui.strumRow.innerHTML = "";
    if (this.song.style === "picking") {
      // finger letter on top, target string underneath
      this.strumCells = this.song.pattern.map((pick) => {
        const cell = document.createElement("div");
        cell.className = "strum-cell" + (pick ? " hit" : "");
        if (pick) {
          const f = document.createElement("div");
          f.className = "pick-f";
          f.textContent = pick.f;
          const st = document.createElement("div");
          st.className = "pick-s";
          st.textContent = pick.s === -1 ? "bass" : window.STRING_NAMES[pick.s];
          cell.append(f, st);
        } else {
          cell.textContent = "·";
        }
        this.ui.strumRow.appendChild(cell);
        return cell;
      });
      return;
    }
    this.strumCells = [...this.song.strum].map((ch) => {
      const cell = document.createElement("div");
      cell.className = "strum-cell" + (ch === "-" ? "" : " hit");
      cell.textContent = ch === "D" ? "↓" : ch === "U" ? "↑" : "·";
      this.ui.strumRow.appendChild(cell);
      return cell;
    });
  }

  _renderBeatRow() {
    this.ui.beatRow.innerHTML = "";
    this.beatDots = [];
    for (let b = 0; b < this.song.beatsPerBar; b++) {
      const dot = document.createElement("div");
      dot.className = "beat-dot";
      this.ui.beatRow.appendChild(dot);
      this.beatDots.push(dot);
    }
  }

  _showSlot(pos, { silent = false } = {}) {
    const slot = this.slots[pos];
    if (!slot) return;
    const chord = window.getChord(slot.chord);

    // chord change → redraw shape
    if (this.currentChord !== slot.chord) {
      this.currentChord = slot.chord;
      if (chord) this.fb.showChord(chord);
      this.ui.chordNow.textContent = slot.chord;
      this.ui.chordNext.textContent = this._nextChord(pos) || "—";
    }
    this.ui.section.textContent = slot.section;

    // strum + beat indicators
    this.strumCells.forEach((c, i) => c.classList.toggle("now", i === slot.barPos));
    this.beatDots.forEach((d, i) => d.classList.toggle("now", i === Math.floor(slot.barPos / 2)));

    // light + sound: one string per pick, or the whole chord per strum
    if (!silent && chord) {
      if (slot.pick) {
        const s = SongPlayer.resolveString(chord, slot.pick.s);
        this.fb.lightString(s, 340);
        window.GuitarAudio.pluck(s, chord.frets[s], 0, 0.5);
      } else if (slot.strumChar === "D" || slot.strumChar === "U") {
        this.fb.lightChord(chord, slot.strumChar, 350);
        window.GuitarAudio.strum(chord, slot.strumChar);
      }
    }
  }

  _nextChord(pos) {
    const cur = this.slots[pos].chord;
    for (let i = pos + 1; i < this.slots.length; i++)
      if (this.slots[i].chord !== cur) return this.slots[i].chord;
    return this.slots[0] && this.slots[0].chord !== cur ? this.slots[0].chord : null;
  }

  play() {
    if (!this.song) return;
    window.GuitarAudio.ensureCtx();
    this.playing = true;
    this.ui.playBtn.textContent = "⏹ Stop";
    this._tick();
  }

  _tick() {
    if (!this.playing) return;
    this._showSlot(this.pos);
    this.pos = (this.pos + 1) % this.slots.length;
    this.timer = setTimeout(() => this._tick(), 60000 / this.tempo / 2);
  }

  stop() {
    this.playing = false;
    clearTimeout(this.timer);
    this.pos = 0;
    this.currentChord = null;
    if (this.ui && this.ui.playBtn) this.ui.playBtn.textContent = "▶ Play";
  }

  setTempo(t) { this.tempo = t; }
};
