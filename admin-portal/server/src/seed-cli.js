// Usage:
//   npm run seed            → create the admin (if missing) and load demo data into an empty database
//   npm run seed -- --reset → wipe everything (users, jobs, uploads) and start over with demo data
import { ensureAdmin, seedDemo, wipe } from "./seed.js";

const reset = process.argv.includes("--reset");
if (reset) {
  wipe();
  console.log("Database and uploads wiped.");
}
await ensureAdmin();
const loaded = await seedDemo({ force: reset });
if (!loaded) console.log("Demo data not loaded: the database already has jobs or applications. Use `npm run seed -- --reset` to start over.");
