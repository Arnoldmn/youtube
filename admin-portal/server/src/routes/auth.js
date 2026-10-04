import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db, now } from "../db.js";
import { DUMMY_HASH, authenticate, checkPassword, endSession, hashPassword, publicUser, startSession } from "../auth.js";
import { HttpError, badRequest, str } from "../http.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
});

const byEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const touchLogin = db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?");
const setPassword = db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?");

router.post("/login", loginLimiter, async (req, res) => {
  const email = str(req.body?.email, "Email", { required: true, max: 200 }).toLowerCase();
  const password = str(req.body?.password, "Password", { required: true, max: 200 });
  const user = byEmail.get(email);
  const ok = await checkPassword(password, user?.password_hash || DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "That email and password don't match");
  if (!user.active) throw new HttpError(403, "This account has been deactivated. Contact your administrator.");
  touchLogin.run(now(), user.id);
  startSession(req, res, user);
  res.json({ user: publicUser({ ...user, last_login_at: now() }) });
});

router.post("/logout", (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/password", authenticate, async (req, res) => {
  const current = str(req.body?.current, "Current password", { required: true, max: 200 });
  const next = str(req.body?.next, "New password", { required: true, max: 200 });
  if (next.length < 8) throw badRequest("Use at least 8 characters for your new password");
  if (!(await checkPassword(current, req.user.password_hash))) throw new HttpError(400, "Your current password is incorrect");
  setPassword.run(await hashPassword(next), req.user.id);
  res.json({ ok: true });
});

export default router;
