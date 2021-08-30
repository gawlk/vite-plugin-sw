const fs = require('fs')
const replace = require('replace-in-file')

let verbose = false

const log = (text) => `${(verbose ? '' : '// ') + 'console.log(' + text + ')'}`

function genFiles(config) {
  verbose = config.verbose

  const error = (error) => {
    if (error) {
      console.error(error)
    }
  }

  fs.writeFile(`dist/swr.js`, getSWRText(config), error)

  fs.writeFile(`dist/sw.js`, getSWText(config), error)

  replace({
    files: `./dist/index.html`,
    from: '</head>',
    to: '  <script defer src="/swr.js"></script>\n  </head>',
  }).catch((error) => {
    console.error('Error occurred:', error)
  })
}

function getSWRText(config) {
  return `const swr = async () => {
    if (navigator.serviceWorker) {
      ${log("'swr: browser supports sw'")}

      if (window.location.protocol === 'https:') {
        ${log("'swr: registering sw'")}

        navigator.serviceWorker.register('/sw.js')
      } else {
        ${log("'swr: not https - cleaning sw'")}

        const registrations = await navigator.serviceWorker.getRegistrations()
  
        if (registrations.length > 0) {
          registrations.forEach((registration) => {
            registration.unregister()
          })
  
          location.reload()
        }
      }
    } else {
      ${log("'swr: browser does not support sw'")}
    }
  }
  
  swr()  
  `
}

function getSWText(config) {
  const filesToPreCache = getFilesToCache()

  const filterToString = (filterName, defaultStr) =>
    config.filters?.[filterName]?.length > 0
      ? `'${config.filters[filterName].join("', '")}'`
      : defaultStr
      ? `'${defaultStr}'`
      : ''

  return `// Ordered by priority
const filters = {
  onlineOnly: [${filterToString('onlineOnly', 'http://')}],
  cacheOnly: [${filterToString('cacheOnly')}],
  onlineFirst: [${filterToString('onlineFirst', '/api/')}],
  cacheFirst: [${filterToString('cacheFirst', 'cdn')}],
}

filters.cacheFirst.push(self.location.origin)

// If the url doesn't match any of those filters, it will do online only

const cacheName = 'swc-${Date.now() + Math.floor(Math.random() * 1000)}'

const filesToPreCache = [
${filesToPreCache.map((x) => "  '" + x + "'").join(',\n')}
]

${log("'sw: origin:', self.location.origin")}

self.addEventListener('install', (event) => {
  ${log("'sw: install'")}

  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => {
        ${log("'sw: creating cache:', cacheName")}

        return cache.addAll(filesToPreCache)
      })
      .then(() => {
        self.skipWaiting()
      })
  )
})

self.addEventListener('activate', (event) => {
  ${log("'sw: activate'")}

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((thisCacheName) => {
          if (thisCacheName !== cacheName && thisCacheName.startsWith('swc-')) {
            ${log("'sw: deleting:', thisCacheName")}

            return caches.delete(thisCacheName)
          }
        })
      ).then(() => self.clients.claim())
    })
  )
})

const update = (event, cache) => {
  return fetch(event.request)
    .then((response) => {
      return caches.open(cacheName).then((cache) => {
        if (event.request.method === 'GET') {
          cache.put(event.request, response.clone())
        }
        return response
      })
    })
    .catch(() => {
      return cache
    })
}

const onlineOnly = {
  method: (event) => {
    ${log("'sw: fetch: online only:', event.request.url")}

    return fetch(event.request)
  },
  filters: filters.onlineOnly,
}

const cacheOnly = {
  method: (event, cache) => {
    ${log("'sw: fetch: cache only:', event.request.url")}

    return cache || update(event, cache)
  },
  filters: filters.cacheOnly,
}

const onlineFirst = {
  method: (event, cache) => {
    ${log("'sw: fetch: online first:', event.request.url")}

    return update(event, cache)
  },
  filters: filters.onlineFirst,
}

const cacheFirst = {
  method: (event, cache) => {
    ${log("'sw: fetch: cache first:', event.request.url")}

    const fun = update(event, cache)
    return cache || fun
  },
  filters: filters.cacheFirst,
}

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cache) => {
      const patterns = [
        onlineOnly,
        cacheOnly,
        onlineFirst,
        cacheFirst
      ]

      for (let pattern of patterns) {
        for (let filter of pattern.filters) {
          if (event.request.url.includes(filter)) {
            return pattern.method(event, cache)
          }
        }
      }

      return onlineOnly.method(event, cache)
    })
  )
})
`
}

function getFilesToCache() {
  const skip = []

  const flatDeep = (arr) =>
    arr.reduce(
      (acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val) : val),
      []
    )

  const tree = (root) =>
    fs
      .readdirSync(root, { withFileTypes: true })
      .filter(
        (element) =>
          !skip.includes(element.name) && !element.name.endsWith('.map')
      )
      .map((element) =>
        element.isDirectory()
          ? tree(`${root}/${element.name}`)
          : `${root}/${element.name}`
      )

  const listAllFiles = flatDeep(
    fs
      .readdirSync('dist', { withFileTypes: true })
      .filter((dir) => dir.isDirectory() && !skip.includes(dir.name))
      .map((dir) => tree(`dist/${dir.name}`))
  ).map((path) => path.substring('dist'.length))

  return ['/', `/index.html`, ...listAllFiles]
}

module.exports = {
  genFiles,
}
