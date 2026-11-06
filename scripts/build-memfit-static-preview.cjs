const fs = require('node:fs')
const path = require('node:path')
const workspace = path.resolve(__dirname, '..')
const renderer = path.join(workspace, 'app/renderer/src/main')
const output = path.resolve(process.argv[2] || path.join(workspace, '.codex-run/main-static-preview-fixed'))
const relativeOutput = path.relative(path.join(workspace, '.codex-run'), output)
if (!relativeOutput || relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput))
  throw new Error('Static preview output must be a child of .codex-run')
const {
  prepareStaticPreviewEnvironment,
  configureStaticPreviewOutput,
  assertStaticPreviewConfig,
  assertStaticPreviewAssets,
} = require('./static-preview-config.cjs')
process.chdir(renderer)
Object.assign(process.env, {
  NODE_ENV: 'development',
  BABEL_ENV: 'development',
  REACT_APP_PLATFORM: 'memfit',
  REACT_APP_DEVTOOL: 'true',
  YAKIT_DEV_EXTERNAL_TYPECHECK: 'true',
  BROWSER: 'none',
})
prepareStaticPreviewEnvironment()
const factory = require(path.join(renderer, 'node_modules/react-app-rewired/config/webpack.config'))
const config = factory('development')
config.output.path = output
config.output.publicPath = '/'
configureStaticPreviewOutput(config)
// FAST_REFRESH=false reaches CRA before config creation, disabling both halves.
assertStaticPreviewConfig(config)
fs.mkdirSync(output, { recursive: true })
fs.cpSync(path.join(renderer, 'public'), output, { recursive: true })
const webpack = require(path.join(renderer, 'node_modules/webpack'))
console.log('Batch3 isolated output:', output)
const compiler = webpack(config)
compiler.run((error, stats) => {
  if (error) console.error(error)
  if (stats)
    console.log(stats.toString({ all: false, errors: true, warnings: true, errorDetails: true, timings: true }))
  let failed = Boolean(error || !stats || stats.hasErrors())
  if (!failed) {
    try {
      assertStaticPreviewAssets(output)
    } catch (validationError) {
      console.error(validationError)
      failed = true
    }
  }
  compiler.close((closeError) => {
    if (closeError) console.error(closeError)
    console.log(failed || closeError ? 'BATCH3_BUILD_FAILED' : 'BATCH3_BUILD_SUCCESS')
    process.exitCode = failed || closeError ? 1 : 0
  })
})
