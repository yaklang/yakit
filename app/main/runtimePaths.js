const path = require('path')

// esbuild replaces this constant. Source imports remain usable by unit tests.
const bundled = typeof __YAKIT_BUNDLE__ !== 'undefined' && __YAKIT_BUNDLE__
const appRoot = path.resolve(__dirname, bundled ? '../../..' : '../..')
const appRootPath = (...parts) => path.join(appRoot, ...parts)
const appResourcePath = (...parts) => appRootPath('app', ...parts)
const sourceResources = {
  screenshots: ['screenshots', 'lib'],
  'child-window': ['handlers', 'openNewChildWindow'],
  vendor: ['handlers', 'libs'],
}
const resourcePath = (group, ...parts) => {
  if (!Object.hasOwn(sourceResources, group)) throw new Error(`Unknown Electron resource group: ${group}`)
  return bundled
    ? path.join(__dirname, '../resources', group, ...parts)
    : path.join(__dirname, ...sourceResources[group], ...parts)
}
const preloadPath = (name) => {
  const sources = { main: 'preload.js', 'engine-link': 'engineLinkPreload.js', screenshots: 'screenshots/preload.js' }
  if (!Object.hasOwn(sources, name)) throw new Error(`Unknown preload: ${name}`)
  return bundled ? path.join(__dirname, '../preload', `${name}.js`) : path.join(__dirname, sources[name])
}

module.exports = { appRootPath, appResourcePath, resourcePath, preloadPath }
