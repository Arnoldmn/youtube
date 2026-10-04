export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg) => new HttpError(400, msg);
export const forbidden = (msg = "You don't have access to this") => new HttpError(403, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);

export function str(v, name, { required = false, max = 500 } = {}) {
  const s = v === undefined || v === null ? "" : String(v).trim();
  if (required && !s) throw badRequest(`${name} is required`);
  if (s.length > max) throw badRequest(`${name} is too long`);
  return s;
}

export function int(v, name, { min = 0, max = Number.MAX_SAFE_INTEGER, required = false } = {}) {
  if ((v === undefined || v === null || v === "") && !required) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw badRequest(`${name} must be a number between ${min} and ${max}`);
  return Math.round(n);
}

export function list(v) {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.trim().startsWith("[")) {
    try { return JSON.parse(v).map(String); } catch { /* fall through */ }
  }
  return typeof v === "string" && v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
