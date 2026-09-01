const { execFileSync } = require('child_process')
const path = require('path')

const edition = process.env.YAKIT_EDITION
if (!edition) {
  console.error('未指定 YAKIT_EDITION。请从仓库根目录使用: yarn cli start -v <edition> 或 yarn cli build -v <edition>')
  process.exit(1)
}

const build = process.argv.includes('--build')
const cwd = path.join(__dirname, '..')
const binName = process.platform === 'win32' ? 'vite.cmd' : 'vite'
const tscName = process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
const viteBin = path.join(cwd, 'node_modules', '.bin', binName)

console.log(`Link-Render ${build ? 'build' : 'start'} (${edition})`)

try {
  if (build) {
    execFileSync(path.join(cwd, 'node_modules', '.bin', tscName), ['-b'], {
      stdio: 'inherit',
      cwd,
      env: process.env,
    })
    execFileSync(viteBin, ['build'], { stdio: 'inherit', cwd, env: process.env })
  } else {
    execFileSync(viteBin, [], { stdio: 'inherit', cwd, env: process.env })
  }
} catch (error) {
  console.error(`Failed to execute Link-Render ${build ? 'build' : 'start'}`)
  console.error(error?.message || error)
  process.exit(1)
}
