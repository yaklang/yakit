const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { pipeline } = require('stream/promises')

const downloadDisposalFile = async ({ url, fileName }, showSaveDialog) => {
  const address = new URL(url)
  if (!['http:', 'https:'].includes(address.protocol)) throw new Error('不支持的下载地址')
  const urlName = decodeURIComponent(address.pathname).replace(
    /(\.(?:jpe?g|png|gif|txt|xlsx?|csv|pdf|word|docx))_\d{13}$/i,
    '$1',
  )
  const suggestedName = path.basename((fileName || urlName).replace(/\\/g, '/')) || 'download'
  const { canceled, filePath } = await showSaveDialog({
    title: '保存文件',
    defaultPath: suggestedName,
    properties: ['showOverwriteConfirmation'],
  })
  if (canceled || !filePath) return { canceled: true }

  // 先写临时文件，下载完成后再替换，失败时保留用户原有文件。
  const temporaryPath = `${filePath}.${randomUUID()}.download`
  try {
    const response = await axios.get(address.href, { responseType: 'stream', timeout: 5 * 60 * 1000 })
    await pipeline(response.data, fs.createWriteStream(temporaryPath, { flags: 'wx' }))
    await fs.promises.rename(temporaryPath, filePath)
    return { canceled: false, filePath }
  } finally {
    await fs.promises.unlink(temporaryPath).catch(() => {})
  }
}

module.exports = { downloadDisposalFile }
