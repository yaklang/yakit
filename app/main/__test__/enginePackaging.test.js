// @vitest-environment node
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  resolveEngineMode,
  engineArchiveFor,
  engineSha256For,
  assertEngineArchive,
} = require('../../../packageScript/buildHook/enginePackaging')

const roots = []

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('built-in engine packaging', () => {
  it('normalizes on/off and rejects invalid modes', () => {
    expect(resolveEngineMode('')).toBe('off')
    expect(resolveEngineMode('on')).toBe('on')
    expect(resolveEngineMode('OFF')).toBe('off')
    expect(() => resolveEngineMode('yes')).toThrow('YAKIT_BUILTIN_ENGINE must be on or off')
  })

  it('selects the archive for each platform and arch', () => {
    expect(engineArchiveFor('win32', 'x64')).toBe('bins/yak_windows_amd64.zip')
    expect(engineArchiveFor('linux', 'x64')).toBe('bins/yak_linux_amd64.zip')
    expect(engineArchiveFor('linux', 'arm64')).toBe('bins/yak_linux_arm64.zip')
    expect(engineArchiveFor('darwin', 'x64')).toBe('bins/yak_darwin_amd64.zip')
    expect(engineArchiveFor('darwin', 'arm64')).toBe('bins/yak_darwin_arm64.zip')
  })

  it('derives the macOS sha256 sidecar path from the engine archive', () => {
    expect(engineSha256For('bins/yak_darwin_amd64.zip')).toBe('bins/yak_darwin_amd64.sha256.txt')
    expect(engineSha256For('')).toBe('')
  })

  it('only requires the archive when the built-in engine is enabled', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-engine-packaging-'))
    roots.push(root)
    const archive = 'bins/yak.zip'

    expect(() => assertEngineArchive(archive, { withBuiltinEngine: false, cwd: root })).not.toThrow()
    expect(() => assertEngineArchive(archive, { withBuiltinEngine: true, cwd: root })).toThrow(
      'YAKIT_BUILTIN_ENGINE=on but bins/yak.zip is missing',
    )
    expect(() => assertEngineArchive(engineSha256For(archive), { withBuiltinEngine: true, cwd: root })).toThrow(
      'YAKIT_BUILTIN_ENGINE=on but bins/yak.sha256.txt is missing',
    )

    fs.mkdirSync(path.join(root, 'bins'))
    fs.writeFileSync(path.join(root, archive), 'engine')
    expect(() => assertEngineArchive(archive, { withBuiltinEngine: true, cwd: root })).not.toThrow()
  })
})
