// reader_com Copyright 2020 Manchester Makerspace MIT Licence
const RETRY_DELAY = 5000;
const ARDUINO_PORT = process.env.ARDUINO_PORT ?? null;

const reconnect = (onData) => {
  return error => {
    // given something went wrong try to re-establish connection
    if (error) {
      console.log(error);
    }
    setTimeout(() => {
      serialInit(onData);
    }, RETRY_DELAY);
  };
};

const serialInit = onData => {
  if(ARDUINO_PORT === null){
    console.log(`Port failed to be specified`);
    return; 
  }
  // Load the native serial dependency only when hardware is configured. This
  // keeps non-hardware commands (including unit tests) portable.
  const { SerialPort } = require('serialport');
  const { ReadlineParser } = require('@serialport/parser-readline');
  const port = new SerialPort({ path: ARDUINO_PORT, baudRate: 9600 });
  const parser = new ReadlineParser({ delimiter: '\r\n' });
  // pipe read data through chosen parser
  port.pipe(parser);
  port.on('open', () => {
    console.log(`Arduino connected on ${ARDUINO_PORT}`);
  });
  // Parser data stream is being piped into, expecting card UID
  parser.on('data', data => {
    onData( data, (authorized) => {
      // Reaction for when an authorized card is found
      port.write(authorized ? '<a>' : '<d>');
    });
  });
  // try to reconnect on errors or port close.
  // Could just be a wire disconnect
  port.on('close', reconnect(onData));
  port.on('error', reconnect(onData));
};

module.exports = { serialInit };
