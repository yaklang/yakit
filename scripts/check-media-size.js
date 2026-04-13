#!/usr/bin/env node
/**
 * CI：检查 PR 变更中的图片/视频是否超过体积阈值。
 * 文件列表来自环境变量 ALL_CHANGED_FILES（空格分隔，与 tj-actions/changed-files 一致）。
 */
const fs = require('fs')
const path = require('path')

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v', '.avi', '.mkv'])

const imageMax =
  Number(process.env.MEDIA_IMAGE_MAX_BYTES) > 0
    ? Number(process.env.MEDIA_IMAGE_MAX_BYTES)
    : 500 * 1024
const videoMax =
  Number(process.env.MEDIA_VIDEO_MAX_BYTES) > 0
    ? Number(process.env.MEDIA_VIDEO_MAX_BYTES)
    : 2 * 1024 * 1024

function human(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MiB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KiB`
  return `${n} B`
}

function listFromEnv() {
  const raw = process.env.ALL_CHANGED_FILES || ''
  return raw.split(/\s+/).filter(Boolean)
}

const cwd = process.cwd()
const bad = []

for (const rel of listFromEnv()) {
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
