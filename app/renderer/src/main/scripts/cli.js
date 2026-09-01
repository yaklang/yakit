const { execFileSync } = require('child_process')
const path = require('path')

const edition = process.env.YAKIT_EDITION
if (!edition) {
  console.error('未指定 YAKIT_EDITION。请从仓库根目录使用: yarn cli start -v <edition> 或 yarn cli build -v <edition>')
  process.exit(1)
}

const build = process.argv.includes('--build')
const bin = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite')
const args = build ? ['build'] : []

console.log(`Main-Render ${build ? 'build' : 'start'} (${edition})`)

try {
  execFileSync(bin, args, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env,
  })
} catch (error) {
  console.error(`Failed to execute vite${build ? ' build' : ''}`)
  console.error(error?.message || error)
  process.exit(1)
}
