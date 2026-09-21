const fs = require('fs')
const path = require('path')

/** 仅社区版 Yakit 非 legacy 安装包内置轻量引擎；legacy 无 slim 产物，保持标准引擎 */
const writeEngineBuildTypeFile = () => {
  const edition = process.env.YAKIT_EDITION || 'yakit'
  const isLegacy = process.env.YAKIT_LEGACY == 'true'
  const type = edition === 'yakit' && !isLegacy ? 'slim' : 'full'
  const dir = path.join(process.cwd(), 'bins')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'engine-build-type.txt'), type)
  return type
}

module.exports = writeEngineBuildTypeFile
