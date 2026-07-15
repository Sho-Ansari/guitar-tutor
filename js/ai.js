/* AI song requests — calls the Anthropic API directly from the browser.
 * The user's API key lives only in localStorage and is sent only to api.anthropic.com.
 * Structured outputs (output_config.format) guarantee the response is valid JSON
 * matching SONG_SCHEMA, so no fragile text parsing is needed. */
window.FretFlowAI = (() => {
  const KEY_STORAGE = "fretflow.apiKey";
  const MODEL = "claude-opus-4-8";

  const SONG_SCHEMA = {
    type: "object",
    properties: {
      title: { type: "string" },
      artist: { type: "string" },
      tempo: { type: "integer", description: "Beats per minute, typically 60-140" },
      beatsPerBar: { type: "integer", enum: [3, 4] },
      strum: {
        type: "string",
        description:
          "One bar of eighth-note strum slots. Exactly beatsPerBar*2 characters, each 'D' (down), 'U' (up), or '-' (no strum). Example for 4/4: 'D-DU-UDU'",
      },
      tag: { type: "string", description: "Short difficulty/vibe label, e.g. '4 chords · pop'" },
      playingNotes: { type: "string", description: "One or two sentences of playing advice: picking vs strumming, capo, tricky changes." },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "e.g. Intro, Verse, Chorus" },
            chords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  chord: { type: "string", description: "Chord name, e.g. G, Am, F, B7" },
                  beats: { type: "integer", description: "How many beats to hold this chord (usually one bar)" },
                },
                required: ["chord", "beats"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "chords"],
          additionalProperties: false,
        },
      },
      chordShapes: {
        type: "array",
        description:
          "Fingering for EVERY chord used in the song. frets/fingers are 6 entries ordered low E to high e. fret -1 = muted, 0 = open. finger 0 = none, 1-4 = index-pinky.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            frets: { type: "array", items: { type: "integer" } },
            fingers: { type: "array", items: { type: "integer" } },
          },
          required: ["name", "frets", "fingers"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "artist", "tempo", "beatsPerBar", "strum", "tag", "playingNotes", "sections", "chordShapes"],
    additionalProperties: false,
  };

  const SYSTEM = `You are a guitar teacher preparing songs for a beginner-friendly practice app.
Given a song request, produce a simplified beginner arrangement:
- Prefer open chords (G, C, D, E, Em, Am, A, Dm, F small shape, B7). Transpose or simplify (e.g. suggest a capo in playingNotes) to avoid barre chords when possible.
- Keep one chord per bar where you can; use the song's real progression and structure (intro/verse/chorus) at a simplified level.
- The strum pattern must be exactly beatsPerBar*2 characters of D, U, or -.
- chordShapes must include every chord that appears in sections, with accurate standard-tuning fingerings.
- If the request is vague, invent a pleasant simple progression that fits the description.`;

  function getKey() { return localStorage.getItem(KEY_STORAGE) || ""; }
  function setKey(k) { k ? localStorage.setItem(KEY_STORAGE, k) : localStorage.removeItem(KEY_STORAGE); }

  async function requestSong(query) {
    const key = getKey();
    if (!key) throw new Error("NO_KEY");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        output_config: { format: { type: "json_schema", schema: SONG_SCHEMA } },
        messages: [{ role: "user", content: `Song request: ${query}` }],
      }),
    });

    if (!res.ok) {
      let detail = `${res.status}`;
      try { detail = (await res.json()).error.message; } catch (_) { /* keep status */ }
      throw new Error(detail);
    }

    const data = await res.json();
    if (data.stop_reason === "refusal") throw new Error("The AI declined this request — try a different song.");
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) throw new Error("Empty response from the AI.");

    const song = JSON.parse(textBlock.text);
    validate(song);
    return song;
  }

  function validate(song) {
    const expected = song.beatsPerBar * 2;
    if (song.strum.length !== expected) {
      // pad or trim rather than fail — the schema constrains chars poorly
      song.strum = (song.strum + "-".repeat(expected)).slice(0, expected);
    }
    song.strum = [...song.strum].map((c) => (c === "D" || c === "U" ? c : "-")).join("");
    for (const shape of song.chordShapes) {
      if (shape.frets.length !== 6 || shape.fingers.length !== 6) {
        throw new Error(`The AI returned a bad shape for chord "${shape.name}" — try requesting again.`);
      }
    }
    const known = new Set(song.chordShapes.map((s) => s.name));
    for (const sec of song.sections)
      for (const c of sec.chords)
        if (!known.has(c.chord) && !window.CHORDS[c.chord])
          throw new Error(`No fingering was provided for chord "${c.chord}" — try requesting again.`);
  }

  return { requestSong, getKey, setKey };
})();
