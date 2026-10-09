'use strict';
// Startup file for cPanel "Setup Node.js App" (Phusion Passenger) and `npm start`.
// Node 22's built-in SQLite prints an "experimental" warning on every start; it is harmless, so hide just that one.
const emitWarning = process.emitWarning;
process.emitWarning = function filtered(warning, ...args) {
  const type = typeof args[0] === 'string' ? args[0] : args[0] && args[0].type;
  if (type === 'ExperimentalWarning' && /SQLite/i.test(String(warning && warning.message ? warning.message : warning))) return;
  return emitWarning.call(process, warning, ...args);
};

require('./server/index.js');
