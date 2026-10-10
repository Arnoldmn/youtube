"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Page-wide behaviours: scroll reveals and cursor-tracked glow on `.spotlight` cards. */
export default function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    // Tells the <head> fail-safe that the app started normally
    (window as Window & { __igrReady?: boolean }).__igrReady = true;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => io.observe(el));

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const magnets = fine ? Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]")) : [];
    const tilts = fine ? Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]")) : [];
    tilts.forEach((el) => (el.style.transition = "transform 0.6s cubic-bezier(0.19, 1, 0.22, 1)"));

    const onMove = (ev: PointerEvent) => {
      const card = (ev.target as Element | null)?.closest<HTMLElement>(".spotlight");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${ev.clientX - r.left}px`);
        card.style.setProperty("--my", `${ev.clientY - r.top}px`);
      }

      // Buttons lean toward the cursor when it gets close
      for (const el of magnets) {
        const r = el.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        const near = Math.hypot(dx, dy) < Math.max(r.width, r.height);
        el.style.transform = near ? `translate(${dx * 0.25}px, ${dy * 0.35}px)` : "";
        el.style.transition = near ? "transform 0.2s ease-out" : "transform 0.6s cubic-bezier(0.19, 1, 0.22, 1)";
      }

      // Hero visuals tilt gently in 3D
      for (const el of tilts) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const x = (ev.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const y = (ev.clientY - (r.top + r.height / 2)) / window.innerHeight;
        el.style.transform = `perspective(1200px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      io.disconnect();
      document.removeEventListener("pointermove", onMove);
    };
  }, [pathname]);

  return null;
}
