// Generated product illustrations, so the shop looks complete before real photos
// are added. Colours come from each colorway: main, accent and detail.
(function (root) {
  const OUTLINE = 'stroke="rgba(40,20,20,.22)" stroke-width="2" stroke-linejoin="round"';
  const shadow = (cy = 350, rx = 140) => `<ellipse cx="200" cy="${cy}" rx="${rx}" ry="12" fill="rgba(60,30,30,.12)"/>`;

  const SHAPES = {
    heel: ({ main, accent, detail }) => `${shadow(338, 150)}
      <path d="M296 248 L318 242 L313 334 L303 334 Z" fill="${accent}" ${OUTLINE}/>
      <rect x="300" y="330" width="16" height="6" rx="2" fill="${detail}"/>
      <path d="M50 290 C50 262 80 250 120 246 C170 240 210 232 250 212 L300 186 C318 180 330 190 330 206 L326 240 C300 250 270 262 240 280 C200 300 120 306 70 304 C56 302 50 298 50 290 Z" fill="${main}" ${OUTLINE}/>
      <path d="M150 246 C200 236 250 220 300 192 C308 189 316 193 314 202 C290 216 260 232 230 246 C200 258 170 258 150 246 Z" fill="${accent}" opacity=".75"/>
      <path d="M70 304 C120 306 200 300 240 280 C270 262 300 250 326 240 L328 250 C302 260 272 274 244 292 C204 314 120 318 72 313 Z" fill="${accent}"/>
      <path d="M92 270 C120 262 150 258 176 258" stroke="rgba(255,255,255,.45)" stroke-width="5" fill="none" stroke-linecap="round"/>`,

    sneaker: ({ main, accent, detail }) => `${shadow(330, 160)}
      <g transform="translate(0 110)">
      <path d="M34 176 C30 150 44 132 74 126 L140 116 C160 98 182 86 214 84 C246 82 262 94 286 108 C318 126 352 140 366 158 L370 176 Z" fill="${main}" ${OUTLINE}/>
      <path d="M214 86 C238 82 266 96 284 110" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="6" stroke-linecap="round"/>
      <path d="M112 166 C190 162 268 140 344 118 L352 132 C276 162 194 180 114 180 Z" fill="${accent}"/>
      <g stroke="${detail}" stroke-width="5" stroke-linecap="round"><line x1="150" y1="120" x2="162" y2="106"/><line x1="166" y1="114" x2="178" y2="100"/><line x1="182" y1="108" x2="194" y2="94"/></g>
      <path d="M20 170 L378 170 C384 190 378 206 360 212 L46 212 C26 210 16 192 20 170 Z" fill="#ffffff" ${OUTLINE}/>
      <path d="M26 196 L374 196" stroke="${accent}" stroke-width="4"/>
      </g>`,

    boot: ({ main, accent, detail }) => `${shadow(346, 150)}
      <path d="M284 300 L324 300 L319 340 L290 340 Z" fill="${accent}" ${OUTLINE}/>
      <path d="M196 56 L292 56 L298 220 C302 240 312 252 322 264 L328 302 L118 306 C68 306 48 298 50 282 C52 264 80 256 120 252 C160 248 186 236 196 208 Z" fill="${main}" ${OUTLINE}/>
      <rect x="194" y="56" width="100" height="18" rx="3" fill="${accent}"/>
      <path d="M236 78 L240 226" stroke="${detail}" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="240" cy="80" r="5" fill="${detail}"/>
      <path d="M50 296 C80 306 200 308 328 300 L328 310 C200 318 80 316 52 306 Z" fill="${accent}"/>
      <path d="M210 100 C214 150 212 190 200 220" stroke="rgba(255,255,255,.3)" stroke-width="6" fill="none" stroke-linecap="round"/>`,

    flat: ({ main, accent, detail }) => `${shadow(330, 150)}
      <path d="M60 290 C60 266 90 256 130 254 L300 248 C330 248 346 262 346 280 C346 296 334 304 312 304 L90 306 C70 306 60 300 60 290 Z" fill="${main}" ${OUTLINE}/>
      <path d="M150 262 C200 252 280 250 322 258 C328 266 324 274 312 274 L162 278 C150 276 146 268 150 262 Z" fill="${accent}" opacity=".8"/>
      <path d="M62 296 C70 306 300 306 344 290 L344 300 C330 312 90 316 64 306 Z" fill="${accent}"/>
      <g fill="${detail}"><path d="M150 266 L132 256 L132 278 Z"/><path d="M150 266 L168 256 L168 278 Z"/><circle cx="150" cy="267" r="5"/></g>`,

    dress: ({ main, accent, detail }) => `${shadow(356, 110)}
      <path d="M200 28 C190 28 186 40 196 44 L200 50 M120 74 L200 50 L280 74" fill="none" stroke="${detail}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M160 72 L172 72 L180 118 L220 118 L228 72 L240 72 L248 130 C252 150 242 165 234 175 C262 230 292 290 304 342 C240 356 160 356 96 342 C108 290 138 230 166 175 C158 165 148 150 152 130 Z" fill="${main}" ${OUTLINE}/>
      <path d="M166 172 L234 172 L232 186 L168 186 Z" fill="${accent}"/>
      <g stroke="${accent}" stroke-width="3" fill="none" opacity=".8"><path d="M185 190 C170 250 150 300 140 344"/><path d="M215 190 C230 250 250 300 260 344"/><path d="M200 190 L200 350"/></g>
      <circle cx="200" cy="179" r="5" fill="${detail}"/>`,

    top: ({ main, accent, detail }) => `${shadow(340, 110)}
      <path d="M150 80 C166 92 234 92 250 80 L304 104 L336 196 L298 210 L278 160 L278 322 L122 322 L122 160 L102 210 L64 196 L96 104 Z" fill="${main}" ${OUTLINE}/>
      <path d="M150 80 C166 112 234 112 250 80" fill="none" stroke="${accent}" stroke-width="6"/>
      <g fill="${accent}"><path d="M200 106 L172 92 L176 124 Z"/><path d="M200 106 L228 92 L224 124 Z"/><path d="M196 108 L182 160 L194 158 L200 112 Z"/><path d="M204 108 L218 160 L206 158 L200 112 Z"/></g>
      <circle cx="200" cy="106" r="6" fill="${detail}"/>
      <path d="M122 300 L278 300" stroke="${accent}" stroke-width="4"/>`,

    jacket: ({ main, accent, detail }) => `${shadow(356, 120)}
      <path d="M150 64 L250 64 L308 92 L342 290 L304 298 L282 170 L284 344 L116 344 L118 170 L96 298 L58 290 L92 92 Z" fill="${main}" ${OUTLINE}/>
      <path d="M150 64 L200 200 L200 344" fill="none" stroke="rgba(40,20,20,.25)" stroke-width="3"/>
      <path d="M150 64 L200 200 L166 200 L132 110 L156 100 Z" fill="${accent}" ${OUTLINE}/>
      <path d="M250 64 L200 200 L234 200 L268 110 L244 100 Z" fill="${accent}" ${OUTLINE}/>
      <g fill="${detail}"><circle cx="212" cy="236" r="7"/><circle cx="212" cy="274" r="7"/></g>
      <path d="M136 260 L176 260 M224 260 L264 260" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>`,

    skirt: ({ main, accent, detail }) => `${shadow(346, 120)}
      <path d="M140 124 L260 124 L312 330 C240 344 160 344 88 330 Z" fill="${main}" ${OUTLINE}/>
      <g stroke="${accent}" stroke-width="3">${[0, 1, 2, 3, 4, 5, 6, 7, 8]
        .map((i) => `<line x1="${148 + i * 13}" y1="126" x2="${100 + i * 25}" y2="334"/>`)
        .join("")}</g>
      <rect x="136" y="100" width="128" height="28" rx="6" fill="${accent}" ${OUTLINE}/>
      <rect x="190" y="104" width="20" height="20" rx="3" fill="none" stroke="${detail}" stroke-width="3"/>`,

    tote: ({ main, accent, detail }) => `${shadow(350, 140)}
      <path d="M140 176 C140 80 260 80 260 176" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
      <path d="M90 170 L310 170 L332 338 L68 338 Z" fill="${main}" ${OUTLINE}/>
      <path d="M90 170 L310 170 L313 194 L87 194 Z" fill="${accent}"/>
      <g fill="${detail}"><circle cx="140" cy="182" r="8"/><circle cx="260" cy="182" r="8"/></g>
      <rect x="172" y="236" width="56" height="22" rx="4" fill="${detail}"/>
      <path d="M96 210 L82 326" stroke="rgba(255,255,255,.3)" stroke-width="6" stroke-linecap="round"/>`,

    clutch: ({ main, accent, detail }) => `${shadow(340, 150)}
      <path d="M90 186 C90 110 310 110 310 186" fill="none" stroke="#d4af37" stroke-width="4" stroke-dasharray="7 5"/>
      <rect x="62" y="180" width="276" height="140" rx="18" fill="${main}" ${OUTLINE}/>
      <path d="M64 196 C120 236 160 262 200 270 C240 262 280 236 336 196 L336 192 C336 184 330 180 322 180 L78 180 C70 180 64 184 64 192 Z" fill="${accent}" ${OUTLINE}/>
      <g fill="${detail}" stroke="rgba(0,0,0,.15)"><circle cx="200" cy="270" r="11"/><circle cx="178" cy="262" r="6"/><circle cx="222" cy="262" r="6"/></g>`,

    crossbody: ({ main, accent, detail }) => `${shadow(346, 110)}
      <path d="M124 214 C110 60 290 60 276 214" fill="none" stroke="${detail}" stroke-width="5" stroke-dasharray="9 5"/>
      <rect x="110" y="200" width="180" height="134" rx="22" fill="${main}" ${OUTLINE}/>
      <clipPath id="asw-quilt"><rect x="110" y="200" width="180" height="134" rx="22"/></clipPath>
      <g stroke="${accent}" stroke-width="2" opacity=".8" clip-path="url(#asw-quilt)">
        ${[0, 1, 2, 3, 4].map((i) => `<line x1="${110 + i * 45}" y1="334" x2="${200 + i * 45}" y2="200"/><line x1="${110 + i * 45}" y1="200" x2="${200 + i * 45}" y2="334"/>`).join("")}
      </g>
      <rect x="110" y="200" width="180" height="134" rx="22" fill="none" stroke="${main}" stroke-width="10"/>
      <path d="M110 220 C110 208 120 200 132 200 L268 200 C280 200 290 208 290 220 L290 254 C250 266 150 266 110 254 Z" fill="${accent}" ${OUTLINE}/>
      <rect x="186" y="246" width="28" height="18" rx="4" fill="${detail}"/>`,

    watch: ({ main, accent, detail }) => {
      const ticks = Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        const r1 = i % 3 === 0 ? 50 : 56;
        return `<line x1="${200 + Math.sin(a) * r1}" y1="${200 - Math.cos(a) * r1}" x2="${200 + Math.sin(a) * 62}" y2="${200 - Math.cos(a) * 62}"/>`;
      }).join("");
      return `${shadow(360, 70)}
      <rect x="158" y="24" width="84" height="352" rx="30" fill="${main}" ${OUTLINE}/>
      <g stroke="rgba(40,20,20,.18)" stroke-width="2"><line x1="168" y1="60" x2="232" y2="60"/><line x1="168" y1="340" x2="232" y2="340"/></g>
      <rect x="282" y="190" width="16" height="20" rx="4" fill="${accent}" ${OUTLINE}/>
      <circle cx="200" cy="200" r="86" fill="${accent}" ${OUTLINE}/>
      <circle cx="200" cy="200" r="72" fill="${detail}"/>
      <g stroke="${accent}" stroke-width="4" stroke-linecap="round">${ticks}</g>
      <g stroke="#2a2222" stroke-linecap="round"><line x1="200" y1="200" x2="200" y2="156" stroke-width="5"/><line x1="200" y1="200" x2="232" y2="214" stroke-width="4"/></g>
      <circle cx="200" cy="200" r="6" fill="${accent}"/>
      <path d="M150 160 C160 140 180 130 200 128" stroke="rgba(255,255,255,.55)" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    },
  };

  function productSVG(product, colorIdx = 0) {
    const c = product.colorways[colorIdx] || product.colorways[0];
    const draw = SHAPES[product.art] || SHAPES.heel;
    return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeAttr(`${product.name} in ${c.name}`)}">${draw(c)}</svg>`;
  }

  function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }

  /** Photo if the colorway/product has one (falls back to artwork on error), otherwise artwork. */
  function productArt(product, colorIdx = 0) {
    const c = product.colorways[colorIdx] || product.colorways[0];
    const src = c.image || product.image;
    if (!src) return productSVG(product, colorIdx);
    return `<img class="photo" src="${escapeAttr(src)}" alt="${escapeAttr(`${product.name} in ${c.name}`)}" loading="lazy" data-art-fallback="${escapeAttr(product.id)}|${colorIdx}">`;
  }

  root.productSVG = productSVG;
  root.productArt = productArt;
})(typeof window !== "undefined" ? window : globalThis);
