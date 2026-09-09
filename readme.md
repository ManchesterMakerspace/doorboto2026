# Requisites

- Manchester Makerspace's target system is an ARM linux box
  - OSX would probably work as well. Roll your own install script
  - A x86 64 bit Debian based Distro was the dev env, and it's less finicky with Serialport
  - Windows 10 ??? not sure. Try to roll your own install script
- Node.js 24 LTS and npm 11 or newer, as specified in `package.json`.
- A mongo server where your members database is managed by another program.
  - This Mongo server could be local or remote. Either way remember to use access control on the mongo server.
  - Mongo Atlas has a free tier cloud instance that can be setup easily.
- Webhook URL to slack is intended but not required
- Arduino IDE or CLI (on dev machine to program the reader/latch)
- Arduino rfid reader and door latch relay, firmware included in /reader_firmware
  - See /reader_firmware/readme.md for more details

# Setup

In the current implementation an Raspberry Pi is use in combination with a Arduino nano connected using usb communicating over serial on port /dev/ttyATH0. This port may need to added to the dial out group on the PI for doorboto to have permission to use it.

To get the latest version of this repo and enter the Node application directory:

```sh
git clone https://github.com/ManchesterMakerspace/doorboto2.git
cd doorboto2/onsite_auth_server
```

Review `onsite_auth_server/install.sh` before running it. From the
`onsite_auth_server` directory, create an executable `prod.sh` that exports the
environment variables used by `ecosystem.config.js`.

Then install the locked dependencies and configure the service with:

```sh
npm run setup
```

Start the configured service with:

```sh
npm start
```

## Updates

9/8/2026 - Updated the onsite server for Node.js 24 LTS, including current MongoDB and SerialPort APIs.

5/1/2020 - Hardware Note: we are currently using a raspberry pi instead of a dedicated desktop PC but it is using a usb drive instead of an SD.

12/2/2020 - Onsite auth server refactor deploy to use Node 14.x, Mongo Driver 3.6.x, and Serialport 9.x

- serialport compatibility took some doing with setting the correct bindings for ARM.

## License

Copyright 2016-2020 ~ Manchester Makerspace ~ MIT License
