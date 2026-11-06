/** CRA must disable the Babel transform and webpack Refresh runtime together. */
function prepareStaticPreviewEnvironment(env = process.env) {
  env.FAST_REFRESH = 'false'
}

/** Static previews do not need source maps; retaining them can exhaust memory while rendering chunks. */
function configureStaticPreviewOutput(config) {
  config.devtool = false
  config.cache = false
  return config
}

function assertStaticPreviewConfig(config) {
  if (config.plugins.some((plugin) => /ReactRefresh/.test(plugin.constructor?.name || ''))) {
    throw new Error('Static preview must not include the React Refresh runtime')
  }
  const inspect = (rules = []) => {
    for (const rule of rules) {
      if (!rule || typeof rule !== 'object') continue
      const plugins = rule.options?.plugins || []
      if (
        plugins.some((plugin) => /react-refresh[\\/]babel/.test(String(Array.isArray(plugin) ? plugin[0] : plugin)))
      ) {
        throw new Error('Static preview still contains the React Refresh Babel transform')
      }
      inspect(rule.oneOf)
      inspect(rule.rules)
    }
  }
  inspect(config.module?.rules)
}

function assertStaticPreviewJavaScript(code, filename = 'bundle') {
  if (/\$(?:RefreshReg|RefreshSig)\$\s*\(/.test(code)) {
    throw new Error(`Static preview contains an unbound React Refresh call: ${filename}`)
  }
}

function assertStaticPreviewAssets(directory) {
  const fs = require('node:fs'),
    path = require('node:path')
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) assertStaticPreviewAssets(filename)
    else if (entry.isFile() && entry.name.endsWith('.js'))
      assertStaticPreviewJavaScript(fs.readFileSync(filename, 'utf8'), filename)
  }
}

module.exports = {
  prepareStaticPreviewEnvironment,
  configureStaticPreviewOutput,
  assertStaticPreviewConfig,
  assertStaticPreviewJavaScript,
  assertStaticPreviewAssets,
}
