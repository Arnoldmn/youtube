// Generates side-profile sneaker SVGs from a colorway, so the store needs no image hosting.
(function (root) {
  const UPPERS = {
    low: "M34 176 C30 150 44 132 74 126 L140 116 C160 98 182 86 214 84 C246 82 262 94 286 108 C318 126 352 140 366 158 L370 176 Z",
    runner: "M30 176 C28 152 40 136 70 128 L146 112 C168 92 192 78 224 78 C254 78 270 92 292 108 C326 130 356 140 370 160 L372 176 Z",
    high: "M34 176 C30 150 44 132 74 126 L140 114 C158 96 176 80 200 62 C214 40 246 30 286 32 C300 34 304 56 306 84 C330 112 358 136 368 156 L370 176 Z",
  };
  const COLLARS = {
    low: "M214 86 C238 82 266 96 284 110",
    runner: "M224 80 C252 80 270 94 290 108",
    high: "M210 52 C240 36 276 34 296 38",
  };
  const LACES = {
    low: [[150, 120, 162, 106], [166, 114, 178, 100], [182, 108, 194, 94], [198, 102, 210, 88]],
    runner: [[154, 116, 166, 100], [170, 110, 182, 94], [186, 104, 198, 88], [202, 98, 214, 82]],
    high: [[150, 118, 160, 102], [164, 110, 174, 94], [178, 100, 188, 82], [192, 88, 202, 68], [206, 76, 216, 54]],
  };

  function shoeSVG(colorway, silhouette = "low", { title = "" } = {}) {
    const { upper, sole, accent, laces } = colorway;
    const s = UPPERS[silhouette] ? silhouette : "low";
    const laceLines = LACES[s]
      .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`)
      .join("");
    const isRunner = s === "runner";
    return `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
  <ellipse cx="200" cy="214" rx="170" ry="10" fill="rgba(0,0,0,.18)"/>
  <path d="${UPPERS[s]}" fill="${upper}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <path d="M34 176 C32 160 42 146 62 140 L104 136 C96 152 96 166 100 176 Z" fill="rgba(0,0,0,.12)"/>
  <path d="${COLLARS[s]}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="6" stroke-linecap="round"/>
  <path d="M112 166 C190 162 268 140 344 118 L352 132 C276 162 194 180 114 180 Z" fill="${accent}"/>
  <path d="M330 122 C344 132 356 144 364 160 L370 176 L340 176 C344 158 340 140 330 122 Z" fill="${accent}" opacity=".85"/>
  <g stroke="${laces}" stroke-width="5" stroke-linecap="round">${laceLines}</g>
  <path d="M24 176 L376 176 C380 188 376 200 360 204 L46 204 C28 202 22 190 24 176 Z" fill="${sole}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <path d="M30 196 L372 196" stroke="rgba(0,0,0,.18)" stroke-width="3" ${isRunner ? 'stroke-dasharray="14 8"' : ""}/>
  <circle cx="320" cy="150" r="7" fill="${laces}" opacity=".9"/>
</svg>`;
  }

  root.shoeSVG = shoeSVG;
})(typeof window !== "undefined" ? window : globalThis);
