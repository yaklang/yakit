import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const cliDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(cliDir, '..')

const MAIN_RENDER_DIR = path.join(repoRoot, 'app/renderer/src/main')
const LINK_RENDER_DIR = path.join(repoRoot, 'app/renderer/engine-link-startup')

const detectPackageManager = () => {
  const ua = String(process.env.npm_config_user_agent || '').toLowerCase()
  if (ua.includes('pnpm')) return 'pnpm'
  if (ua.includes('yarn')) return 'yarn'
  if (ua.includes('npm')) return 'npm'

  const execpath = String(process.env.npm_execpath || '').toLowerCase()
  if (execpath.includes('pnpm')) return 'pnpm'
  if (execpath.includes('yarn')) return 'yarn'
  if (execpath.includes('npm')) return 'npm'

  if (fs.existsSync(path.join(repoRoot, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(repoRoot, 'yarn.lock'))) return 'yarn'
  if (fs.existsSync(path.join(repoRoot, 'package-lock.json'))) return 'npm'
  return null
}

const packageManagerHint = () => {
  const pm = detectPackageManager()
  if (pm === 'pnpm') return 'pnpm cli install'
  if (pm === 'npm') return 'npm run cli -- install'
  if (pm === 'yarn') return 'yarn cli install'
  return 'yarn cli install / npm run cli -- install / pnpm cli install'
}

/**
 * @name 检测引入模块是否存在，若不存在则提示安装依赖并退出进程
 * @param {String} packageName 模块名
 * @param {Function} selector 从模块中选择需要的部分
 */
const importWithHint = async (packageName, selector) => {
  try {
    const mod = await import(packageName)
    return selector(mod)
  } catch (error) {
    const msg = String(error?.message || '')
    const isMissingDependency = error?.code === 'ERR_MODULE_NOT_FOUND' && msg.includes(`'${packageName}'`)

    if (isMissingDependency) {
      console.log(`\n缺少依赖: ${packageName}`)
      console.log(`请先在项目根目录执行: ${packageManagerHint()}\n`)
      process.exit(1)
    }
    throw error
  }
}

/**
 * @name 传入对象数组、左展示字段名、右展示字段名，生成一个展示列表字符串(已带换行)
 */
const genCLIDisplayList = (arr, leftKey, rightKey) => {
  try {
    const maxLength = arr.reduce((max, item) => Math.max(max, String(item[leftKey]).length), 0)
    return arr.map((item) => `  ${String(item[leftKey]).padEnd(maxLength + 4)}${item[rightKey]}`).join('\n')
  } catch (error) {
    return ''
  }
}

/** 把目录下 node_modules/.bin 放到 PATH 最前，不依赖 yarn/npm/pnpm */
const withLocalBin = (cwd, extraEnv = {}) => {
  const bin = path.join(cwd, 'node_modules', '.bin')
  return {
    ...process.env,
    ...extraEnv,
    PATH: `${bin}${path.delimiter}${process.env.PATH || ''}`,
  }
}

const isTTY = () => Boolean(process.stdout.isTTY)

export {
  repoRoot,
  cliDir,
  MAIN_RENDER_DIR,
  LINK_RENDER_DIR,
  detectPackageManager,
  packageManagerHint,
  importWithHint,
  genCLIDisplayList,
  withLocalBin,
  isTTY,
}
