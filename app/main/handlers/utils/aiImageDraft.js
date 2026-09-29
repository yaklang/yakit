const fs = require('fs')
const path = require('path')

const directoryPart = (value) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error('invalid AI image directory')
  }
  return value
}

const discardAIImageDraft = async (root, { draftId, chatDataStoreKey }) => {
  const directory = path.join(root, directoryPart(chatDataStoreKey), directoryPart(draftId))
  await fs.promises.rm(directory, { recursive: true, force: true })
}

module.exports = { discardAIImageDraft }
