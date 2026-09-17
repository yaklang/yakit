import path from 'node:path'

interface AppPaths {
  isPackaged?: boolean
  setPath(name: 'userData', value: string): void
}

const E2E_MODE_ENV = 'YAKIT_E2E'
const E2E_USER_DATA_ENV = 'YAKIT_E2E_USER_DATA'

/**
 * Configure process-local Electron paths before any module reads app.getPath.
 * Normal development and packaged startup are deliberately unaffected.
 */
function configureE2EEnvironment(app: AppPaths, env: NodeJS.ProcessEnv = process.env) {
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

export { E2E_MODE_ENV, E2E_USER_DATA_ENV, configureE2EEnvironment }
