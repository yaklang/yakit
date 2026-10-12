const fs = require('fs')
const path = require('path')
const { defineConfig, externalizeDepsPlugin } = require('electron-vite')
const { mainBytecodePlugin } = require('./scripts/bytecode-plugin')
const { plaintextRuntimeFiles } = require('./scripts/main-runtime-assets')

const mainSourceDir = path.resolve(__dirname, 'app/main')

const collectMainEntries = (dir, entries = {}) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name)
    const relativePath = path.relative(mainSourceDir, absolutePath).replaceAll('\\', '/')

    if (entry.isDirectory()) {
      if (entry.name === '__test__' || entry.name === '__tests__') continue
      collectMainEntries(absolutePath, entries)
      continue
    }

    if (!entry.name.endsWith('.js') || plaintextRuntimeFiles.has(relativePath)) continue
    entries[relativePath.slice(0, -3)] = absolutePath
  }

  return entries
}

module.exports = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), mainBytecodePlugin()],
    build: {
      outDir: 'app/main-bytecode',
      emptyOutDir: true,
      sourcemap: false,
      minify: true,
      rollupOptions: {
        input: collectMainEntries(mainSourceDir),
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          preserveModules: true,
          preserveModulesRoot: mainSourceDir,
        },
      },
    },
  },
})
