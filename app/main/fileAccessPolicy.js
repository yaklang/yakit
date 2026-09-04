const fs = require('fs')
const path = require('path')

const DEFAULT_GRANT_TTL_MS = 30 * 60 * 1000
const grantsBySender = new Map()
const cleanupRegisteredSenders = new Set()

const getSender = (event) => {
  const sender = event?.sender
  if (!sender || !Number.isInteger(sender.id)) {
    throw new Error('file access requires an IPC sender')
  }
  return sender
}

const isPathWithin = (rootPath, candidatePath) => {
  const relative = path.relative(rootPath, candidatePath)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

const canonicalizePath = (targetPath, { allowMissing = false } = {}) => {
  if (typeof targetPath !== 'string' || !targetPath.trim() || !path.isAbsolute(targetPath.trim())) {
    throw new Error('an absolute file path is required')
  }

  const resolvedPath = path.resolve(targetPath.trim())
  if (fs.existsSync(resolvedPath)) {
    return fs.realpathSync.native(resolvedPath)
  }
  if (!allowMissing) {
    throw new Error('the selected file path does not exist')
  }

  const parentPath = path.dirname(resolvedPath)
  const canonicalParent = fs.realpathSync.native(parentPath)
  return path.join(canonicalParent, path.basename(resolvedPath))
}

const cleanupExpiredGrants = (senderId) => {
  const grants = grantsBySender.get(senderId)
  if (!grants) return []

  const now = Date.now()
  const activeGrants = grants.filter((grant) => grant.expiresAt > now)
  if (activeGrants.length > 0) grantsBySender.set(senderId, activeGrants)
  else grantsBySender.delete(senderId)
  return activeGrants
}

const registerSenderCleanup = (sender) => {
  if (cleanupRegisteredSenders.has(sender.id)) return
  cleanupRegisteredSenders.add(sender.id)
  sender.once?.('destroyed', () => {
    grantsBySender.delete(sender.id)
    cleanupRegisteredSenders.delete(sender.id)
  })
}

const grantFileAccess = (event, targetPath, capabilities, options = {}) => {
  const sender = getSender(event)
  const canonicalPath = canonicalizePath(targetPath, { allowMissing: options.allowMissing === true })
  const grant = {
    path: canonicalPath,
    recursive: options.recursive === true,
    capabilities: new Set(capabilities),
    expiresAt: Date.now() + (options.ttlMs || DEFAULT_GRANT_TTL_MS),
  }

  const grants = cleanupExpiredGrants(sender.id)
  grants.push(grant)
  grantsBySender.set(sender.id, grants)
  registerSenderCleanup(sender)
  return canonicalPath
}

const grantOpenDialogResult = (event, result) => {
  if (result?.canceled || !Array.isArray(result?.filePaths)) return result

  result.filePaths.forEach((selectedPath) => {
    const stats = fs.statSync(selectedPath)
    grantFileAccess(event, selectedPath, ['read', 'write', 'delete', 'rename', 'probe'], {
      recursive: stats.isDirectory(),
    })
  })
  return result
}

const grantSaveDialogResult = (event, result) => {
  if (result?.canceled || !result?.filePath) return result
  grantFileAccess(event, result.filePath, ['write', 'probe'], { allowMissing: true })
  return result
}

const assertFileAccess = (event, targetPath, capability, options = {}) => {
  const sender = getSender(event)
  const candidatePath = canonicalizePath(targetPath, { allowMissing: options.allowMissing === true })
  const grants = cleanupExpiredGrants(sender.id)
  const allowed = grants.some((grant) => {
    if (!grant.capabilities.has(capability)) return false
    return grant.recursive ? isPathWithin(grant.path, candidatePath) : grant.path === candidatePath
  })

  if (!allowed) {
    throw new Error(`file ${capability} access was not granted by a system file dialog`)
  }
  return candidatePath
}

const assertRenameAccess = (event, oldPath, newPath) => {
  const canonicalOldPath = assertFileAccess(event, oldPath, 'rename')
  const canonicalNewPath = canonicalizePath(newPath, { allowMissing: true })
  if (fs.existsSync(canonicalNewPath)) {
    throw new Error('renaming over an existing file is not allowed')
  }

  try {
    assertFileAccess(event, newPath, 'write', { allowMissing: true })
  } catch (error) {
    if (path.dirname(canonicalOldPath) !== path.dirname(canonicalNewPath)) throw error
  }
  return { oldPath: canonicalOldPath, newPath: canonicalNewPath }
}

const clearFileAccessGrantsForTests = () => {
  grantsBySender.clear()
  cleanupRegisteredSenders.clear()
}

module.exports = {
  assertFileAccess,
  assertRenameAccess,
  canonicalizePath,
  clearFileAccessGrantsForTests,
  grantFileAccess,
  grantOpenDialogResult,
  grantSaveDialogResult,
  isPathWithin,
}
