// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { dependencyIssues } = createRequire(import.meta.url)('../../../scripts/check-deps.js')
const fixtures = []
const writeJSON = (file, data) => {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(data))
}
const fixture = (dependencies) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yakit-check-deps-'))
  fixtures.push(root)
  writeJSON(path.join(root, 'package.json'), { dependencies })
  mkdirSync(path.join(root, 'node_modules'))
  return root
}
afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('dependency installation checks', () => {
  it('detects a missing declared package even when node_modules exists', () => {
    const root = fixture({ '@yakit-libs/color': '1.4.1' })
    expect(dependencyIssues(root)).toEqual(['@yakit-libs/color（未安装）'])
  })
  it('detects a stale fixed version after the manifest update is already committed', () => {
    const root = fixture({ '@yakit-libs/yakit-ui-icons': '0.2.9' })
    writeJSON(path.join(root, 'node_modules/@yakit-libs/yakit-ui-icons/package.json'), { version: '0.2.7' })
    expect(dependencyIssues(root)).toEqual(['@yakit-libs/yakit-ui-icons（需要 0.2.9，已安装 0.2.7）'])
  })
  it('accepts hoisted packages with restricted exports and checks browser polyfills', () => {
    const root = fixture({ '@yakit-libs/color': '1.4.1', buffer: '6.0.3' })
    writeJSON(path.join(root, 'node_modules/@yakit-libs/color/package.json'), {
      version: '1.4.1',
      exports: { './node': './dist/node.js' },
    })
    const child = path.join(root, 'renderer')
    writeJSON(path.join(child, 'package.json'), { dependencies: { '@yakit-libs/color': '1.4.1' } })
    expect(dependencyIssues(child)).toEqual([])
    expect(dependencyIssues(root)).toEqual(['buffer（未安装）'])
    writeJSON(path.join(root, 'node_modules/buffer/package.json'), { version: '6.0.3' })
    expect(dependencyIssues(root)).toEqual([])
  })
  it('detects an Electron package whose executable was never installed', () => {
    const root = fixture({ electron: '27.0.0' })
    const electronDir = path.join(root, 'node_modules/electron')
    writeJSON(path.join(electronDir, 'package.json'), { version: '27.0.0' })
    expect(dependencyIssues(root)).toEqual([
      'electron（运行文件缺失，请在该项目目录执行 node node_modules/electron/install.js）',
    ])
    writeFileSync(path.join(electronDir, 'path.txt'), 'electron')
    mkdirSync(path.join(electronDir, 'dist'))
    writeFileSync(path.join(electronDir, 'dist/electron'), '')
    expect(dependencyIssues(root)).toEqual([])
  })
})
