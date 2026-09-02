#!/usr/bin/env node
/*
 * 启动前依赖一致性检查
 *
 * 覆盖三种情况：
 *   ① 首次启动（某个 node_modules 不存在）→ 提示先跑 install
 *   ② 已安装但依赖有更新（yarn.lock 相对 git HEAD 有改动）→ 提示哪些子项目需重新安装
 *   ③ 一切就绪 → 提示可以启动
 *
 * 仅做本地文件 / git 比对，不联网、不执行 install，几乎瞬时。
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')

const detectPackageManager = () => {
  const ua = String(process.env.npm_config_user_agent || '').toLowerCase()
  if (ua.includes('pnpm')) return 'pnpm'
  if (ua.includes('yarn')) return 'yarn'
  if (ua.includes('npm')) return 'npm'

  const execpath = String(process.env.npm_execpath || '').toLowerCase()
  if (execpath.includes('pnpm')) return 'pnpm'
  if (execpath.includes('yarn')) return 'yarn'
  if (execpath.includes('npm')) return 'npm'

  if (fs.existsSync(path.join(ROOT, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(ROOT, 'yarn.lock'))) return 'yarn'
  if (fs.existsSync(path.join(ROOT, 'package-lock.json'))) return 'npm'
  return 'yarn'
}

const pm = detectPackageManager()
const runCli = (args) => {
  if (pm === 'npm') return `npm run cli -- ${args}`
  if (pm === 'pnpm') return `pnpm cli ${args}`
  return `yarn cli ${args}`
}

const PROJECTS = [
  { name: '根目录', dir: '', installCmd: runCli('install electron') },
  { name: '主渲染端', dir: 'app/renderer/src/main', installCmd: runCli('install main') },
  { name: 'Link 渲染端', dir: 'app/renderer/engine-link-startup', installCmd: runCli('install link') },
]

function exists(p) {
  try {
    return fs.existsSync(p)
  } catch (e) {
    return false
  }
}

function lockChanged(dir) {
  const lockPath = path.join(dir, 'yarn.lock')
  if (!exists(lockPath)) return false
  try {
    const rel = dir ? path.join(dir, 'yarn.lock') : 'yarn.lock'
    execSync(`git diff --quiet HEAD -- ${JSON.stringify(rel)}`, { cwd: ROOT, stdio: 'ignore' })
    return false
  } catch (e) {
    return true
  }
}

function main() {
  const missing = PROJECTS.filter((p) => !exists(path.join(ROOT, p.dir, 'node_modules')))

  if (missing.length > 0) {
    console.log('[需操作] 检测到未安装的依赖')
    console.log('')
    console.log('以下子项目尚未安装依赖：')
    missing.forEach((p) => console.log(`  - ${p.name}`))
    console.log('')
    console.log('请先执行依赖安装（首次或重新克隆后必需）：')
    console.log(`  ${runCli('install')}          # 根目录 + 两个渲染端`)
    console.log('')
    console.log('安装完成后再启动项目。')
    process.exit(0)
  }

  const changed = PROJECTS.filter((p) => lockChanged(p.dir))

  if (changed.length > 0) {
    console.log('[需操作] 检测到依赖可能有更新')
    console.log('')
    console.log('以下子项目的 yarn.lock 相对 git HEAD 有改动（通常是 git pull 拉到了别人的依赖变更）：')
    changed.forEach((p) => console.log(`  - ${p.name}`))
    console.log('')
    console.log('本地 node_modules 可能已滞后，建议重新安装对应子项目的依赖：')
    changed.forEach((p) => console.log(`  ${p.installCmd}`))
    console.log(`  或一次重装全部: ${runCli('install')}`)
    console.log('')
    console.log('如确认无需更新可直接启动，请向用户确认后跳过此步。')
    process.exit(0)
  }

  console.log('[可启动] 依赖一致，可以启动项目')
  console.log('')
  console.log('接下来：')
  console.log(`  ${runCli('start -v yakit')}   # 同时启动两个渲染端（:3000 + :5173）`)
  console.log(`  ${runCli('electron')}         # 两端口就绪后启动 Electron 主进程`)
  console.log(`  或: ${runCli('dev -v yakit')} # 一条命令 start + wait-on + electron`)
  process.exit(0)
}

main()
