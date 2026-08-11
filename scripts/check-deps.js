#!/usr/bin/env node
/*
 * 启动前依赖一致性检查
 *
 * 覆盖三种情况：
 *   ① 首次启动（某个 node_modules 不存在）→ 提示先跑 install 三步曲
 *   ② 已安装但依赖有更新（yarn.lock 相对 git HEAD 有改动）→ 提示哪些子项目需重新安装
 *   ③ 一切就绪 → 提示可以启动
 *
 * 仅做本地文件 / git 比对，不联网、不执行 install，几乎瞬时。
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')

// 三个子项目：name → 相对根目录的路径
const PROJECTS = [
  { name: '根目录', dir: '', installCmd: 'yarn install' },
  { name: '主渲染端', dir: 'app/renderer/src/main', installCmd: 'yarn install-render' },
  { name: 'Link 渲染端', dir: 'app/renderer/engine-link-startup', installCmd: 'yarn install-link-render' },
]

function exists(p) {
  try {
    return fs.existsSync(p)
  } catch (e) {
    return false
  }
}

// 检测 yarn.lock 是否相对 git HEAD 有改动（工作区未提交的改动也算）
function lockChanged(dir) {
  const lockPath = path.join(dir, 'yarn.lock')
  if (!exists(lockPath)) return false
  try {
    // --quiet: 有改动时退出码 1（输出被抑制）；无改动退出码 0
    // 用相对路径，确保 git 在仓库根目录比对
    const rel = dir ? path.join(dir, 'yarn.lock') : 'yarn.lock'
    execSync(`git diff --quiet HEAD -- ${JSON.stringify(rel)}`, { cwd: ROOT, stdio: 'ignore' })
    return false
  } catch (e) {
    return true
  }
}

function main() {
  // 情况①：检查 node_modules 是否都存在
  const missing = PROJECTS.filter((p) => !exists(path.join(ROOT, p.dir, 'node_modules')))

  if (missing.length > 0) {
    console.log('[需操作] 检测到未安装的依赖')
    console.log('')
    console.log('以下子项目尚未安装依赖：')
    missing.forEach((p) => console.log(`  - ${p.name}`))
    console.log('')
    console.log('请先按顺序执行依赖安装（首次或重新克隆后必需）：')
    console.log('  yarn install              # 1. 根目录')
    console.log('  yarn install-render        # 2. 主渲染端')
    console.log('  yarn install-link-render   # 3. Link 渲染端')
    console.log('')
    console.log('安装完成后再启动项目。')
    process.exit(0)
  }

  // 情况②：检查 yarn.lock 是否相对 git HEAD 有改动
  const changed = PROJECTS.filter((p) => lockChanged(p.dir))

  if (changed.length > 0) {
    console.log('[需操作] 检测到依赖可能有更新')
    console.log('')
    console.log('以下子项目的 yarn.lock 相对 git HEAD 有改动（通常是 git pull 拉到了别人的依赖变更）：')
    changed.forEach((p) => console.log(`  - ${p.name}`))
    console.log('')
    console.log('本地 node_modules 可能已滞后，建议重新安装对应子项目的依赖：')
    changed.forEach((p) => console.log(`  ${p.installCmd}`))
    console.log('')
    console.log('如确认无需更新可直接启动，请向用户确认后跳过此步。')
    process.exit(0)
  }

  // 情况③：一切就绪
  console.log('[可启动] 依赖一致，可以启动项目')
  console.log('')
  console.log('接下来：')
  console.log('  yarn start-renders       # 同时启动两个渲染端（:3000 + :5173）')
  console.log('  yarn start-electron      # 两端口就绪后启动 Electron 主进程')
  process.exit(0)
}

main()
