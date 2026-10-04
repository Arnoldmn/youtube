import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "./db.js";
import { config } from "./config.js";
import { HttpError, forbidden } from "./http.js";

const COOKIE = "lo_session";

export const hashPassword = (pw) => bcrypt.hash(pw, 12);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);
// Compared against when an email doesn't exist, so sign-in timing doesn't reveal which accounts exist.
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);
export const tempPassword = () => crypto.randomBytes(9).toString("base64url");

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, title: u.title,
    pairs: JSON.parse(u.pairs || "[]"), specs: JSON.parse(u.specs || "[]"),
    capacity: u.capacity, active: !!u.active, mustChangePassword: !!u.must_change_password,
    createdAt: u.created_at, lastLoginAt: u.last_login_at,
  };
}

export function startSession(req, res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: `${config.sessionDays}d` });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure === "auto" ? req.secure : config.cookieSecure,
    maxAge: config.sessionDays * 864e5,
    path: "/",
  });
}

export function endSession(req, res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure: config.cookieSecure === "auto" ? req.secure : config.cookieSecure, path: "/" });
}

const findUser = db.prepare("SELECT * FROM users WHERE id = ?");

// Resolves the logged-in user from the session cookie; rejects with 401 otherwise.
export function authenticate(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next(new HttpError(401, "Please sign in"));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = findUser.get(payload.sub);
    if (!user || !user.active) return next(new HttpError(401, "Your session has ended — please sign in again"));
    req.user = user;
    next();
  } catch {
    next(new HttpError(401, "Your session has expired — please sign in again"));
  }
}

export const requireAdmin = (req, _res, next) => (req.user?.role === "admin" ? next() : next(forbidden("Admins only")));

// Light CSRF defence on top of SameSite=Lax cookies: state-changing requests must
// come from our own frontend, which always sends this header.
export function requireAppHeader(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("x-requested-with") === "linguaops") return next();
  next(forbidden("Missing request header"));
}
