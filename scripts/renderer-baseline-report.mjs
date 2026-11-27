#!/usr/bin/env node
/**
 * 渲染端静态基线报告：入口引用、首屏体积（raw/gzip）、lazy chunk、静态主题 token。
 *
 * 用法：
 *   node scripts/renderer-baseline-report.mjs
 *   node scripts/renderer-baseline-report.mjs --json
 *   node scripts/renderer-baseline-report.mjs --out <file.md>
 *
 * 默认分析 Yakit 版产物：
 *   - link: app/renderer/pages/link
 *   - main: app/renderer/pages/main
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const outIndex = args.indexOf('--out')
const outFile = outIndex >= 0 ? args[outIndex + 1] : null

const targets = [
  { name: 'link', dir: path.join(repoRoot, 'app/renderer/pages/link'), htmlName: 'engine-link.html' },
  { name: 'main', dir: path.join(repoRoot, 'app/renderer/pages/main') },
]

const themeTokens = [
  '--yakit-colors-Main-60',
  '--yakit-colors-Neutral-0',
  '--yakit-colors-Neutral-50',
  '--yakit-colors-Neutral-100',
  '--yakit-colors-Blue-50',
  '--yakit-colors-Red-60',
  '--yakit-colors-Green-60',
  '--yakit-colors-Warning-60',
  '--yakit-colors-Error-60',
]

function gzipSize(file) {
  return zlib.gzipSync(fs.readFileSync(file)).length
}

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MB`
  return `${(bytes / 1024).toFixed(1)}KB`
}

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

function packageVersion(pkgJsonPath) {
  try {
    return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).version
  } catch {
    return 'unknown'
  }
}

function dependencyVersions() {
  const mainModules = path.join(repoRoot, 'app/renderer/src/main/node_modules')
  return {
    react: packageVersion(path.join(mainModules, 'react/package.json')),
    antd: packageVersion(path.join(mainModules, 'antd/package.json')),
    'monaco-editor': packageVersion(path.join(mainModules, 'monaco-editor/package.json')),
    'react-monaco-editor': packageVersion(path.join(mainModules, 'react-monaco-editor/package.json')),
    '@yakit-libs/yakit-ui-icons': packageVersion(path.join(mainModules, '@yakit-libs/yakit-ui-icons/package.json')),
    '@yakit-libs/color': packageVersion(path.join(mainModules, '@yakit-libs/color/package.json')),
  }
}

function parseThemeCss(file) {
  if (!fs.existsSync(file)) return null
  const source = fs.readFileSync(file, 'utf8')
  const extract = (selector) => {
    const start = source.indexOf(selector)
    if (start < 0) return {}
    const open = source.indexOf('{', start)
    const close = source.indexOf('}', open)
    if (open < 0 || close < 0) return {}
    const block = source.slice(open + 1, close)
    const result = {}
    for (const token of themeTokens) {
      const match = block.match(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*([^;]+);`))
      if (match) result[token] = match[1].trim()
    }
    return result
  }
  return {
    file: path.relative(repoRoot, file).split(path.sep).join('/'),
    bytes: fs.statSync(file).size,
    gzipBytes: gzipSize(file),
    light: extract(':root'),
    dark: extract('[data-theme="dark"]'),
  }
}

function analyze({ name, dir, htmlName = 'index.html' }) {
  const htmlPath = path.join(dir, htmlName)
  if (!fs.existsSync(htmlPath)) {
    return { name, dir: path.relative(repoRoot, dir).split(path.sep).join('/'), missing: true }
  }

  const html = fs.readFileSync(htmlPath, 'utf8')
  const refs = [...html.matchAll(/(?:src|href)="(?:\.\/)?(assets\/[^"]+)"/g)].map((m) => m[1])
  const refSet = new Set(refs)

  let jsBytes = 0
  let cssBytes = 0
  let jsGzip = 0
  let cssGzip = 0
  const firstLoad = []

  for (const ref of refs) {
    const file = path.join(dir, ref)
    if (!fs.existsSync(file)) continue
    const bytes = fs.statSync(file).size
    const gzip = gzipSize(file)
    if (ref.endsWith('.css')) {
      cssBytes += bytes
      cssGzip += gzip
    } else if (ref.endsWith('.js')) {
      jsBytes += bytes
      jsGzip += gzip
    }
    firstLoad.push({ ref, bytes, gzipBytes: gzip })
  }

  const assetsDir = path.join(dir, 'assets')
  const jsAssets = fs.existsSync(assetsDir)
    ? fs
        .readdirSync(assetsDir)
        .filter((file) => file.endsWith('.js'))
        .map((file) => {
          const filePath = path.join(assetsDir, file)
          return { ref: `assets/${file}`, bytes: fs.statSync(filePath).size }
        })
    : []

  const lazy = jsAssets
    .filter((asset) => !refSet.has(asset.ref))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10)

  return {
    name,
    dir: path.relative(repoRoot, dir).split(path.sep).join('/'),
    htmlBytes: fs.statSync(htmlPath).size,
    modulePreloadCount: (html.match(/rel="modulepreload"/g) || []).length,
    firstLoad,
    totals: {
      jsBytes,
      jsGzip,
      cssBytes,
      cssGzip,
      totalBytes: jsBytes + cssBytes,
      totalGzip: jsGzip + cssGzip,
    },
    lazy,
    themeCss: parseThemeCss(path.join(dir, 'theme.css')),
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  commit: gitHead(),
  edition: process.env.YAKIT_EDITION || 'yakit',
  node: process.version,
  dependencies: dependencyVersions(),
  targets: targets.map(analyze),
}

if (asJson) {
  const text = JSON.stringify(report, null, 2)
  if (outFile) fs.writeFileSync(path.resolve(repoRoot, outFile), text)
  else console.log(text)
} else {
  const lines = []
  lines.push('# 渲染端静态基线')
  lines.push('')
  lines.push(`- 生成时间：${report.generatedAt}`)
  lines.push(`- Commit：\`${report.commit}\``)
  lines.push(`- 版本：\`${report.edition}\``)
  lines.push(`- Node：\`${report.node}\``)
  lines.push('')
  lines.push('| 依赖 | 版本 |')
  lines.push('| --- | --- |')
  for (const [name, version] of Object.entries(report.dependencies)) {
    lines.push(`| \`${name}\` | ${version} |`)
  }
  lines.push('')
  for (const target of report.targets) {
    lines.push(`## ${target.name}`)
    lines.push('')
    if (target.missing) {
      lines.push('> 产物缺失')
      lines.push('')
      continue
    }
    lines.push(`- 产物目录：\`${target.dir}\``)
    lines.push(`- index.html：${fmt(target.htmlBytes)}`)
    lines.push(`- modulepreload：${target.modulePreloadCount}`)
    lines.push(`- 首屏 JS：${fmt(target.totals.jsBytes)}（${fmt(target.totals.jsGzip)} gzip）`)
    lines.push(`- 首屏 CSS：${fmt(target.totals.cssBytes)}（${fmt(target.totals.cssGzip)} gzip）`)
    lines.push(`- 首屏合计：${fmt(target.totals.totalBytes)}（${fmt(target.totals.totalGzip)} gzip）`)
    lines.push('')
    const topRefs = [...target.firstLoad].sort((a, b) => b.bytes - a.bytes).slice(0, 15)
    lines.push('| 首屏引用（按体积 Top 15） | raw | gzip |')
    lines.push('| --- | ---: | ---: |')
    for (const ref of topRefs) {
      lines.push(`| \`${ref.ref}\` | ${fmt(ref.bytes)} | ${fmt(ref.gzipBytes)} |`)
    }
    if (target.firstLoad.length > topRefs.length) {
      lines.push('')
      lines.push(`> 其余 ${target.firstLoad.length - topRefs.length} 个首屏引用见同名 JSON 报告。`)
    }
    lines.push('')
    if (target.lazy.length) {
      lines.push('| 主要 lazy chunk | raw |')
      lines.push('| --- | ---: |')
      for (const chunk of target.lazy) {
        lines.push(`| \`${chunk.ref}\` | ${fmt(chunk.bytes)} |`)
      }
      lines.push('')
    }
    if (target.themeCss) {
      lines.push(`- theme.css：${fmt(target.themeCss.bytes)}（${fmt(target.themeCss.gzipBytes)} gzip）`)
      lines.push('')
      lines.push('| token | light | dark |')
      lines.push('| --- | --- | --- |')
      const tokens = new Set([...Object.keys(target.themeCss.light), ...Object.keys(target.themeCss.dark)])
      for (const token of tokens) {
        lines.push(`| \`${token}\` | ${target.themeCss.light[token] || '-'} | ${target.themeCss.dark[token] || '-'} |`)
      }
      lines.push('')
    }
  }
  const text = lines.join('\n')
  if (outFile) fs.writeFileSync(path.resolve(repoRoot, outFile), text)
  else console.log(text)
}
