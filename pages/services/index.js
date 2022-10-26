const config = require('../../config.js');
const IM = require('./im');
const RTC = require('./rtc')

module.exports = (config) => {
  return {
    IM:IM(config),
    RTC:RTC(config)
  }
}