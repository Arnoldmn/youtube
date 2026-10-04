// First-time setup: creates .env from .env.example with a freshly generated JWT secret.
// Usage: npm run setup
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

if (fs.existsSync(envPath)) {
  console.log(".env already exists — leaving it untouched.");
} else {
  const secret = crypto.randomBytes(48).toString("hex");
  const example = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  fs.writeFileSync(envPath, example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`));
  console.log("Created .env with a random JWT_SECRET.");
}
console.log(`
Next steps:
  npm run dev        → start the app (API on :4000, React on :5173)
  open http://localhost:5173

Demo sign-ins:
  Admin     admin@linguaops.local / admin12345
  Employee  lena@linguaops.local  / password123
`);
