const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { restoreBuiltinEngine } = require('../engineRestore')

describe('bundled engine recovery', () => {
  let root
  let target
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-restore-test-'))
    target = path.join(root, 'yak')
    await fs.writeFile(target, 'previous-engine')
  })
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  const archive = (broken = false) => ({
    extract: async (entry, destination) => {
      if (broken) throw new Error('extract failed')
      await fs.writeFile(destination, 'bundled-engine')
    },
    close: vi.fn(),
  })
  const entryArchive = (entries) => ({
    extract: async (entry, destination) => {
      if (!entries.includes(entry)) throw new Error(`missing ${entry}`)
      await fs.writeFile(destination, 'bundled-engine')
    },
    close: vi.fn(),
  })
  const silentArchive = (entries) => ({
    extract: async (entry, destination) => {
      if (entries.includes(entry)) await fs.writeFile(destination, 'bundled-engine')
    },
    close: vi.fn(),
  })
  it('keeps the installed engine when extraction fails', async () => {
    const writeConfig = vi.fn()
    await expect(
      restoreBuiltinEngine({ target, entry: 'yak', openArchive: () => archive(true), writeConfig }),
    ).rejects.toThrow('extract failed')
    expect(await fs.readFile(target, 'utf8')).toBe('previous-engine')
    expect(writeConfig).not.toHaveBeenCalled()
    expect(await fs.readdir(root)).toEqual(['yak'])
  })
  it('restores the previous executable and reports failure when configuration cannot be written', async () => {
    await expect(
      restoreBuiltinEngine({
        target,
        entry: 'yak',
        openArchive: () => archive(),
        writeConfig: () => {
          throw new Error('config denied')
        },
      }),
    ).rejects.toThrow('config denied')
    expect(await fs.readFile(target, 'utf8')).toBe('previous-engine')
    expect(await fs.readdir(root)).toEqual(['yak'])
  })
  it('commits a successful replacement without touching unrelated files', async () => {
    await fs.writeFile(path.join(root, 'profile.db'), 'untouched')
    await restoreBuiltinEngine({ target, entry: 'yak', openArchive: () => archive(), writeConfig: vi.fn() })
    expect(await fs.readFile(target, 'utf8')).toBe('bundled-engine')
    expect(await fs.readFile(path.join(root, 'profile.db'), 'utf8')).toBe('untouched')
  })
  it('finds the engine when the archive stores it at the root', async () => {
    await restoreBuiltinEngine({
      target,
      entry: 'bins/yak',
      openArchive: () => entryArchive(['yak']),
      writeConfig: vi.fn(),
    })
    expect(await fs.readFile(target, 'utf8')).toBe('bundled-engine')
  })
  it('falls back when a missing entry resolves without writing a file', async () => {
    await restoreBuiltinEngine({
      target,
      entry: 'bins/yak',
      openArchive: () => silentArchive(['yak']),
      writeConfig: vi.fn(),
    })
    expect(await fs.readFile(target, 'utf8')).toBe('bundled-engine')
  })
  it('keeps the previous engine when neither archive layout contains the entry', async () => {
    await expect(
      restoreBuiltinEngine({
        target,
        entry: 'bins/yak',
        openArchive: () => entryArchive([]),
        writeConfig: vi.fn(),
      }),
    ).rejects.toThrow('missing yak')
    expect(await fs.readFile(target, 'utf8')).toBe('previous-engine')
    expect(await fs.readdir(root)).toEqual(['yak'])
  })
})
