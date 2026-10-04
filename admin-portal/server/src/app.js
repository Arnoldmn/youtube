import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { config } from "./config.js";
import { authenticate, requireAppHeader } from "./auth.js";
import { subscribe } from "./events.js";
import { HttpError } from "./http.js";
import { JOB_STATUSES, LANGS, PRIORITIES, SERVICES, DEFAULT_RATES } from "./constants.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import jobRoutes from "./routes/jobs.js";
import fileRoutes from "./routes/files.js";
import notificationRoutes from "./routes/notifications.js";
import applicationRoutes from "./routes/applications.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "blob:"],
        "connect-src": ["'self'"],
        "upgrade-insecure-requests": config.cookieSecure === true ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(requireAppHeader);
  api.get("/health", (_req, res) => res.json({ ok: true, time: Date.now() }));
  api.use("/auth", authRoutes);
  api.use(authenticate);
  api.get("/meta", (_req, res) => res.json({ langs: LANGS, services: SERVICES, priorities: PRIORITIES, statuses: JOB_STATUSES, rates: DEFAULT_RATES }));
  api.get("/events", subscribe);
  api.use("/users", userRoutes);
  api.use("/jobs", jobRoutes);
  api.use("/files", fileRoutes);
  api.use("/notifications", notificationRoutes);
  api.use("/applications", applicationRoutes);
  api.use((_req, _res, next) => next(new HttpError(404, "Unknown API endpoint")));
  app.use("/api", api);

  // Serve the built React app in production (npm run build → client/dist).
  if (fs.existsSync(path.join(config.clientDist, "index.html"))) {
    app.use(express.static(config.clientDist, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(config.clientDist, "index.html")));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? `Files must be smaller than ${Math.round(config.maxUploadBytes / 1048576)} MB` : err.message;
      return res.status(400).json({ error: msg });
    }
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? "Something went wrong on our side" : err.message });
  });

  return app;
}
