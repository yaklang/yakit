const path = require('path')

const E2E_MODE_ENV = 'YAKIT_E2E'
const E2E_USER_DATA_ENV = 'YAKIT_E2E_USER_DATA'
const E2E_FIXTURE_NAME = 'table-virtual-fixed-right'
const E2E_FIXTURE_PROTOCOL_VERSION = 1
const E2E_FIXTURE_ARGUMENT_PREFIX = '--yakit-e2e-fixture-capability='

function resolveE2EFixtureStartupCapability({ e2eEnabled, isDev, fixtureEnabled }) {
  if (!e2eEnabled || isDev || !fixtureEnabled) return null

  return {
    name: E2E_FIXTURE_NAME,
    protocolVersion: E2E_FIXTURE_PROTOCOL_VERSION,
    argument: `${E2E_FIXTURE_ARGUMENT_PREFIX}${E2E_FIXTURE_NAME}:${E2E_FIXTURE_PROTOCOL_VERSION}`,
  }
}

function parseE2EFixtureStartupCapability(argv = []) {
  const capabilityArguments = argv.filter(
    (argument) => typeof argument === 'string' && argument.startsWith(E2E_FIXTURE_ARGUMENT_PREFIX),
  )
  if (capabilityArguments.length !== 1) return null

  const payload = capabilityArguments[0].slice(E2E_FIXTURE_ARGUMENT_PREFIX.length)
  if (payload !== `${E2E_FIXTURE_NAME}:${E2E_FIXTURE_PROTOCOL_VERSION}`) return null

  return {
    name: E2E_FIXTURE_NAME,
    protocolVersion: E2E_FIXTURE_PROTOCOL_VERSION,
  }
}

/**
 * Configure process-local Electron paths before any module reads app.getPath.
 * Normal development and packaged startup are deliberately unaffected.
 */
function configureE2EEnvironment(app, env = process.env) {
  if (env[E2E_MODE_ENV] !== '1') {
    return { enabled: false }
  }
  if (app.isPackaged === true) {
    throw new Error(`${E2E_MODE_ENV} is only supported by unpackaged test builds`)
  }

  const userDataPath = env[E2E_USER_DATA_ENV]
  if (!userDataPath) {
    throw new Error(`${E2E_USER_DATA_ENV} is required when ${E2E_MODE_ENV}=1`)
  }
  if (!path.isAbsolute(userDataPath)) {
    throw new Error(`${E2E_USER_DATA_ENV} must be an absolute path`)
  }
  if (path.resolve(userDataPath) === path.parse(userDataPath).root) {
    throw new Error(`${E2E_USER_DATA_ENV} must not be a filesystem root`)
  }

  app.setPath('userData', path.normalize(userDataPath))
  return {
    enabled: true,
    userDataPath: path.normalize(userDataPath),
  }
}

module.exports = {
  E2E_FIXTURE_ARGUMENT_PREFIX,
  E2E_FIXTURE_NAME,
  E2E_FIXTURE_PROTOCOL_VERSION,
  E2E_MODE_ENV,
  E2E_USER_DATA_ENV,
  configureE2EEnvironment,
  parseE2EFixtureStartupCapability,
  resolveE2EFixtureStartupCapability,
}
