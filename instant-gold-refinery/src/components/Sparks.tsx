"use client";

import { useEffect, useRef } from "react";
import { POUR_IMPACT, POUR_LIP } from "./SmelterScene";

type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; hue: number; ember: boolean;
};

/**
 * Canvas overlay for SmelterScene: splash sparks at the pour and slow embers
 * drifting up from the furnace. Works in the scene's 800×800 viewBox space.
 */
export default function Sparks({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let scale = 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = width * dpr;
      scale = (width * dpr) / 800;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const particles: Particle[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const splash = () => {
      const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const speed = rand(2.5, 7.5);
      particles.push({
        x: POUR_IMPACT.x + rand(-10, 10), y: POUR_IMPACT.y - 4,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0, max: rand(30, 70), size: rand(1, 2.4), hue: rand(35, 52), ember: false,
      });
    };
    const drip = () => {
      particles.push({
        x: POUR_LIP.x + rand(-4, 6), y: POUR_LIP.y,
        vx: rand(-0.6, 1.6), vy: rand(-2.5, 0.5),
        life: 0, max: rand(25, 45), size: rand(0.8, 1.6), hue: rand(40, 55), ember: false,
      });
    };
    const ember = () => {
      particles.push({
        x: rand(60, 260), y: rand(420, 620),
        vx: rand(-0.2, 0.5), vy: rand(-1.4, -0.5),
        life: 0, max: rand(140, 260), size: rand(0.8, 2), hue: rand(18, 38), ember: true,
      });
    };

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;

      for (let i = 0; i < 4; i++) splash();
      if (Math.random() < 0.6) drip();
      if (Math.random() < 0.35) ember();

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalCompositeOperation = "lighter";

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.ember) {
          p.vx += Math.sin((p.life + p.x) * 0.05) * 0.02;
        } else {
          p.vy += 0.22;
          p.vx *= 0.985;
        }
        const px = p.x, py = p.y;
        p.x += p.vx;
        p.y += p.vy;

        // Sparks bounce once off the floor
        if (!p.ember && p.y > 664 && p.vy > 0) {
          p.y = 664;
          p.vy *= -0.3;
          p.vx *= 0.6;
        }

        const t = p.life / p.max;
        if (t >= 1) { particles.splice(i, 1); continue; }
        const alpha = (1 - t) * (p.ember ? Math.min(1, p.life / 20) : 1);
        const light = 85 - t * 35;

        ctx.strokeStyle = `hsla(${p.hue}, 100%, ${light}%, ${alpha})`;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px - p.vx * (p.ember ? 1 : 1.8), py - p.vy * (p.ember ? 1 : 1.8));
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
