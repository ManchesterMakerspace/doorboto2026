// Structured application logging. Pino writes newline-delimited JSON to stdout.
const pino = require('pino');

module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'doorboto' },
});
