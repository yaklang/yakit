import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { installYakEngineFile, normalizeYakEngineVersion, resolveYakEnginePaths } from '../yakEngineInstaller'

const tempDirs = []

const createTempDir = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisenso-engine-installer-'))
  tempDirs.push(tempDir)
  return tempDir
}

afterEach(() => {
  tempDirs.splice(0).forEach((tempDir) => fs.rmSync(tempDir, { recursive: true, force: true }))
})

describe('yak engine installer', () => {
  it('accepts release and development version identifiers', () => {
    expect(normalizeYakEngineVersion(' 1.3.0-beta.1 ')).toBe('1.3.0-beta.1')
    expect(normalizeYakEngineVersion('dev/2026-09-04')).toBe('dev/2026-09-04')
  })

  it.each(['', '../../tmp/pwned', 'dev/nested/value', '9.9.9$(touch /tmp/pwned)', '1.0.0;calc', '1.0.0"'])(
    'rejects a command or path payload in the version: %s',
    (version) => {
      expect(() => normalizeYakEngineVersion(version)).toThrow(/invalid yak engine version/)
    },
  )

  it('keeps the source and destination inside the managed engine directory', () => {
    const engineDir = createTempDir()
    const outsideDestination = path.join(path.dirname(engineDir), 'outside-yak')
    expect(() => resolveYakEnginePaths({ version: '1.0.0', engineDir, destination: outsideDestination })).toThrow(
      /escapes the managed engine directory/,
    )
  })

  it('copies the downloaded engine without invoking a command shell', async () => {
    const engineDir = createTempDir()
    const sourcePath = path.join(engineDir, 'yak-1.0.0')
    const destinationPath = path.join(engineDir, process.platform === 'win32' ? 'yak.exe' : 'yak')
    fs.writeFileSync(sourcePath, 'engine-binary')

    await installYakEngineFile({
      version: '1.0.0',
      engineDir,
      destination: destinationPath,
      platform: process.platform,
    })

    expect(fs.readFileSync(destinationPath, 'utf8')).toBe('engine-binary')
  })
})
