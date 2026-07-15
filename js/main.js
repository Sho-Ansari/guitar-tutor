/* App wiring: tabs, chord library, exercises, tuner, songs, AI modals. */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const fb = new window.Fretboard($("#fretboard-wrap"), {
    lefty: localStorage.getItem("fretflow.lefty") === "1",
  });
  const caption = $("#stage-caption");

  /* ── left-handed mode ── */
  const leftyBtn = $("#lefty-btn");
  leftyBtn.classList.toggle("on", fb.lefty);
  leftyBtn.addEventListener("click", () => {
    fb.setLefty(!fb.lefty);
    leftyBtn.classList.toggle("on", fb.lefty);
    localStorage.setItem("fretflow.lefty", fb.lefty ? "1" : "0");
    caption.textContent = fb.lefty ? "Left-handed mode — the nut is now on the right." : "Back to right-handed mode.";
  });

  /* ── tabs ── */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      $(`#panel-${tab.dataset.tab}`).classList.add("active");
      exPlayer.pause();
      songPlayer.stop();
      trainer.stop();
      if (tab.dataset.tab !== "tuner" && tuner.running) stopTuner();
      fb.reset();
      caption.textContent = "";
    });
  });

  /* ── chords ── */
  const chordGrid = $("#chord-grid");
  function renderChordGrid() {
    chordGrid.innerHTML = "";
    Object.values(window.CHORDS).forEach((chord) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = chord.name;
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        fb.showChord(chord, { light: true });
        window.GuitarAudio.strum(chord, "D");
        $("#chord-detail").classList.remove("hidden");
        $("#chord-name").textContent = chord.name;
        $("#chord-desc").textContent = chord.desc;
        caption.textContent = `${chord.name} — green O = let it ring open, red × = skip that string.`;
        currentChord = chord;
      });
      chordGrid.appendChild(chip);
    });
  }
  let currentChord = null;
  renderChordGrid();
  $("#chord-strum").addEventListener("click", () => {
    if (!currentChord) return;
    fb.lightChord(currentChord, "D");
    window.GuitarAudio.strum(currentChord, "D");
  });

  /* ── exercises ── */
  const exPlayer = new window.ExercisePlayer(fb, {
    stepLabel: $("#ex-step-label"),
    stepDetail: $("#ex-step-detail"),
    progress: $("#ex-progress"),
    playBtn: $("#ex-play"),
  });

  const exList = $("#exercise-list");
  window.EXERCISES.forEach((ex) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>${ex.title}</h3><p>${ex.desc}</p><span class="tag">${ex.tag}</span>`;
    card.addEventListener("click", () => {
      trainer.stop();
      $("#trainer-player").classList.add("hidden");
      $("#exercise-player").classList.remove("hidden");
      $("#ex-title").textContent = ex.title;
      $("#ex-tempo").value = ex.tempo;
      $("#ex-tempo-val").textContent = ex.tempo;
      exPlayer.load(ex);
      exPlayer._show();
      caption.textContent = "Follow the lit string — the dot shows which finger goes where.";
      window.scrollTo({ top: 0, behavior: "smooth" }); // player now lives under the guitar
    });
    exList.appendChild(card);
  });

  /* ── chord-change trainer ── */
  const trainer = new window.ChangeTrainer(fb, {
    chord: $("#tr-chord"),
    info: $("#tr-info"),
    time: $("#tr-time"),
    count: $("#tr-count"),
    best: $("#tr-best"),
    startBtn: $("#tr-start"),
    tapBtn: $("#tr-tap"),
  });

  const trainerCard = document.createElement("div");
  trainerCard.className = "card";
  trainerCard.innerHTML =
    `<h3>⏱ 1-Minute Chord Changes</h3><p>The drill that makes songs playable: pick two chords and count how many clean switches you can make in 60 seconds.</p><span class="tag">scored · daily</span>`;
  trainerCard.addEventListener("click", () => {
    $("#exercise-player").classList.add("hidden");
    exPlayer.stop();
    $("#trainer-player").classList.remove("hidden");
    renderPairChips();
    trainer.setPair(trainer.pair);
    caption.textContent = "Land the chord cleanly, tap, switch. Speed comes from repetition.";
    window.scrollTo({ top: 0, behavior: "smooth" }); // player now lives under the guitar
  });
  exList.prepend(trainerCard);

  function renderPairChips() {
    const row = $("#tr-pairs");
    row.innerHTML = "";
    window.ChangeTrainer.PAIRS.forEach((pair) => {
      const chip = document.createElement("button");
      chip.className = "chip sm" + (pair === trainer.pair ? " active" : "");
      chip.textContent = `${pair[0]} ↔ ${pair[1]}`;
      chip.addEventListener("click", () => {
        if (trainer.running) return;
        trainer.setPair(pair);
        row.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
      row.appendChild(chip);
    });
  }

  $("#tr-start").addEventListener("click", () => trainer.start());
  $("#tr-tap").addEventListener("click", () => trainer.tap());
  $("#tr-close").addEventListener("click", () => {
    trainer.stop();
    $("#trainer-player").classList.add("hidden");
    fb.reset();
  });
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || !trainer.running) return;
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    e.preventDefault(); // don't scroll or re-click a focused button
    trainer.tap();
  });

  $("#ex-play").addEventListener("click", () => (exPlayer.playing ? exPlayer.pause() : exPlayer.play()));
  $("#ex-next").addEventListener("click", () => exPlayer.next());
  $("#ex-prev").addEventListener("click", () => exPlayer.prev());
  $("#ex-close").addEventListener("click", () => { exPlayer.stop(); $("#exercise-player").classList.add("hidden"); fb.reset(); });
  $("#ex-tempo").addEventListener("input", (e) => {
    exPlayer.setTempo(+e.target.value);
    $("#ex-tempo-val").textContent = e.target.value;
  });

  /* ── tuner ── */
  const tunerNote = $("#tuner-note");
  const tunerTarget = $("#tuner-target");
  const needle = $("#meter-needle");
  const centsLabel = $("#tuner-cents");
  const hint = $("#tuner-hint");
  let lastLit = -1;

  const tuner = new window.Tuner({
    onPitch: (p) => {
      tunerNote.textContent = p.noteName;
      tunerNote.classList.toggle("in-tune", p.inTune);
      tunerTarget.textContent = p.locked
        ? `tuning: ${window.STRING_NAMES[p.stringIdx]} string (${window.STRING_FREQS[p.stringIdx].toFixed(1)} Hz)`
        : `nearest string: ${window.STRING_NAMES[p.stringIdx]} (${window.STRING_FREQS[p.stringIdx].toFixed(1)} Hz)`;
      const clamped = Math.max(-50, Math.min(50, p.stringCents));
      needle.style.left = `${50 + clamped}%`;
      needle.classList.toggle("in-tune", p.inTune);
      centsLabel.textContent = `${p.stringCents > 0 ? "+" : ""}${p.stringCents}¢`;
      if (p.inTune) {
        hint.textContent = `✓ ${window.STRING_NAMES[p.stringIdx]} string is in tune!`;
        hint.classList.add("good");
      } else if (p.locked && Math.abs(p.stringCents) > 250) {
        hint.textContent = `hmm — that sounds like a different string (hearing ${p.noteName})`;
        hint.classList.remove("good");
      } else {
        hint.textContent = p.stringCents < 0 ? "tighten the string (too flat)" : "loosen the string (too sharp)";
        hint.classList.remove("good");
      }
      // light the matching string on the guitar
      if (lastLit !== p.stringIdx) { fb.reset(); lastLit = p.stringIdx; }
      fb.lightString(p.stringIdx, 300, p.inTune ? "lit" : "lit-accent");
    },
    onError: (err) => {
      const msg = err.name === "NotAllowedError"
        ? "Microphone access was blocked. Allow it in your browser's site settings, then try again."
        : `Couldn't open the microphone: ${err.message}`;
      $("#tuner-error").textContent = msg;
      $("#tuner-error").classList.remove("hidden");
    },
  });

  /* string-lock buttons: Auto + one per string */
  (function buildStringSelect() {
    const row = $("#string-select");
    const options = [{ label: "Auto", idx: null }].concat(
      window.STRING_NAMES.map((n, i) => ({ label: n, idx: i }))
    );
    options.forEach((opt, i) => {
      const chip = document.createElement("button");
      chip.className = "chip sm" + (i === 0 ? " active" : "");
      chip.textContent = opt.label;
      chip.addEventListener("click", () => {
        tuner.setLock(opt.idx);
        row.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        fb.reset();
        lastLit = -1;
        if (opt.idx != null) {
          fb.lightString(opt.idx, 1200, "lit-accent");
          hint.textContent = `locked to the ${opt.label} string — pluck it`;
          hint.classList.remove("good");
        } else {
          hint.textContent = "auto-detecting — pluck any string";
          hint.classList.remove("good");
        }
      });
      row.appendChild(chip);
    });
  })();

  function stopTuner() {
    tuner.stop();
    $("#tuner-toggle").textContent = "🎤 Start tuning";
    $("#tuner-display").classList.add("hidden");
    fb.reset();
    lastLit = -1;
  }

  $("#tuner-toggle").addEventListener("click", async () => {
    if (tuner.running) { stopTuner(); return; }
    $("#tuner-error").classList.add("hidden");
    const ok = await tuner.start();
    if (ok) {
      $("#tuner-toggle").textContent = "⏹ Stop tuner";
      $("#tuner-display").classList.remove("hidden");
      caption.textContent = "Pluck one string at a time — it lights amber while off, green when in tune.";
    }
  });

  /* ── songs ── */
  const songPlayer = new window.SongPlayer(fb, {
    chordNow: $("#song-chord"),
    chordNext: $("#song-next"),
    section: $("#song-section"),
    strumRow: $("#strum-row"),
    beatRow: $("#beat-row"),
    playBtn: $("#song-play"),
  });

  const songList = $("#song-list");
  function renderSongs() {
    songList.innerHTML = "";
    window.SONGS.forEach((song) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<h3>${song.title}</h3><p>${song.artist}${song.playingNotes ? " — " + song.playingNotes : ""}</p><span class="tag">${song.tag || "song"}</span>`;
      card.addEventListener("click", () => openSong(song));
      songList.appendChild(card);
    });
  }
  renderSongs();

  function openSong(song) {
    $("#song-player").classList.remove("hidden");
    $("#song-title").textContent = `${song.title} · ${song.artist}`;
    $("#song-tempo").value = song.tempo;
    $("#song-tempo-val").textContent = song.tempo;
    songPlayer.load(song);
    caption.textContent = "The strings pulse with each strum — ↓ down, ↑ up. Mimic what you see.";
    window.scrollTo({ top: 0, behavior: "smooth" }); // player now lives under the guitar
  }

  $("#song-play").addEventListener("click", () => {
    if (songPlayer.playing) { songPlayer.stop(); songPlayer._showSlot(0, { silent: true }); }
    else songPlayer.play();
  });
  $("#song-close").addEventListener("click", () => { songPlayer.stop(); $("#song-player").classList.add("hidden"); fb.reset(); });
  $("#song-tempo").addEventListener("input", (e) => {
    songPlayer.setTempo(+e.target.value);
    $("#song-tempo-val").textContent = e.target.value;
  });

  /* ── modals ── */
  function openModal(id) { $(id).classList.remove("hidden"); }
  function closeModals() { document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden")); }
  document.querySelectorAll(".modal-close").forEach((b) => b.addEventListener("click", closeModals));
  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) closeModals(); }));

  /* API key settings */
  $("#settings-btn").addEventListener("click", () => {
    $("#api-key-input").value = window.FretFlowAI.getKey();
    $("#key-status").textContent = window.FretFlowAI.getKey() ? "A key is saved in this browser." : "No key saved yet.";
    openModal("#key-modal");
  });
  $("#key-save").addEventListener("click", () => {
    window.FretFlowAI.setKey($("#api-key-input").value.trim());
    $("#key-status").textContent = "Saved ✓";
  });
  $("#key-clear").addEventListener("click", () => {
    window.FretFlowAI.setKey("");
    $("#api-key-input").value = "";
    $("#key-status").textContent = "Cleared.";
  });

  /* AI song request */
  $("#ai-request-btn").addEventListener("click", () => {
    if (!window.FretFlowAI.getKey()) { openModal("#key-modal"); return; }
    $("#ai-status").textContent = "";
    openModal("#ai-modal");
    $("#ai-song-input").focus();
  });

  $("#ai-submit").addEventListener("click", submitAIRequest);
  $("#ai-song-input").addEventListener("keydown", (e) => { if (e.key === "Enter") submitAIRequest(); });

  async function submitAIRequest() {
    const query = $("#ai-song-input").value.trim();
    if (!query) return;
    const status = $("#ai-status");
    const btn = $("#ai-submit");
    btn.disabled = true;
    status.textContent = "🎼 Working out the chords… (this can take ~30s)";
    try {
      const song = await window.FretFlowAI.requestSong(query);
      (song.chordShapes || []).forEach(window.registerChord);
      window.SONGS.push(song);
      window.saveAISong(song);
      renderSongs();
      renderChordGrid();
      closeModals();
      $("#ai-song-input").value = "";
      openSong(song);
    } catch (err) {
      status.textContent =
        err.message === "NO_KEY"
          ? "Add your API key first (⚙ in the top bar)."
          : `Something went wrong: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  }

  /* initial state: show a friendly chord */
  fb.showChord(window.CHORDS.Em);
  caption.textContent = "This is E minor — the easiest chord on the guitar. Tap around below to explore.";
})();
