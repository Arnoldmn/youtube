import { config, assertProductionConfig } from "./config.js";
import { createApp } from "./app.js";
import { ensureAdmin, seedDemo } from "./seed.js";
import { checkOverdue } from "./routes/jobs.js";

assertProductionConfig();
await ensureAdmin();
if (config.seedDemo) await seedDemo();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`Lingua Ops Admin Portal running on http://localhost:${config.port} (${config.isProd ? "production" : "development"})`);
});

checkOverdue();
const overdueTimer = setInterval(checkOverdue, 60_000);

function shutdown() {
  clearInterval(overdueTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
