#!/usr/bin/env node
/**
 * CI：根据 PR 变更选择 Vitest 目标。
 *
 * 仓库内三个子项目（与根目录 vitest.config.ts 的 alias / include 一致）：
 * 1) app/main — Electron 主进程
 * 2) app/renderer/src/main — renderer 主包；业务根 app/renderer/src/main/src
 * 3) app/renderer/engine-link-startup — 业务根 …/src
 *
 * 单测约定：与业务文件同目录下建 **__test__/** 目录，内放同名 `*.test.*` / `*.spec.*`（如 `Foo.tsx` → `__test__/Foo.test.tsx`）。
 *
 * 规则摘要：
 * 1) 变更文件本身是 *.test.* / *.spec.* → 加入
 * 2) 业务源码变更 → 同目录 `__test__/<stem>.(test|spec).(ts|tsx|js|jsx)` 存在则加入
 * 3) 扫描各包 src 下路径含 `__test__/` 的用例：别名 / 相对路径引用命中变更模块 → 加入
 *
 * 调试：CI_DEBUG_VITEST_SELECT=1（或 true/yes）打印 [子项目 id] 命中原因。
 */
const fs = require('fs')
const path = require('path')

const SRC_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const TEST_SUFFIXES = [
  'test.ts',
  'test.tsx',
  'test.js',
  'test.jsx',
  'spec.ts',
  'spec.tsx',
  'spec.js',
  'spec.jsx'
]
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'build', '.git', 'coverage'])

function isVitestSelectDebug() {
  const v = (process.env.CI_DEBUG_VITEST_SELECT || '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** 顺序：主进程 → renderer 主包 → engine-link */
const PACKAGES = [
  {
    id: 'app-main',
    label: 'app/main',
    src: 'app/main',
    importPrefixes: []
  },
  {
    id: 'renderer-main',
    label: 'app/renderer/src/main',
    src: 'app/renderer/src/main/src',
    importPrefixes: ['@/', '@renderer/']
  },
  {
    id: 'engine-link',
    label: 'app/renderer/engine-link-startup',
    src: 'app/renderer/engine-link-startup/src',
    importPrefixes: ['@engine/', '@engne/']
  }
]

function packageIdForRepoPath(repoRelPosix) {
  const p = toPosix(repoRelPosix)
  for (const pkg of PACKAGES) {
    const src = toPosix(pkg.src)
    if (p === src || p.startsWith(src + '/')) return pkg.id
  }
  return 'other'
}

function sourceExtOfInner(inner) {
  if (inner.endsWith('.d.ts')) return '.d.ts'
  for (const e of ['.tsx', '.ts', '.jsx', '.js']) {
    if (inner.endsWith(e)) return e
  }
  return ''
}

function toPosix(p) {
  return p.split(path.sep).join('/')
}

function readChangedList() {
  const fromFile = (process.env.CHANGED_FILES_PATH || '').trim()
  if (fromFile) {
    if (!fs.existsSync(fromFile)) {
      console.error(`CHANGED_FILES_PATH 指向的文件不存在: ${fromFile}`)
      process.exit(1)
    }
    return fs
      .readFileSync(fromFile, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
  }
  const base = process.env.BASE_SHA
  const head = process.env.HEAD_SHA
  if (base && head) {
    const { execSync } = require('child_process')
    try {
      const out = execSync(`git -c core.quotePath=false diff --name-only "${base}" "${head}"`, {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024
      })
      return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    } catch {
      return []
    }
  }
  const { execSync } = require('child_process')
  try {
    const out = execSync('git diff --name-only HEAD^ HEAD', { encoding: 'utf8' })
    return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  } catch {
    return []
  }
}

function isTestPath(rel) {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(rel)
}

function relNoExtFromSrcPrefix(rel, srcPrefix) {
  const posix = toPosix(rel)
  const pref = toPosix(srcPrefix)
  if (!posix.startsWith(pref + '/') || posix.startsWith(pref + '/__tests__/')) return null
  if (isTestPath(posix)) return null
  const inner = posix.slice(pref.length + 1)
  if (inner.startsWith('__tests__/') || inner.startsWith('__test__/')) return null
  const ext = sourceExtOfInner(inner)
  if (!ext) return null
  if (ext === '.d.ts' || SRC_EXTS.has(ext)) return inner.slice(0, -ext.length)
  return null
}

/** 递归收集某包 src 下、路径含 __test__/ 的用例文件 */
function walkPackageTestFiles(srcRoot, acc) {
  const abs = path.join(process.cwd(), srcRoot)
  if (!fs.existsSync(abs)) return
  const stack = [abs]
  while (stack.length) {
    const cur = stack.pop()
    let ents
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of ents) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue
      const p = path.join(cur, ent.name)
      if (ent.isDirectory()) stack.push(p)
      else if (isTestPath(ent.name)) {
        const rel = toPosix(path.relative(process.cwd(), p))
        if (rel.includes('/__test__/')) acc.push(rel)
      }
    }
  }
}

function expandRelKeys(relNoExt) {
  const keys = new Set([relNoExt])
  if (relNoExt.endsWith('/index')) keys.add(relNoExt.slice(0, -'/index'.length))
  return [...keys]
}

function mentionsImport(content, relNoExt, importPrefixes) {
  for (const ap of importPrefixes) {
    const needle = ap + relNoExt
    let idx = content.indexOf(needle)
    while (idx !== -1) {
      const after = content[idx + needle.length]
      if (after === undefined || /['"`./,;)\]\s\n\r]/.test(after)) return true
      idx = content.indexOf(needle, idx + 1)
    }
  }
  return false
}

function extractRelativeImportLiterals(content) {
  const out = new Set()
  const patterns = [
    /\bfrom\s+['"](\.\.?\/[^'"]+)['"]/g,
    /\bimport\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g,
    /\bvi\.mock\s*\(\s*['"](\.\.?\/[^'"]+)['"]/g,
    /\bjest\.mock\s*\(\s*['"](\.\.?\/[^'"]+)['"]/g,
    /(?:^|[;\n{])\s*import\s+['"](\.\.?\/[^'"]+)['"]/gm
  ]
  for (const re of patterns) {
    let m
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
    while ((m = r.exec(content))) out.add(m[1])
  }
  return [...out]
}

function stripKnownExtension(fullPosix) {
  const n = path.posix.normalize(fullPosix)
  if (n.endsWith('.d.ts')) return n.slice(0, -'.d.ts'.length)
  for (const e of ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs']) {
    if (n.endsWith(e)) return n.slice(0, -e.length)
  }
  return n
}

function pathMatchKeys(fullPosix) {
  const k = new Set()
  const n = path.posix.normalize(toPosix(fullPosix))
  k.add(n)
  k.add(stripKnownExtension(n))
  const stripped = stripKnownExtension(n)
  if (stripped.endsWith('/index')) k.add(stripped.slice(0, -'/index'.length))
  return k
}

function pathsMatch(changedPosix, resolvedImportPosix) {
  const A = pathMatchKeys(changedPosix)
  const B = pathMatchKeys(resolvedImportPosix)
  for (const a of A) {
    if (B.has(a)) return true
  }
  return false
}

function collectChangedUnderSrc(srcPrefix, changedList) {
  const pref = toPosix(srcPrefix)
  const out = []
  for (const rel of changedList) {
    const posix = toPosix(rel)
    if (!posix.startsWith(pref + '/')) continue
    if (posix.startsWith(pref + '/__tests__/')) continue
    if (isTestPath(posix)) continue
    const inner = posix.slice(pref.length + 1)
    const ext = sourceExtOfInner(inner)
    if (!ext) continue
    if (ext === '.d.ts' || SRC_EXTS.has(ext)) out.push(posix)
  }
  return out
}

/**
 * @returns {null | { kind: 'alias' | 'relative'; detail: string }}
 */
function testReferencesChangedFile(content, testFilePosix, changedPosix, pkg) {
  const r = relNoExtFromSrcPrefix(changedPosix, pkg.src)
  if (r && pkg.importPrefixes.length) {
    for (const key of expandRelKeys(r)) {
      if (mentionsImport(content, key, pkg.importPrefixes)) {
        return { kind: 'alias', detail: key }
      }
    }
  }

  const pref = toPosix(pkg.src)
  const testDir = path.posix.dirname(testFilePosix)
  for (const lit of extractRelativeImportLiterals(content)) {
    if (!lit.startsWith('./') && !lit.startsWith('../')) continue
    const resolved = path.posix.normalize(path.posix.join(testDir, lit))
    if (!resolved.startsWith(pref + '/') && resolved !== pref) continue
    if (pathsMatch(changedPosix, resolved)) return { kind: 'relative', detail: lit }
  }
  return null
}

/** 业务文件旁 __test__/<stem>.test.*（与业务文件同目录） */
function addColocated__test__Matches(rel, results, debugLines) {
  const posix = toPosix(rel)
  if (isTestPath(posix)) return
  if (posix.includes('/__test__/')) return

  for (const pkg of PACKAGES) {
    const src = toPosix(pkg.src)
    if (!posix.startsWith(src + '/')) continue
    if (posix.startsWith(src + '/__tests__/')) continue
    if (posix.endsWith('.d.ts')) continue
    const inner = posix.slice(src.length + 1)
    const base = path.posix.basename(inner)
    const ext = sourceExtOfInner(base)
    if (!ext || !SRC_EXTS.has(ext)) continue
    const stem = path.posix.basename(inner, ext)
    const dir = path.posix.dirname(posix)
    const testDir = `${dir}/__test__`
    for (const suf of TEST_SUFFIXES) {
      const cand = `${testDir}/${stem}.${suf}`
      if (fs.existsSync(path.join(process.cwd(), cand))) {
        results.add(cand)
        if (debugLines) {
          debugLines.push(`[${pkg.id}] colocated-__test__: ${posix} -> ${cand}`)
        }
      }
    }
  }
}

function main() {
  const ghOut = process.env.GITHUB_OUTPUT
  if (!ghOut) {
    console.error('GITHUB_OUTPUT is required')
    process.exit(1)
  }

  if (process.env.WORKFLOW_INPUT_TESTS) {
    fs.appendFileSync(ghOut, `tests=${process.env.WORKFLOW_INPUT_TESTS}\n`)
    return
  }
  if (process.env.CI_VITEST_MANUAL_TESTS) {
    fs.appendFileSync(ghOut, `tests=${process.env.CI_VITEST_MANUAL_TESTS}\n`)
    return
  }

  const changed = readChangedList()
  const results = new Set()
  const DEBUG = isVitestSelectDebug()
  const debugLines = DEBUG ? [] : null

  if (DEBUG) {
    console.log('[ci-select-vitest-tests] CI_DEBUG_VITEST_SELECT 已开启，打印命中来源（子项目 id）')
  }

  for (const rel of changed) {
    if (!rel || rel.includes('..')) continue
    const posix = toPosix(rel)
    if (isTestPath(posix) && fs.existsSync(path.join(process.cwd(), posix))) {
      results.add(posix)
      if (debugLines) {
        const pid = packageIdForRepoPath(posix)
        debugLines.push(`[${pid}] changed-test-file: ${posix}`)
      }
    }
    addColocated__test__Matches(posix, results, debugLines)
  }

  for (const pkg of PACKAGES) {
    const changedInPkg = collectChangedUnderSrc(pkg.src, changed)
    if (changedInPkg.length === 0) continue

    const testFiles = []
    walkPackageTestFiles(pkg.src, testFiles)

    for (const tf of testFiles) {
      let content
      try {
        content = fs.readFileSync(path.join(process.cwd(), tf), 'utf8')
      } catch {
        continue
      }
      for (const ch of changedInPkg) {
        const hit = testReferencesChangedFile(content, tf, ch, pkg)
        if (hit) {
          results.add(tf)
          if (debugLines) {
            const detail =
              hit.kind === 'alias'
                ? `别名命中 key=${JSON.stringify(hit.detail)}`
                : `相对路径 ${JSON.stringify(hit.detail)}`
            debugLines.push(`[${pkg.id}] ${hit.kind}: ${detail} <- ${ch} -> ${tf}`)
          }
          break
        }
      }
    }
  }

  if (DEBUG && debugLines.length) {
    console.log('[ci-select-vitest-tests] 命中明细（共 ' + debugLines.length + ' 条）:')
    for (const line of debugLines) console.log('  ' + line)
  } else if (DEBUG) {
    console.log('[ci-select-vitest-tests] 无命中明细（可能 tests=none）')
  }

  if (results.size === 0) {
    console.log('No __test__ colocated, import-linked, or changed tests; skipping vitest')
    fs.appendFileSync(ghOut, 'tests=none\n')
    return
  }

  const sorted = [...results].sort()
  const tf = sorted.join(' ')
  console.log(`Matched vitest files: ${tf}`)
  fs.appendFileSync(ghOut, `tests=${tf}\n`)
}

main()
