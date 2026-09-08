module.exports = {
  apps : [{
    name: 'doorboto',
    script: 'doorboto.js',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    env: {
      MONGODB_URI: process.env.MONGODB_URI,
      DB_NAME: process.env.DB_NAME,
      DOORBOTO_WEBHOOK: process.env.DOORBOTO_WEBHOOK,
      MR_WEBHOOK: process.env.MR_WEBHOOK,
      ARDUINO_PORT: process.env.ARDUINO_PORT,
      LENIENCY: process.env.LENIENCY,
      LOG_LEVEL: process.env.LOG_LEVEL,
      USB_SERIAL_RECOVERY_AFTER_SECONDS: process.env.USB_SERIAL_RECOVERY_AFTER_SECONDS,
      USB_SERIAL_RECOVERY_SCRIPT: process.env.USB_SERIAL_RECOVERY_SCRIPT,
    },
    env_testing: {
      MONGODB_URI: '',
      DB_NAME: '',
      DOORBOTO_WEBHOOK: '',
      MR_WEBHOOK: '',
      ARDUINO_PORT: '',
      LENIENCY: '',
      LOG_LEVEL: 'info',
      USB_SERIAL_RECOVERY_AFTER_SECONDS: '300',
      USB_SERIAL_RECOVERY_SCRIPT: '',
    }
  }]
};
