const sw = require('./sw.js')

function swPlugin(config = {}) {
  return {
    name: 'sw',

    closeBundle() {
      sw.genSWFiles(config)
    },
  }
}

module.exports = swPlugin

swPlugin.default = swPlugin
