const sw = require('./sw.js')

function swPlugin(config = {}) {
  const indexPath = config.indexPath || 'index.html'

  const buildPath = config.buildPath || 'dist'

  return {
    name: 'sw',

    closeBundle() {
      sw.genSWFiles(indexPath, buildPath, config.regexes, config.showLogs)
    },
  }
}

module.exports = swPlugin

swPlugin.default = swPlugin
