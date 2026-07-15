# 🎸 FretFlow — Guitar Tutor

A minimalist, in-browser guitar tutor. A visual guitar with real strings sits at the top of the screen; everything you do — chords, exercises, songs, tuning — lights up the strings so you can mimic what you see.

## Features

- **Visual guitar** — an always-visible fretboard with six strings. Finger dots show *which finger* goes on *which fret* (1 = index … 4 = pinky), with **O** for open strings and **×** for strings you skip.
- **Chord library** — 10 essential open chords. Tap one to see the shape, hear it strummed, and watch the strings light up in strum order.
- **Beginner exercises** — spider crawl warm-up, C major scale, A minor pentatonic, and a G–C–D chord-change drill. Each has play/pause, step-through, tempo control, and a lit-string + audible pluck for every note.
- **Tuner** — uses your microphone (with your permission) to hear your guitar. Autocorrelation pitch detection with median smoothing shows the note, a cents needle, and tighten/loosen hints. Auto-detects which string you plucked, or lock it to one string for noisy rooms. The matching string on the visual guitar glows amber while you're off and green when you're in tune.
- **1-minute chord changes** — the classic beginner drill, scored. Pick a chord pair (G↔C, Em↔Am, …), tap every time you land the chord, and beat your personal best (saved per pair).
- **Left-handed mode** — the 🫲 button in the top bar mirrors the whole fretboard, nut on the right.
- **Song library** — follow-along mode shows the current chord, the next chord, the beat, and the strumming pattern (↓/↑). Strings pulse with every strum at an adjustable tempo.
- **AI song requests** — ask for any song ("Wonderwall", "a mellow 3-chord song in C") and Claude extracts a beginner arrangement: chords, structure, strumming pattern, playing tips, and fingerings for any chords not already in the library. New songs persist in your browser.

## Running it

No build step, no dependencies. Any static server works:

```sh
npx serve .        # or: python -m http.server 8000
```

Then open http://localhost:3000 (or :8000).

> **Note:** the tuner needs microphone access, which browsers only grant on `localhost` or HTTPS — opening `index.html` directly from disk works for everything *except* the tuner and AI requests. GitHub Pages (HTTPS) works fully.

## Enabling AI song requests

1. Get an Anthropic API key from https://platform.claude.com
2. Click the ⚙ icon in the top bar and paste the key.

The key is stored only in your browser's localStorage and sent only to `api.anthropic.com`. This direct-from-browser setup is intended for personal use — don't ship a shared deployment with your key baked in.

## Tech

Vanilla HTML/CSS/JS — no framework, no bundler.

- `js/fretboard.js` — SVG fretboard renderer (finger dots, string lighting, strum animation)
- `js/tuner.js` — Web Audio microphone capture + ACF2+ autocorrelation pitch detection
- `js/audio.js` — tiny pluck/strum synth so lit strings are audible
- `js/exercises.js`, `js/songs.js` — content + step/beat sequencers
- `js/ai.js` — Anthropic Messages API with structured outputs (guaranteed-valid JSON song format)
