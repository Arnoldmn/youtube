"use client";

import { useEffect, useRef } from "react";

/**
 * Full-bleed WebGL "liquid gold": domain-warped noise lit like polished metal,
 * with a soft ripple that follows the cursor. Falls back to a CSS gradient
 * when WebGL is unavailable, and renders a single still frame for
 * reduced-motion users.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntensity;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.0 + 3.1; a *= 0.5; }
  return v;
}
float field(vec2 p) {
  float t = uTime * 0.06;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.5), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float h = fbm(p + 2.5 * r);
  // cursor ripple
  vec2 m = uMouse * vec2(uRes.x / uRes.y, 1.0);
  float d = length(p / 2.2 - m);
  h += 0.06 * sin(d * 28.0 - uTime * 3.0) * exp(-d * 5.0);
  return h;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy / uRes.y) * 2.2;

  float e = 0.004;
  float h = field(p);
  vec3 n = normalize(vec3(field(p + vec2(e, 0.0)) - h, field(p + vec2(0.0, e)) - h, e * 0.9));

  vec3 L = normalize(vec3(-0.4, 0.6, 0.7));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float diff = clamp(dot(n, L), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-L, n), V), 0.0, 1.0), 38.0);
  float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);

  vec3 deep = vec3(0.24, 0.12, 0.02);
  vec3 gold = vec3(0.86, 0.56, 0.12);
  vec3 bright = vec3(1.0, 0.86, 0.48);
  vec3 col = mix(deep, gold, smoothstep(0.25, 0.85, h));
  col = col * (0.35 + 0.9 * diff) + bright * spec * 1.4 + vec3(1.0, 0.6, 0.2) * fres * 0.5;

  // ember hot spots
  col += vec3(1.0, 0.35, 0.05) * smoothstep(0.72, 0.95, h) * 0.35;

  // fade to ink at edges / top so text stays readable
  float vig = smoothstep(1.25, 0.2, length((uv - vec2(0.62, 0.1)) * vec2(1.1, 1.5)));
  col *= mix(0.08, 1.0, vig) * uIntensity;
  gl_FragColor = vec4(col, 1.0);
}
`;

export default function GoldShader({ className = "", intensity = 1 }: { className?: string; intensity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      canvas.style.background = "radial-gradient(ellipse at 60% 100%, #7a510a, #1d140c 55%, #070605)";
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    gl.uniform1f(gl.getUniformLocation(prog, "uIntensity"), intensity);

    // Render below native resolution: the field is soft, so this is invisible but ~3× cheaper.
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mouse = { x: 0.6, y: 0.4, tx: 0.6, ty: 0.4 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(canvas);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const frame = () => {
      if (!still) raf = requestAnimationFrame(frame);
      if (!visible && !still) return;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      gl.uniform1f(uTime, still ? 12 : (performance.now() - start) / 1000 + 12);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [intensity]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
