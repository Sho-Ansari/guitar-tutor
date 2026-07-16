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

  /* Shared by both paths: take whatever was parsed, sanitize it, and make
   * sure every chord in the song has a fingering we can draw. */
  function finalizeSong(parsed) {
    const song = window.sanitizeSong(parsed);
    if (!song) throw new Error("That doesn't look like a usable song structure — try again.");
    const known = new Set(song.chordShapes.map((s) => s.name));
    for (const sec of song.sections)
      for (const c of sec.chords)
        if (!known.has(c.chord) && !window.CHORDS[c.chord])
          throw new Error(`No fingering was provided for chord "${c.chord}" — try requesting again.`);
    return song;
  }

  /* ── "Import from Claude" (no API key) ────────────────────────────
   * The user pastes this prompt into a regular claude.ai chat, then pastes
   * Claude's JSON reply back into the app. Same format as the API path. */
  function buildImportPrompt(query) {
    return `${SYSTEM}

Song request: ${query}

Reply with ONLY a single JSON object — no markdown fences, no commentary before or after. Use exactly this shape:

{
  "title": "song title",
  "artist": "artist name",
  "tempo": 90,
  "beatsPerBar": 4,
  "strum": "D-DU-UDU",
  "tag": "short label like '4 chords · pop'",
  "playingNotes": "one or two sentences of playing advice",
  "sections": [
    { "name": "Verse", "chords": [ { "chord": "G", "beats": 4 }, { "chord": "C", "beats": 4 } ] }
  ],
  "chordShapes": [
    { "name": "G", "frets": [3, 2, 0, 0, 0, 3], "fingers": [2, 1, 0, 0, 0, 3] }
  ]
}

Rules for the JSON:
- "beatsPerBar" is 3 or 4. "strum" is exactly beatsPerBar*2 characters, each "D" (down), "U" (up), or "-" (no strum).
- "chordShapes" must include EVERY chord name used in "sections". "frets" and "fingers" are 6 entries ordered low E string to high e string; fret -1 = muted, 0 = open; finger 0 = none, 1-4 = index-pinky.`;
  }

  /* Pull the JSON out of whatever the user pasted (Claude sometimes wraps it
   * in prose or a \`\`\`json fence), then validate it like an API response. */
  function importSong(pasted) {
    let text = String(pasted || "").trim();
    if (!text) throw new Error("Paste Claude's reply first.");
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1];
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("Couldn't find a JSON object in that paste.");
    let parsed;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch (_) {
      throw new Error("That JSON didn't parse — copy Claude's whole reply and paste it again.");
    }
    return finalizeSong(parsed);
  }

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

    // Treat the response as untrusted: same sanitize + fingering check
    // as the paste-import path.
    return finalizeSong(JSON.parse(textBlock.text));
  }

  return { requestSong, getKey, setKey, buildImportPrompt, importSong };
})();
