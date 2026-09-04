const fs = require('fs')
const path = require('path')

const YAK_ENGINE_VERSION_PATTERN = /^(?:dev\/)?[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const RETRYABLE_FILE_ERRORS = new Set(['EACCES', 'EBUSY', 'EPERM'])

const normalizeYakEngineVersion = (version) => {
  if (typeof version !== 'string') throw new Error('yak engine version must be a string')
  const normalized = version.trim()
  if (!YAK_ENGINE_VERSION_PATTERN.test(normalized)) {
    throw new Error('invalid yak engine version')
  }
  return normalized
}

const isPathWithin = (rootPath, candidatePath) => {
  const relative = path.relative(rootPath, candidatePath)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

const resolveYakEnginePaths = ({ version, engineDir, destination }) => {
  const normalizedVersion = normalizeYakEngineVersion(version)
  const resolvedEngineDir = path.resolve(engineDir)
  const sourceName = normalizedVersion.startsWith('dev/')
    ? `yak-${normalizedVersion.replace('dev/', 'dev-')}`
    : `yak-${normalizedVersion}`
  const sourcePath = path.resolve(resolvedEngineDir, sourceName)
  const destinationPath = path.resolve(destination)

  if (!isPathWithin(resolvedEngineDir, sourcePath) || !isPathWithin(resolvedEngineDir, destinationPath)) {
    throw new Error('yak engine path escapes the managed engine directory')
  }
  return { normalizedVersion, sourcePath, destinationPath }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const copyWithRetries = async (sourcePath, destinationPath, retries = 2) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.promises.copyFile(sourcePath, destinationPath)
      return
    } catch (error) {
      if (attempt >= retries || !RETRYABLE_FILE_ERRORS.has(error?.code)) throw error
      await wait(500)
    }
  }
}

const installYakEngineFile = async ({ version, engineDir, destination, platform = process.platform }) => {
  const { sourcePath, destinationPath } = resolveYakEnginePaths({ version, engineDir, destination })
  const sourceStats = await fs.promises.stat(sourcePath)
  if (!sourceStats.isFile()) throw new Error('yak engine source must be a file')

  try {
    await copyWithRetries(sourcePath, destinationPath)
    if (platform !== 'win32') await fs.promises.chmod(destinationPath, 0o755)
  } catch (error) {
    if (RETRYABLE_FILE_ERRORS.has(error?.code)) throw new Error('operation not permitted')
    throw error
  }
}

module.exports = {
  installYakEngineFile,
  normalizeYakEngineVersion,
  resolveYakEnginePaths,
}
