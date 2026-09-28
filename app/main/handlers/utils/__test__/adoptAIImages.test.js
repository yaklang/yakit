// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
const assert = require('node:assert/strict')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { adoptAIImages, discardAIImageDraft } = require('../adoptAIImages')

let root
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-images-'))
})
afterEach(async () => {
  vi.restoreAllMocks()
  await fs.rm(root, { recursive: true, force: true })
})

test('adopts draft images without changing bytes and returns exact path mapping', async () => {
  const draft = path.join(root, 'aiChatDataStore', 'draft')
  await fs.mkdir(draft, { recursive: true })
  await fs.writeFile(path.join(draft, 'image.png'), Buffer.from([0, 1, 2, 255]))
  const mapping = await adoptAIImages(root, {
    draftId: 'draft',
    sessionId: 'ai-session-1',
    chatDataStoreKey: 'aiChatDataStore',
  })
  const next = path.join(root, 'aiChatDataStore', 'ai-session-1', 'image.png')
  assert.deepEqual(mapping, { [path.join(draft, 'image.png')]: next })
  assert.deepEqual(await fs.readFile(next), Buffer.from([0, 1, 2, 255]))
  assert.ok((await fs.stat(draft)).isDirectory())
  await discardAIImageDraft(root, { draftId: 'draft', chatDataStoreKey: 'aiChatDataStore' })
  await assert.rejects(fs.stat(draft), { code: 'ENOENT' })
})

test('rejects traversal and does not overwrite an existing session directory', async () => {
  await assert.rejects(
    adoptAIImages(root, { draftId: '../escape', sessionId: 's', chatDataStoreKey: 'aiChatDataStore' }),
  )
  await fs.mkdir(path.join(root, 'ai', 'draft'), { recursive: true })
  await fs.mkdir(path.join(root, 'ai', 's'))
  await fs.writeFile(path.join(root, 'ai', 's', 'keep'), 'keep')
  await assert.rejects(adoptAIImages(root, { draftId: 'draft', sessionId: 's', chatDataStoreKey: 'ai' }), {
    code: 'EEXIST',
  })
  assert.equal(await fs.readFile(path.join(root, 'ai', 's', 'keep'), 'utf8'), 'keep')
})

test('missing drafts and repeated discards are harmless', async () => {
  await expect(adoptAIImages(root, { draftId: 'missing', sessionId: 's', chatDataStoreKey: 'ai' })).resolves.toEqual({})
  await discardAIImageDraft(root, { draftId: 'missing', chatDataStoreKey: 'ai' })
  await discardAIImageDraft(root, { draftId: 'missing', chatDataStoreKey: 'ai' })
  await expect(fs.stat(path.join(root, 'ai', 's'))).rejects.toMatchObject({ code: 'ENOENT' })
})

test.each(['draftId', 'sessionId', 'chatDataStoreKey'])('rejects unsafe %s before touching files', async (key) => {
  await expect(
    adoptAIImages(root, {
      draftId: 'draft',
      sessionId: 's',
      chatDataStoreKey: 'ai',
      [key]: '../escape',
    }),
  ).rejects.toThrow('invalid AI image directory')
  expect(await fs.readdir(root)).toEqual([])
})

test.each(['draftId', 'chatDataStoreKey'])('discard validates %s', async (key) => {
  await expect(
    discardAIImageDraft(root, {
      draftId: 'draft',
      chatDataStoreKey: 'ai',
      [key]: '../escape',
    }),
  ).rejects.toThrow('invalid AI image directory')
})

test.each(['directory', 'symlink', 'draft-symlink'])('rejects %s without creating a target', async (kind) => {
  const draft = path.join(root, 'ai', 'draft')
  await fs.mkdir(draft, { recursive: true })
  if (kind === 'draft-symlink') {
    await fs.rename(draft, path.join(root, 'original'))
    await fs.symlink(path.join(root, 'original'), draft)
  } else if (kind === 'directory') {
    await fs.mkdir(path.join(draft, 'nested'))
  } else {
    await fs.writeFile(path.join(root, 'outside.png'), 'outside')
    await fs.symlink(path.join(root, 'outside.png'), path.join(draft, 'image.png'))
  }
  await expect(adoptAIImages(root, { draftId: 'draft', sessionId: 's', chatDataStoreKey: 'ai' })).rejects.toThrow(
    /invalid AI image draft/,
  )
  await expect(fs.stat(path.join(root, 'ai', 's'))).rejects.toMatchObject({ code: 'ENOENT' })
})

test('rolls back partially copied images but preserves the draft for retry', async () => {
  const draft = path.join(root, 'ai', 'draft')
  await fs.mkdir(draft, { recursive: true })
  await fs.writeFile(path.join(draft, 'one.png'), 'one')
  await fs.writeFile(path.join(draft, 'two.png'), 'two')
  const copyFile = fs.copyFile.bind(fs)
  vi.spyOn(fs, 'copyFile').mockImplementationOnce(copyFile).mockRejectedValueOnce(new Error('disk full'))
  await expect(adoptAIImages(root, { draftId: 'draft', sessionId: 's', chatDataStoreKey: 'ai' })).rejects.toThrow(
    'disk full',
  )
  await expect(fs.stat(path.join(root, 'ai', 's'))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await fs.readFile(path.join(draft, 'one.png'), 'utf8')).toBe('one')
  expect(await fs.readFile(path.join(draft, 'two.png'), 'utf8')).toBe('two')
  await expect(
    adoptAIImages(root, { draftId: 'draft', sessionId: 's', chatDataStoreKey: 'ai' }),
  ).resolves.toHaveProperty(path.join(draft, 'one.png'))
})
