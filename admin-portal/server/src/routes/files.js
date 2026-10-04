import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { db } from "../db.js";
import { config } from "../config.js";
import { notFound } from "../http.js";

const router = Router();

router.get("/:id/download", (req, res) => {
  const f = db.prepare(`SELECT f.*, j.assignee_id FROM job_files f JOIN jobs j ON j.id = f.job_id WHERE f.id = ?`).get(Number(req.params.id));
  // Same 404 for "doesn't exist" and "not yours" so file ids can't be probed.
  if (!f || (req.user.role !== "admin" && f.assignee_id !== req.user.id)) throw notFound("File not found");
  const full = path.join(config.uploadDir, path.basename(f.stored_name));
  if (!fs.existsSync(full)) throw notFound("File is missing from storage");
  res.download(full, f.original_name, { headers: { "Content-Type": f.mime, "X-Content-Type-Options": "nosniff" } });
});

export default router;
