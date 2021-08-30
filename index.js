const sw = require('./sw.js')

function swPlugin(config = {}) {
  return {
    name: 'sw',

    closeBundle() {
      sw.genFiles(config)
    },
  }
}

module.exports = swPlugin

swPlugin.default = swPlugin
