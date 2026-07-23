#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function flatten(obj, prefix = '') {
  const out = []
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      const np = prefix ? `${prefix}.${k}` : k
      out.push(...flatten(obj[k], np))
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...flatten(v, `${prefix}[${i}]`)))
  } else if (prefix) {
    out.push(prefix)
  }
  return out
}

const localesPath = 'src/locales'
const root = process.cwd()
const enDir = path.join(root, localesPath, 'en')
const targetLangs = ['zh', 'zh-TW']
const allLangs = ['en', ...targetLangs]

// 收集所有语言目录中的 JSON 文件集合
const langFilesMap = new Map()
for (const lang of allLangs) {
  const langDir = path.join(root, localesPath, lang)
  if (!fs.existsSync(langDir)) {
    console.error(`目录不存在: ${langDir}`)
    process.exit(1)
  }
  const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.json'))
  langFilesMap.set(lang, new Set(files))
}

// 找出所有语言中出现过的所有文件名的并集
const allFileNames = new Set()
for (const filesSet of langFilesMap.values()) {
  filesSet.forEach((f) => allFileNames.add(f))
}

// 收集缺失文件信息
const missingFiles = []

for (const f of allFileNames) {
  const missingLangs = []
  for (const lang of allLangs) {
    const filesSet = langFilesMap.get(lang)
    if (!filesSet.has(f)) {
      missingLangs.push(lang)
    }
  }
  if (missingLangs.length > 0) {
    missingFiles.push({ filename: f, missingLangs })
  }
}

if (missingFiles.length > 0) {
  console.error('Link Missing files:')
  for (const { filename, missingLangs } of missingFiles) {
    console.error(`  [${filename}] Missing in: ${missingLangs.join(', ')}`)
  }
  process.exit(1)
}

// 至此，所有语言的文件集合完全一致，继续检查 key 一致性
let hasDiff = false
const enFiles = Array.from(langFilesMap.get('en')).sort()

for (const f of enFiles) {
  const langData = {}
  let allKeysSet = new Set()

  // 读取英文
  const enPath = path.join(enDir, f)
  const enJSON = readJSON(enPath)
  const enKeys = Array.from(new Set(flatten(enJSON))).sort()
  langData['en'] = { keys: enKeys }
  enKeys.forEach((k) => allKeysSet.add(k))

  // 读取目标语言
  for (const lang of targetLangs) {
    const langDir = path.join(root, localesPath, lang)
    const langPath = path.join(langDir, f)
    const langJSON = readJSON(langPath)
    const langKeys = Array.from(new Set(flatten(langJSON))).sort()
    langData[lang] = { keys: langKeys }
    langKeys.forEach((k) => allKeysSet.add(k))
  }

  const allKeys = Array.from(allKeysSet).sort()
  const missingPerLang = []
  for (const lang of allLangs) {
    const keys = langData[lang].keys
    const missing = allKeys.filter((k) => !keys.includes(k))
    if (missing.length) {
      missingPerLang.push({ lang, missing })
    }
  }

  if (missingPerLang.length === 0) continue

  hasDiff = true
  console.log(`\n[${f}]`)
  for (const { lang, missing } of missingPerLang) {
    console.log(`  Missing in ${lang}:`)
    missing.forEach((k) => console.log(`   - ${k}`))
  }
}

if (!hasDiff) {
  console.log('Locale parity check passed: EN, zh, zh-TW keys are consistent across all files.')
} else {
  process.exitCode = 1
}
