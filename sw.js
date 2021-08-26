const fs = require('fs')
const replace = require('replace-in-file')

const packageJson = require('./package.json')

const swrText = `
const swr = async () => {
  if (navigator.serviceWorker) {
    if (window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js')
    } else {
      const registrations = await navigator.serviceWorker.getRegistrations()

      if (registrations.length > 0) {
        registrations.forEach((registration) => {
          registration.unregister()
        })

        location.reload()
      }
    }
  }
}

swr()  
`

function genSWFiles(config) {
  const error = (error) => {
    if (error) {
      console.error(error)
    }
  }

  fs.writeFile(`dist/swr.js`, swrText, error)

  fs.writeFile(`dist/sw.js`, genSWText(config), error)

  replace({
    files: `./dist/index.html`,
    from: '</head>',
    to: '<script defer src="/swr.js"></script>\n    </head>',
  }).catch((error) => {
    console.error('Error occurred:', error)
  })
}

function genSWText(config) {
  const filesToPreCache = getFilesToCache()

  const comment = config.verbose ? '' : '// '

  return `const regexes = ${
    config.regexes
      ? JSON.stringify(config.regexes, null, 2)
      : `{
  onlineFirst: ['/api/'],
  onlineOnly: ['http://'],
  cacheFirst: [self.location.origin, 'cdn'],
  cacheOnly: [],
}`
  }

// If the url doesn't match any of those regexes, it will do online first

const cacheName = 'cache-${packageJson.name}-${Date.now()}'

const filesToPreCache = [
${filesToPreCache.map((x) => "  '" + x + "'").join(',\n')}
]

${comment}console.log('sw: origin:', self.location.origin)

self.addEventListener('install', (event) => {
  ${comment}console.log('sw: install')
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => {
        ${comment}console.log('sw: creating cache:', cacheName)
        return cache.addAll(filesToPreCache)
      })
      .then(() => {
        self.skipWaiting()
      })
  )
})

self.addEventListener('activate', (event) => {
  ${comment}console.log('sw: activate')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((thisCacheName) => {
          if (thisCacheName !== cacheName) {
            ${comment}console.log('sw: deleting:', thisCacheName)
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

const cacheFirst = {
  method: (event, cache) => {
    ${comment}console.log('sw: fetch: cache first:', event.request.url)
    const fun = update(event, cache)
    return cache || fun
  },
  regexes: regexesCacheFirst,
}

const cacheOnly = {
  method: (event, cache) => {
    ${comment}console.log('sw: fetch: cache only:', event.request.url)
    return cache || update(event, cache)
  },
  regexes: regexesCacheOnly,
}

const onlineFirst = {
  method: (event, cache) => {
    ${comment}console.log('sw: fetch: online first:', event.request.url)
    return update(event, cache)
  },
  regexes: regexesOnlineFirst,
}

const onlineOnly = {
  method: (event) => {
    ${comment}console.log('sw: fetch: online only:', event.request.url)
    return fetch(event.request)
  },
  regexes: regexesOnlineOnly,
}

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cache) => {
      // The order matters !
      const patterns = [cacheFirst, cacheOnly, onlineFirst, onlineOnly]

      for (let pattern of patterns) {
        for (let regex of pattern.regexes) {
          if (RegExp(regex).test(event.request.url)) {
            return pattern.method(event, cache)
          }
        }
      }

      return onlineFirst.method(event, cache)
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
  genSWFiles,
}
