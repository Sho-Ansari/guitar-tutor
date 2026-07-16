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
  function activateTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    $(`#panel-${name}`).classList.add("active");
    exPlayer.pause();
    songPlayer.stop();
    pickPlayer.stop();
    trainer.stop();
    stopEar();
    if (name !== "tuner" && tuner.running) stopTuner();
    fb.reset();
    caption.textContent = "";
  }
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
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

  $("#ex-play").addEventListener("click", () => {
    if (earMode === "exercise") { stopEar(); $("#ex-heard").textContent = ""; }
    exPlayer.playing ? exPlayer.pause() : exPlayer.play();
  });
  $("#ex-next").addEventListener("click", () => exPlayer.next());
  $("#ex-prev").addEventListener("click", () => exPlayer.prev());
  $("#ex-close").addEventListener("click", () => {
    stopEar();
    $("#ex-heard").textContent = "";
    exPlayer.stop();
    $("#exercise-player").classList.add("hidden");
    fb.reset();
  });
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
    stopEar(); // only one mic consumer at a time
    $("#tuner-error").classList.add("hidden");
    const ok = await tuner.start();
    if (ok) {
      $("#tuner-toggle").textContent = "⏹ Stop tuner";
      $("#tuner-display").classList.remove("hidden");
      caption.textContent = "Pluck one string at a time — it lights amber while off, green when in tune.";
    }
  });

  /* ── live listening (mic) for chords + exercises ── */
  let earMode = null; // null | "chord" | "exercise"
  let earStreak = 0;
  let earHoldUntil = 0;

  const ear = new window.Ear({
    onFrame: (f) => {
      if (earMode === "chord") chordFrame(f);
      else if (earMode === "exercise") exerciseFrame(f);
    },
    onError: (err) => {
      const msg = err.name === "NotAllowedError"
        ? "Microphone blocked — allow it in your browser's site settings."
        : `Mic error: ${err.message}`;
      if (earMode === "chord") $("#chord-verdict").textContent = msg;
      if (earMode === "exercise") $("#ex-heard").textContent = msg;
      stopEar();
    },
  });

  async function startEar(mode) {
    stopEar();
    if (tuner.running) stopTuner();
    earMode = mode;
    earStreak = 0;
    earHoldUntil = 0;
    const ok = await ear.start();
    if (!ok) { earMode = null; return false; }
    return true;
  }

  function stopEar() {
    if (ear.running) ear.stop();
    earMode = null;
    $("#chord-listen").classList.remove("listen-on");
    $("#ex-listen").classList.remove("listen-on");
    exPlayer.silent = false;
  }

  /* Chords tab: does the strum sound like the selected chord? */
  function chordFrame({ rms, chroma }) {
    if (!currentChord) return;
    const out = $("#chord-verdict");
    const now = performance.now();
    if (now < earHoldUntil) return;
    if (rms < 0.015) {
      out.textContent = "🎤 listening — strum the chord…";
      out.classList.remove("good");
      earStreak = 0;
      return;
    }
    const v = window.Ear.verdict(chroma, currentChord.name);
    if (v.match) {
      if (++earStreak >= 8) {
        out.textContent = `✓ that sounds like ${currentChord.name}!`;
        out.classList.add("good");
        fb.lightChord(currentChord, "D", 600);
        earStreak = 0;
        earHoldUntil = now + 1200; // let the confirmation breathe
      }
    } else {
      earStreak = 0;
      out.classList.remove("good");
      out.textContent = v.best && v.best.cov > 0.45
        ? `hearing something closer to ${v.best.name} — check each finger and strum again`
        : "…can't tell yet — strum all the strings evenly";
    }
  }

  /* Exercises: play the shown note (or chord) to advance */
  function exerciseFrame({ rms, freq, chroma }) {
    const out = $("#ex-heard");
    const step = exPlayer.exercise && exPlayer.exercise.steps[exPlayer.index];
    if (!step) return;
    const now = performance.now();
    if (now < earHoldUntil) return;

    if (step.type === "chord") {
      if (rms < 0.015) { out.textContent = `🎤 strum ${step.chord} to advance…`; earStreak = 0; return; }
      const v = window.Ear.verdict(chroma, step.chord);
      if (v.match) {
        if (++earStreak >= 8) advanceListen();
      } else {
        earStreak = 0;
        out.textContent = v.best && v.best.cov > 0.45 ? `hearing ${v.best.name}…` : "listening…";
      }
      return;
    }

    // single note
    if (freq <= 0 || rms < 0.012) { out.textContent = "🎤 pluck the lit string to advance…"; earStreak = 0; return; }
    const expMidi = window.Ear.OPEN_MIDI[step.string] + step.fret;
    const expFreq = 440 * Math.pow(2, (expMidi - 69) / 12);
    const cents = 1200 * Math.log2(freq / expFreq);
    if (Math.abs(cents) < 40) {
      if (++earStreak >= 4) advanceListen();
    } else {
      earStreak = 0;
      const heardMidi = Math.round(69 + 12 * Math.log2(freq / 440));
      out.textContent = `heard ${window.Ear.noteName(heardMidi)} — aim for ${window.Ear.noteName(expMidi)}`;
    }
  }

  function advanceListen() {
    earStreak = 0;
    earHoldUntil = performance.now() + 700; // ignore the ring-out of the note just played
    const step = exPlayer.exercise.steps[exPlayer.index];
    if (step.type === "note") fb.lightString(step.string, 500);
    else fb.lightChord(window.getChord(step.chord), "D", 500);
    const out = $("#ex-heard");
    out.textContent = "✓ got it — next…";
    out.classList.add("good");
    setTimeout(() => {
      if (earMode !== "exercise") return;
      out.classList.remove("good");
      exPlayer.next();
    }, 450);
  }

  $("#chord-listen").addEventListener("click", async () => {
    if (earMode === "chord") { stopEar(); $("#chord-verdict").textContent = ""; return; }
    if (!currentChord) return;
    if (await startEar("chord")) {
      $("#chord-listen").classList.add("listen-on");
      $("#chord-verdict").textContent = "🎤 listening — strum the chord…";
    }
  });

  $("#ex-listen").addEventListener("click", async () => {
    if (earMode === "exercise") { stopEar(); $("#ex-heard").textContent = ""; return; }
    exPlayer.pause();
    if (await startEar("exercise")) {
      $("#ex-listen").classList.add("listen-on");
      exPlayer.silent = true;
      $("#ex-heard").textContent = "🎤 play the shown note to advance";
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
    window.SONGS.filter((s) => s.style !== "picking").forEach((song) => {
      // Song fields can come from the AI or localStorage — never innerHTML them
      const card = document.createElement("div");
      card.className = "card";
      const h3 = document.createElement("h3");
      h3.textContent = song.title;
      const p = document.createElement("p");
      p.textContent = song.artist + (song.playingNotes ? " — " + song.playingNotes : "");
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = song.tag || "song";
      card.append(h3, p, tag);
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

  /* ── fingerpicking tab: same engine, picking songs only ── */
  const pickPlayer = new window.SongPlayer(fb, {
    chordNow: $("#pk-chord"),
    chordNext: $("#pk-next"),
    section: $("#pk-section"),
    strumRow: $("#pk-strum-row"),
    beatRow: $("#pk-beat-row"),
    playBtn: $("#pk-play"),
  });

  const pickList = $("#pick-list");
  function renderPickingSongs() {
    pickList.innerHTML = "";
    window.SONGS.filter((s) => s.style === "picking").forEach((song) => {
      const card = document.createElement("div");
      card.className = "card";
      const h3 = document.createElement("h3");
      h3.textContent = song.title;
      const p = document.createElement("p");
      p.textContent = song.artist + (song.playingNotes ? " — " + song.playingNotes : "");
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = song.tag || "fingerstyle";
      card.append(h3, p, tag);
      card.addEventListener("click", () => openPickSong(song));
      pickList.appendChild(card);
    });
  }
  renderPickingSongs();

  function openPickSong(song) {
    $("#pick-player").classList.remove("hidden");
    $("#pk-title").textContent = `${song.title} · ${song.artist}`;
    $("#pk-tempo").value = song.tempo;
    $("#pk-tempo-val").textContent = song.tempo;
    pickPlayer.load(song);
    caption.textContent = "One string lights per pluck — p is your thumb on the bass, i·m·a pick the trebles.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("#pk-play").addEventListener("click", () => {
    if (pickPlayer.playing) { pickPlayer.stop(); pickPlayer._showSlot(0, { silent: true }); }
    else pickPlayer.play();
  });
  $("#pk-close").addEventListener("click", () => { pickPlayer.stop(); $("#pick-player").classList.add("hidden"); fb.reset(); });
  $("#pk-tempo").addEventListener("input", (e) => {
    pickPlayer.setTempo(+e.target.value);
    $("#pk-tempo-val").textContent = e.target.value;
  });

  /* ── modals ── */
  function openModal(id) { $(id).classList.remove("hidden"); }
  function closeModals() { document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden")); }
  document.querySelectorAll(".modal-close").forEach((b) => b.addEventListener("click", closeModals));
  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) closeModals(); }));

  /* API key settings */
  $("#settings-btn").addEventListener("click", () => {
    // never echo the saved key back into the DOM
    $("#api-key-input").value = "";
    const hasKey = !!window.FretFlowAI.getKey();
    $("#api-key-input").placeholder = hasKey ? "•••••••• a key is saved — paste to replace" : "sk-ant-...";
    $("#key-status").textContent = hasKey ? "A key is saved in this browser." : "No key saved yet.";
    openModal("#key-modal");
  });
  $("#key-save").addEventListener("click", () => {
    const val = $("#api-key-input").value.trim();
    if (!val) { $("#key-status").textContent = "Paste a key first (or Clear to remove the saved one)."; return; }
    window.FretFlowAI.setKey(val);
    $("#api-key-input").value = "";
    $("#key-status").textContent = "Saved ✓";
  });
  $("#key-clear").addEventListener("click", () => {
    window.FretFlowAI.setKey("");
    $("#api-key-input").value = "";
    $("#key-status").textContent = "Cleared.";
  });

  /* AI song request */
  function openAIModal(hint) {
    if (!window.FretFlowAI.getKey()) { openModal("#key-modal"); return; }
    styleHint = hint;
    $("#ai-status").textContent = "";
    openModal("#ai-modal");
    $("#ai-song-input").focus();
  }
  $("#ai-request-btn").addEventListener("click", () => openAIModal(""));
  $("#ai-pick-btn").addEventListener("click", () => openAIModal("picking"));

  /* Shared by API requests and paste-imports: register shapes, verify
   * playability, persist, re-render, and open the new song. */
  function addSongToLibrary(song) {
    (song.chordShapes || []).forEach(window.registerChord);
    // registerChord rejects malformed shapes — make sure nothing is left unplayable
    for (const sec of song.sections)
      for (const c of sec.chords)
        if (!window.CHORDS[c.chord])
          throw new Error(`chord "${c.chord}" came back malformed — try requesting again.`);
    window.SONGS.push(song);
    window.saveAISong(song);
    renderSongs();
    renderPickingSongs();
    renderChordGrid();
    closeModals();
    // land the user in the right tab for the song's style
    if (song.style === "picking") { activateTab("picking"); openPickSong(song); }
    else { activateTab("songs"); openSong(song); }
  }

  /* Requests started from the Picking tab nudge the AI toward fingerstyle */
  let styleHint = "";
  const withStyleHint = (query) =>
    styleHint === "picking"
      ? `${query} — arrange as FINGERSTYLE (style "picking" with a one-bar picking pattern)`
      : query;

  /* Import from Claude (no API key): copy prompt → paste reply */
  function openImportModal(hint) {
    styleHint = hint;
    $("#import-status").textContent = "";
    openModal("#import-modal");
    $("#import-song-input").focus();
  }
  $("#import-btn").addEventListener("click", () => openImportModal(""));
  $("#import-pick-btn").addEventListener("click", () => openImportModal("picking"));

  $("#import-copy").addEventListener("click", async () => {
    const query = $("#import-song-input").value.trim();
    const status = $("#import-status");
    if (!query) { status.textContent = "Type a song name first."; return; }
    const prompt = window.FretFlowAI.buildImportPrompt(withStyleHint(query));
    try {
      await navigator.clipboard.writeText(prompt);
      status.textContent = "✓ Prompt copied — paste it into a claude.ai chat, then bring the reply back here.";
    } catch (_) {
      // clipboard blocked (permissions/insecure context) — show it for manual copy
      $("#import-paste").value = prompt;
      status.textContent = "Couldn't access the clipboard — the prompt is in the box below. Copy it, send it to Claude, then replace it with Claude's reply.";
    }
  });

  $("#import-submit").addEventListener("click", () => {
    const status = $("#import-status");
    try {
      const song = window.FretFlowAI.importSong($("#import-paste").value);
      addSongToLibrary(song);
      $("#import-paste").value = "";
      $("#import-song-input").value = "";
    } catch (err) {
      status.textContent = err.message;
    }
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
      const song = await window.FretFlowAI.requestSong(withStyleHint(query));
      addSongToLibrary(song);
      $("#ai-song-input").value = "";
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
