const fs = require('fs')
const path = require('path')

const outputDir = path.resolve(__dirname, '../app/main-bytecode')

const fixLoaders = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      fixLoaders(filePath)
      continue
    }
    if (!entry.name.endsWith('.js')) continue

    const bytecodePath = `${filePath}c`
    if (!fs.existsSync(bytecodePath)) continue

    const source = fs.readFileSync(filePath, 'utf8')
    const fixed = source.replace(/require\(("|')(\.\/.+\.jsc)\1\);/, 'module.exports = require($1$2$1);')
    if (fixed === source) throw new Error(`unable to update bytecode loader exports: ${filePath}`)
    fs.writeFileSync(filePath, fixed)
  }
}

fixLoaders(outputDir)
