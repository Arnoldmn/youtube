"use client";

import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "../Icons";
import { site } from "@/lib/site";

type Msg = { from: "me" | "them"; text: string; time: string };

const script: Msg[] = [
  { from: "me", text: "Hi! I have about 200 g of alluvial gold. Can you smelt it today?", time: "09:41" },
  { from: "them", text: "Good morning! Yes — bring it in before 3 pm. We weigh and assay it right in front of you.", time: "09:42" },
  { from: "me", text: "What do I need to bring?", time: "09:42" },
  { from: "them", text: "Just your ID. You'll leave with your bar and a purity certificate.", time: "09:43" },
];

/** Phone mock-up playing a short WhatsApp conversation on loop. */
export default function ChatPhone() {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const run = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setShown(0);
      let t = 700;
      script.forEach((m, i) => {
        if (m.from === "them") {
          timers.current.push(window.setTimeout(() => setTyping(true), t));
          t += 1500;
        }
        timers.current.push(window.setTimeout(() => { setTyping(false); setShown(i + 1); }, t));
        t += 1300;
      });
      timers.current.push(window.setTimeout(run, t + 3500));
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setShown(script.length);
    else run();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[340px]" style={{ animation: "float-y 7s ease-in-out infinite" }}>
      <div aria-hidden="true" className="absolute -inset-10 rounded-full bg-[#25D366]/15 blur-[80px]" />
      <div className="relative rounded-[3rem] border border-white/10 bg-gradient-to-b from-[#2a2a2a] to-[#0e0e0e] p-3 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-[#0b141a]">
          {/* Status bar + notch */}
          <div className="relative flex items-center justify-between px-7 pb-1 pt-3 font-sans text-[11px] font-semibold text-white">
            <span>9:41</span>
            <span className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-sm border border-white/80" />
            </span>
          </div>
          {/* Chat header */}
          <div className="flex items-center gap-3 bg-[#1f2c34] px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-200 to-gold-600">
              <svg viewBox="0 0 40 40" className="h-5 w-5"><path d="M5 30 L11 14 H29 L35 30 Z" fill="#3d2804" /></svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{site.name}</p>
              <p className="text-[11px] text-[#8696a0]">{typing ? <span className="text-[#25D366]">typing…</span> : "online"}</p>
            </div>
            <WhatsAppIcon className="ml-auto h-5 w-5 text-[#25D366]" />
          </div>
          {/* Messages */}
          <div className="flex h-[420px] flex-col justify-end gap-2 bg-[#0b141a] bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] px-3 pb-3 [background-size:14px_14px]">
            <p className="mx-auto mb-auto mt-4 rounded-md bg-[#182229] px-3 py-1 text-[10px] uppercase tracking-wider text-[#8696a0]">Today</p>
            {script.slice(0, shown).map((m, i) => (
              <div
                key={i}
                className={`max-w-[82%] rounded-xl px-3 py-2 text-[13px] leading-snug text-[#e9edef] [animation:bubble-in_0.35s_ease-out] ${
                  m.from === "me" ? "self-end rounded-tr-sm bg-[#005c4b]" : "self-start rounded-tl-sm bg-[#202c33]"
                }`}
              >
                {m.text}
                <span className="ml-2 inline-block translate-y-1 text-[10px] text-[#8696a0]">{m.time}{m.from === "me" && <span className="ml-1 text-[#53bdeb]">✓✓</span>}</span>
              </div>
            ))}
            {typing && (
              <div className="flex gap-1 self-start rounded-xl rounded-tl-sm bg-[#202c33] px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 rounded-full bg-[#8696a0]" style={{ animation: `typing 1.2s ${d * 0.15}s infinite` }} />
                ))}
              </div>
            )}
          </div>
          {/* Composer */}
          <div className="flex items-center gap-2 bg-[#0b141a] px-3 pb-5 pt-1">
            <span className="flex-1 rounded-full bg-[#2a3942] px-4 py-2.5 text-[13px] text-[#8696a0]">Message</span>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#00a884]">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M3 20l18-8L3 4v6l12 2-12 2z" /></svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
