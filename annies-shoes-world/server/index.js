const { loadDotEnv, readConfig } = require("./config.js");

loadDotEnv();
const config = readConfig();
const { createApp } = require("./app.js");
const { cloudEnabled } = require("./whatsapp.js");

const server = createApp(config);
server.listen(config.port, () => {
  console.log(`✨ ${config.storeName} running at http://localhost:${config.port}`);
  if (!config.whatsappNumber) console.warn("⚠️  WHATSAPP_NUMBER is not set: checkout will be disabled until you add it to .env");
  if (!config.adminPassword) console.warn("⚠️  ADMIN_PASSWORD is not set: the /admin order dashboard is disabled");
  console.log(cloudEnabled(config) ? "🤖 WhatsApp Cloud API enabled: automatic tracking replies are on" : "💬 WhatsApp click-to-chat mode (no Cloud API configured)");
});
