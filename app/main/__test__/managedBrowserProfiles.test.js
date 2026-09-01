import { EventEmitter } from 'events'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ManagedBrowserProfileManager,
  normalizeManagedProfileTarget,
  validateManagedExtensionPath,
} from '../handlers/managedBrowserProfiles'

const temporaryDirectories = []

function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-managed-profile-'))
  temporaryDirectories.push(directory)
  return directory
}

function fixture() {
  const rootDir = temporaryDirectory()
  const extensionPath = path.join(rootDir, 'extension')
  const chromePath = path.join(rootDir, process.platform === 'win32' ? 'chrome.exe' : 'chromium')
  fs.mkdirSync(extensionPath, { recursive: true })
  fs.writeFileSync(
    path.join(extensionPath, 'manifest.json'),
    JSON.stringify({
      manifest_version: 3,
      name: 'Yakit Browser Agent',
      permissions: ['tabs', 'cookies', 'storage'],
    }),
  )
  fs.writeFileSync(chromePath, '')
  return { rootDir, extensionPath, chromePath }
}

function processHarness() {
  const calls = []
  const live = new Set()
  let nextPid = 4100
  return {
    calls,
    live,
    spawnProcess(executable, args) {
      const child = new EventEmitter()
      child.pid = nextPid++
      child.unref = () => undefined
      calls.push({ executable, args, child })
      live.add(child.pid)
      queueMicrotask(() => child.emit('spawn'))
      return child
    },
    processAlive(pid) {
      return live.has(pid)
    },
    async stopTree(pid) {
      live.delete(pid)
    },
  }
}

function uuidSequence() {
  const values = [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000004',
  ]
  return () => values.shift()
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

describe('managed Chromium profile lifecycle', () => {
  it('creates isolated directories and launches the selected extension and target', async () => {
    const { rootDir, extensionPath, chromePath } = fixture()
    const harness = processHarness()
    const manager = new ManagedBrowserProfileManager({
      rootDir,
      randomUUID: uuidSequence(),
      now: () => 1_000,
      chromePathResolver: () => chromePath,
      ...harness,
    })

    const profile = manager.create({
      slotHint: 'left',
      name: '身份 A',
      extensionPath,
      startingUrl: 'https://example.test/account/42',
    })
    const launched = await manager.launch(profile.id)
    const bound = manager.bind(profile.id, '00000000-0000-4000-8000-00000000aa01')

    expect(launched.status).toBe('running')
    expect(bound.installationId).toBe('00000000-0000-4000-8000-00000000aa01')
    expect(launched.userDataDir).toContain(profile.id)
    expect(harness.calls).toHaveLength(1)
    expect(harness.calls[0].executable).toBe(fs.realpathSync(chromePath))
    expect(harness.calls[0].args).toEqual(
      expect.arrayContaining([
        `--user-data-dir=${launched.userDataDir}`,
        `--load-extension=${fs.realpathSync(extensionPath)}`,
        'chrome://extensions/',
        'https://example.test/account/42',
      ]),
    )

    await manager.stop(profile.id)
    expect(manager.list()[0].status).toBe('stopped')
    expect(manager.remove(profile.id)).toEqual({ removed: true, id: profile.id })
    expect(fs.existsSync(launched.userDataDir)).toBe(false)
  })

  it('does not kill or delete a browser owned by a previous Yakit session', async () => {
    const { rootDir, extensionPath, chromePath } = fixture()
    const harness = processHarness()
    const first = new ManagedBrowserProfileManager({
      rootDir,
      randomUUID: uuidSequence(),
      chromePathResolver: () => chromePath,
      ...harness,
    })
    const profile = first.create({
      slotHint: 'right',
      name: '身份 B',
      extensionPath,
      startingUrl: 'https://example.test/',
    })
    await first.launch(profile.id)

    const second = new ManagedBrowserProfileManager({
      rootDir,
      randomUUID: uuidSequence(),
      chromePathResolver: () => chromePath,
      ...harness,
    })
    expect(second.list()[0].status).toBe('detached')
    await expect(second.stop(profile.id)).rejects.toThrow('不属于当前 Yakit 会话')
    expect(() => second.remove(profile.id)).toThrow('请先关闭')
  })

  it('rejects credentials in target URLs and unrelated extension directories', () => {
    const { rootDir } = fixture()
    expect(() => normalizeManagedProfileTarget('https://admin:secret@example.test/')).toThrow('不能包含账号或密码')
    expect(() => validateManagedExtensionPath(fs, rootDir)).toThrow('缺少 manifest.json')
  })

  it.runIf(process.platform !== 'win32')('refuses to remove a managed directory replaced by a symlink', () => {
    const { rootDir, extensionPath, chromePath } = fixture()
    const manager = new ManagedBrowserProfileManager({
      rootDir,
      randomUUID: uuidSequence(),
      chromePathResolver: () => chromePath,
    })
    const profile = manager.create({
      slotHint: 'left',
      name: '身份 A',
      extensionPath,
      startingUrl: 'https://example.test/',
    })
    const outside = path.join(rootDir, 'outside')
    fs.mkdirSync(outside)
    fs.writeFileSync(path.join(outside, 'keep.txt'), 'keep')
    fs.rmSync(profile.userDataDir, { recursive: true })
    fs.symlinkSync(outside, profile.userDataDir, 'dir')

    expect(() => manager.remove(profile.id)).toThrow('不是受管实体目录')
    expect(fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8')).toBe('keep')
  })
})
