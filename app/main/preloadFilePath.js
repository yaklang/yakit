const { webUtils } = require('electron')

const getPathForFile = (file) => {
  if (!webUtils) return file?.path || ''
  try {
    return webUtils.getPathForFile(file) || ''
  } catch {
    return ''
  }
}

// 主窗口没有上下文隔离，直接补上 File.path。引擎链接窗口要在页面里调用 getPathForFile。
const installFilePath = (scope) => {
  const File = scope?.File
  if (!webUtils || typeof File !== 'function' || Object.prototype.hasOwnProperty.call(File.prototype, 'path')) return
  Object.defineProperty(File.prototype, 'path', {
    configurable: true,
    enumerable: true,
    get() {
      return getPathForFile(this)
    },
  })
}

module.exports = { getPathForFile, installFilePath }
