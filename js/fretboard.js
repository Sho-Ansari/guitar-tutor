/* Interactive fretboard rendered as SVG.
 * String index convention everywhere: 0 = low E (bottom of screen) … 5 = high e (top). */
window.Fretboard = class Fretboard {
  constructor(container, frets = 12) {
    this.container = container;
    this.frets = frets;
    this.nutX = 90;
    this.rightX = 985;
    this.fretW = (this.rightX - this.nutX) / frets;
    this.topY = 32;
    this.stringGap = 32;
    this.stringEls = [];
    this.lightTimers = [[], [], [], [], [], []];
    this._render();
  }

  yFor(string) {
    // low E (0) at the bottom, high e (5) at the top — like looking at your own guitar
    return this.topY + (5 - string) * this.stringGap;
  }
  xFor(fret) {
    return this.nutX + (fret - 0.5) * this.fretW;
  }

  _render() {
    const NS = "http://www.w3.org/2000/svg";
    const h = this.topY + 5 * this.stringGap + 34;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 1000 ${h}`);
    this.svg = svg;

    const el = (tag, attrs, parent = svg) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      parent.appendChild(e);
      return e;
    };
    this._el = el;

    // board background
    el("rect", { x: this.nutX, y: this.topY - 14, width: this.rightX - this.nutX, height: 5 * this.stringGap + 28, rx: 6, fill: "#241a12" });

    // frets
    for (let f = 0; f <= this.frets; f++) {
      const x = this.nutX + f * this.fretW;
      el("line", { x1: x, y1: this.topY - 14, x2: x, y2: this.topY + 5 * this.stringGap + 14, stroke: f === 0 ? "#d8cfc0" : "#4a4136", "stroke-width": f === 0 ? 7 : 2.5 });
    }

    // inlay dots
    const midY = this.topY + 2.5 * this.stringGap;
    [3, 5, 7, 9].forEach((f) => el("circle", { cx: this.xFor(f), cy: midY, r: 5, fill: "#3b332a" }));
    el("circle", { cx: this.xFor(12), cy: midY - 32, r: 5, fill: "#3b332a" });
    el("circle", { cx: this.xFor(12), cy: midY + 32, r: 5, fill: "#3b332a" });

    // fret numbers
    [3, 5, 7, 9, 12].forEach((f) =>
      el("text", { x: this.xFor(f), y: h - 4, "text-anchor": "middle", fill: "#5c5b66", "font-size": 12, "font-family": "Sora, sans-serif" }).textContent = f
    );

    // strings + labels
    const widths = [4.6, 3.8, 3.0, 2.4, 1.8, 1.3]; // low E … high e
    for (let s = 0; s < 6; s++) {
      const y = this.yFor(s);
      el("text", { x: 26, y: y + 4, "text-anchor": "middle", fill: "#9a99a3", "font-size": 15, "font-family": "Fraunces, serif", "font-weight": 600 }).textContent = window.STRING_NAMES[s];
      const line = el("line", { x1: this.nutX, y1: y, x2: this.rightX, y2: y, stroke: "#b8ad98", "stroke-width": widths[s], "stroke-linecap": "round", class: "fb-string" });
      this.stringEls[s] = line;
    }

    // overlay group for chord dots / markers
    const NSg = document.createElementNS(NS, "g");
    svg.appendChild(NSg);
    this.overlay = NSg;

    this.container.innerHTML = "";
    this.container.appendChild(svg);
  }

  clearOverlay() {
    this.overlay.innerHTML = "";
  }

  clearLights() {
    for (let s = 0; s < 6; s++) {
      this.lightTimers[s].forEach(clearTimeout);
      this.lightTimers[s] = [];
      this.stringEls[s].classList.remove("lit", "lit-accent");
    }
  }

  reset() {
    this.clearOverlay();
    this.clearLights();
  }

  /* Light a string green (or amber with cls="lit-accent") for `dur` ms */
  lightString(string, dur = 700, cls = "lit") {
    const elS = this.stringEls[string];
    elS.classList.remove("lit", "lit-accent");
    void elS.getBBox && elS.getBoundingClientRect(); // restart transition
    elS.classList.add(cls);
    const t = setTimeout(() => elS.classList.remove(cls), dur);
    this.lightTimers[string].push(t);
  }

  /* Draw a finger dot at string/fret. fret 0 handled as open marker. */
  dot(string, fret, finger, color = "var(--accent)") {
    if (fret <= 0) return;
    const x = this.xFor(Math.min(fret, this.frets));
    const y = this.yFor(string);
    const g = this._el("g", { class: "fb-dot pulse", style: `transform-origin:${x}px ${y}px` }, this.overlay);
    this._el("circle", { cx: x, cy: y, r: 13, fill: color }, g);
    if (finger > 0) {
      const t = this._el("text", { x, y: y + 5, "text-anchor": "middle", fill: "#241703", "font-size": 14, "font-weight": 700, "font-family": "Sora, sans-serif" }, g);
      t.textContent = finger;
    }
    return g;
  }

  /* Open (O) / muted (×) markers to the left of the nut */
  nutMarker(string, type) {
    const x = 62;
    const y = this.yFor(string);
    if (type === "open") {
      this._el("circle", { cx: x, cy: y, r: 8, fill: "none", stroke: "#7ee08a", "stroke-width": 2 }, this.overlay);
    } else {
      const t = this._el("text", { x, y: y + 6, "text-anchor": "middle", fill: "#e0707a", "font-size": 18, "font-weight": 700, "font-family": "Sora, sans-serif" }, this.overlay);
      t.textContent = "×";
    }
  }

  /* Show a full chord shape: dots, O/× markers */
  showChord(chord, { light = false } = {}) {
    this.reset();
    for (let s = 0; s < 6; s++) {
      const f = chord.frets[s];
      if (f === -1) this.nutMarker(s, "mute");
      else if (f === 0) this.nutMarker(s, "open");
      else this.dot(s, f, chord.fingers[s]);
    }
    if (light) this.lightChord(chord, "D");
  }

  /* Light the played strings of a chord in strum order */
  lightChord(chord, dir = "D", dur = 800) {
    const order = [];
    for (let s = 0; s < 6; s++) if (chord.frets[s] >= 0) order.push(s);
    if (dir === "U") order.reverse();
    order.forEach((s, i) => {
      const t = setTimeout(() => this.lightString(s, dur), i * 35);
      this.lightTimers[s].push(t);
    });
  }

  /* Show a single note (exercise step): one dot + lit string */
  showNote(string, fret, finger) {
    this.clearOverlay();
    this.clearLights();
    if (fret === 0) this.nutMarker(string, "open");
    else this.dot(string, fret, finger);
    this.lightString(string, 800);
  }
};
