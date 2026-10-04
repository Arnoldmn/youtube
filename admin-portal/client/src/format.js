export const HOUR = 36e5;

export function ago(t) {
  if (!t) return "";
  const diff = Date.now() - t;
  const m = Math.round(Math.abs(diff) / 6e4);
  if (m < 1) return "just now";
  const s = m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  return diff < 0 ? `in ${s}` : `${s} ago`;
}
export function short(ms) {
  const m = Math.round(Math.abs(ms) / 6e4);
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}
export const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmtDateFull = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
export const fmtDateTime = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export function fmtSize(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}
export const fmtNum = (n) => Number(n || 0).toLocaleString();
export const money = (n, cur = "€") => `${cur}${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const hueOf = (s = "") => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
export const initialsOf = (name = "") => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
export const extOf = (name = "") => (name.split(".").pop() || "").toLowerCase().slice(0, 4);
export function toLocalInput(t) {
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const pairLabel = (p) => p.replace(">", " → ");
