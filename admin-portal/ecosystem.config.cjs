// PM2 process file for running on a plain server without Docker:
//   npm ci && npm run build && pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "linguaops-portal",
      script: "server/src/index.js",
      cwd: __dirname,
      instances: 1, // SQLite + in-memory live connections → run exactly one instance
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
    },
  ],
};
