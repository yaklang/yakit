const fs = require('fs')
const path = require('path')

const directoryPart = (value) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error('invalid AI image directory')
  }
  return value
}

/** 复制草稿并回传精确路径映射；会话绑定成功后再由调用方删除草稿。 */
const adoptAIImages = async (root, { draftId, sessionId, chatDataStoreKey }) => {
  const base = path.join(root, directoryPart(chatDataStoreKey))
  const from = path.join(base, directoryPart(draftId))
  const to = path.join(base, directoryPart(sessionId))
  if (from === to) return {}
  let entries
  try {
    const stat = await fs.promises.lstat(from)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('invalid AI image draft')
    entries = await fs.promises.readdir(from, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
  if (entries.some((entry) => !entry.isFile())) throw new Error('invalid AI image draft contents')
  // 目标必须是新目录；不覆盖其他会话的图片。
  await fs.promises.mkdir(to)
  const mapping = {}
  try {
    for (const entry of entries) {
      const source = path.join(from, entry.name)
      const target = path.join(to, entry.name)
      await fs.promises.copyFile(source, target, fs.constants.COPYFILE_EXCL)
      mapping[source] = target
    }
  } catch (error) {
    await fs.promises.rm(to, { recursive: true, force: true })
    throw error
  }
  return mapping
}

const discardAIImageDraft = async (root, { draftId, chatDataStoreKey }) => {
  const directory = path.join(root, directoryPart(chatDataStoreKey), directoryPart(draftId))
  await fs.promises.rm(directory, { recursive: true, force: true })
}

module.exports = { adoptAIImages, discardAIImageDraft }
