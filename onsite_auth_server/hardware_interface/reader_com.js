// reader_com Copyright 2020 Manchester Makerspace MIT Licence
const { execFile } = require('child_process');
const path = require('path');
const logger = require('../logger.js');

const ARDUINO_PORT = process.env.ARDUINO_PORT || null;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const recoveryAfter = Number(
  process.env.USB_SERIAL_RECOVERY_AFTER_SECONDS ?? 300
);
const RECOVERY_AFTER_MS = Number.isFinite(recoveryAfter)
  ? Math.max(0, recoveryAfter) * 1000
  : 300000;
const RECOVERY_SCRIPT =
  process.env.USB_SERIAL_RECOVERY_SCRIPT ||
  path.join(__dirname, 'usb-serial-recover.py');

const STATES = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  ONLINE: 'online',
  BACKOFF: 'backoff',
  RECOVERING: 'recovering',
});

let state = STATES.IDLE;
let retryAttempt = 0;
let retryTimer = null;
let offlineSince = null;
let recoveryAttempted = false;
let activePort = null;
let dataHandler = null;
let shuttingDown = false;
let readyResolve = null;

const transition = (nextState, details = {}) => {
  const previousState = state;
  state = nextState;
  logger.info(
    { event: 'serial.state', previousState, state: nextState, ...details },
    'Serial state changed'
  );
};

const runRecovery = reconnect => {
  recoveryAttempted = true;
  transition(STATES.RECOVERING, { script: RECOVERY_SCRIPT });
  execFile(RECOVERY_SCRIPT, [ARDUINO_PORT], (error, stdout, stderr) => {
    if (error) {
      logger.error(
        {
          event: 'serial.recovery.error',
          err: error,
          stderr,
          script: RECOVERY_SCRIPT,
        },
        'USB serial recovery helper failed'
      );
    } else {
      logger.info(
        { event: 'serial.recovery.complete', stdout, script: RECOVERY_SCRIPT },
        'USB serial recovery helper completed'
      );
    }
    reconnect();
  });
};

const scheduleReconnect = reason => {
  if (shuttingDown || retryTimer || state === STATES.RECOVERING) return;

  offlineSince ??= Date.now();
  const reconnect = () => {
    retryTimer = null;
    connect();
  };
  if (!recoveryAttempted && Date.now() - offlineSince >= RECOVERY_AFTER_MS) {
    runRecovery(reconnect);
    return;
  }

  const delay = Math.min(
    INITIAL_RETRY_DELAY * 2 ** retryAttempt,
    MAX_RETRY_DELAY
  );
  retryAttempt += 1;
  transition(STATES.BACKOFF, { delay, reason, retryAttempt });
  retryTimer = setTimeout(reconnect, delay);
};

const handleSerialError = (event, error, port) => {
  logger.error(
    { event, err: error, port: ARDUINO_PORT, state },
    'Serial communication error'
  );
  if (port?.isOpen) {
    port.close(closeError => {
      if (closeError) {
        logger.error(
          { event: 'serial.close.error', err: closeError, port: ARDUINO_PORT },
          'Unable to close failed serial port'
        );
        scheduleReconnect(event);
      }
    });
  } else {
    scheduleReconnect(event);
  }
};

const connect = () => {
  transition(STATES.CONNECTING, { port: ARDUINO_PORT, retryAttempt });
  try {
    const { SerialPort } = require('serialport');
    const { ReadlineParser } = require('@serialport/parser-readline');
    const port = new SerialPort({ path: ARDUINO_PORT, baudRate: 9600 });
    const parser = new ReadlineParser({ delimiter: '\r\n' });
    activePort = port;
    port.pipe(parser);

    port.once('open', () => {
      retryAttempt = 0;
      offlineSince = null;
      recoveryAttempted = false;
      transition(STATES.ONLINE, { port: ARDUINO_PORT });
      readyResolve?.();
      readyResolve = null;
    });
    parser.on('data', data => {
      dataHandler(data, authorized => {
        port.write(authorized ? '<a>' : '<d>', error => {
          if (error) {
            handleSerialError('serial.write.error', error, port);
          }
        });
      });
    });
    parser.on('error', error => {
      handleSerialError('serial.parser.error', error, port);
    });
    port.on('error', error => {
      handleSerialError('serial.error', error, port);
    });
    port.once('close', error => {
      activePort = null;
      if (error) {
        logger.error(
          { event: 'serial.close.error', err: error, port: ARDUINO_PORT },
          'Serial port closed due to an error'
        );
      } else {
        logger.warn(
          { event: 'serial.close', port: ARDUINO_PORT },
          'Serial port closed'
        );
      }
      scheduleReconnect('close');
    });
  } catch (error) {
    activePort = null;
    logger.error(
      { event: 'serial.connect.error', err: error, port: ARDUINO_PORT },
      'Unable to initialize serial port'
    );
    scheduleReconnect('connect');
  }
};

const serialInit = onData => {
  dataHandler = onData;
  if (!ARDUINO_PORT) {
    logger.warn(
      { event: 'serial.disabled' },
      'ARDUINO_PORT is not configured; serial access is disabled'
    );
    return Promise.resolve();
  }
  if (activePort?.isOpen) return Promise.resolve();
  if (retryTimer || state === STATES.CONNECTING) {
    return new Promise(resolve => {
      readyResolve = resolve;
    });
  }
  shuttingDown = false;
  const ready = new Promise(resolve => {
    readyResolve = resolve;
  });
  connect();
  return ready;
};

const serialClose = async () => {
  shuttingDown = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  const port = activePort;
  activePort = null;
  if (!port?.isOpen) return;
  await new Promise((resolve, reject) => {
    port.close(error => (error ? reject(error) : resolve()));
  });
};

module.exports = { serialInit, serialClose, STATES };
