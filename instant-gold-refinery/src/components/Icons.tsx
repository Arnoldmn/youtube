import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" } as const;

export const WhatsAppIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.6 2 2.17 6.43 2.17 11.87c0 1.74.46 3.44 1.32 4.94L2.08 22l5.32-1.4a9.86 9.86 0 0 0 4.63 1.18h.01c5.44 0 9.87-4.43 9.87-9.87a9.8 9.8 0 0 0-2.86-7Zm-7.01 15.2h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.16.83.84-3.08-.2-.32a8.17 8.17 0 0 1-1.25-4.34c0-4.52 3.68-8.2 8.21-8.2a8.2 8.2 0 0 1 8.2 8.21c0 4.52-3.68 8.23-8.15 8.23Zm4.5-6.15c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.66.31c-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.74 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
  </svg>
);
export const ArrowIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const FlameIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.3 1.6 1 2.6 2 3 0-3 .3-5.6.8-8.2Z" /></svg>);
export const FlaskIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M9 3h6M10 3v6L4.5 18.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3" /><path d="M7.5 15h9" /></svg>);
export const BarIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M3 18h18l-2.5-7h-13L3 18Z" /><path d="M7.5 11 9 7h6l1.5 4" /></svg>);
export const ScaleIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7Zm14 0-3 7a3 3 0 0 0 6 0l-3-7Z" /></svg>);
export const ShieldIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></svg>);
export const CoinsIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3" /></svg>);
export const ClockIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const EyeIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>);
export const PhoneIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>);
export const PlusIcon = (p: P) => (<svg {...base} aria-hidden="true" {...p}><path d="M12 5v14M5 12h14" /></svg>);
