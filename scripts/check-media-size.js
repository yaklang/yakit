#!/usr/bin/env node
/**
 * CI：检查 PR 变更中的图片/视频是否超过体积阈值。
 * 文件列表优先读 CHANGED_FILES_PATH（每行一个路径，与 git diff --name-only 一致，支持中文路径）；
 * 否则读 ALL_CHANGED_FILES（空格分隔，与 tj-actions/changed-files 一致）。
 */
const fs = require('fs')
const path = require('path')

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v', '.avi', '.mkv'])

const imageMax = Number(process.env.MEDIA_IMAGE_MAX_BYTES) > 0 ? Number(process.env.MEDIA_IMAGE_MAX_BYTES) : 500 * 1024
const videoMax =
  Number(process.env.MEDIA_VIDEO_MAX_BYTES) > 0 ? Number(process.env.MEDIA_VIDEO_MAX_BYTES) : 2 * 1024 * 1024

function human(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MiB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KiB`
  return `${n} B`
}

function listChangedFiles() {
  const fromFile = (process.env.CHANGED_FILES_PATH || '').trim()
  if (fromFile) {
    if (!fs.existsSync(fromFile)) {
      console.error(`CHANGED_FILES_PATH 指向的文件不存在: ${fromFile}`)
      process.exit(1)
    }
    try {
      const text = fs.readFileSync(fromFile, 'utf8')
      return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    } catch (e) {
      console.error(`无法读取 CHANGED_FILES_PATH: ${fromFile}`, e.message || e)
      process.exit(1)
    }
  }
  const raw = process.env.ALL_CHANGED_FILES || ''
  return raw.split(/\s+/).filter(Boolean)
}

const cwd = process.cwd()
const bad = []

for (const rel of listChangedFiles()) {
  if (!rel || rel.includes('..')) continue
  const ext = path.extname(rel).toLowerCase()
  const isImg = IMAGE_EXT.has(ext)
  const isVid = VIDEO_EXT.has(ext)
  if (!isImg && !isVid) continue
  const abs = path.resolve(cwd, rel)
  if (!abs.startsWith(cwd + path.sep) && abs !== cwd) continue
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue
  const size = fs.statSync(abs).size
  const max = isVid ? videoMax : imageMax
  if (size > max) {
    bad.push({ rel, size, max, kind: isVid ? 'video' : 'image' })
  }
}

if (bad.length) {
  console.error('Media file size check failed（变更中的图片/视频超过阈值）:')
  for (const b of bad) {
    console.error(`  - ${b.rel} (${human(b.size)} > 上限 ${human(b.max)}, ${b.kind})`)
  }
  console.error('')
  console.error('可通过环境变量调整阈值（字节）: MEDIA_IMAGE_MAX_BYTES, MEDIA_VIDEO_MAX_BYTES')
  process.exit(1)
}

console.log('Media size check OK（或无命中扩展名的变更文件）.')
