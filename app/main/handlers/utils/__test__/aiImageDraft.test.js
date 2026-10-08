// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
const assert = require('node:assert/strict')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { discardAIImageDraft } = require('../aiImageDraft')

let root
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-images-'))
})
afterEach(async () => {
  vi.restoreAllMocks()
  await fs.rm(root, { recursive: true, force: true })
})

test('removes only the unfinished session directory and tolerates repeated cleanup', async () => {
  const pending = path.join(root, 'ai', 'pending')
  const existing = path.join(root, 'ai', 'existing')
  await fs.mkdir(pending, { recursive: true })
  await fs.mkdir(existing)
  await fs.writeFile(path.join(pending, 'image.png'), 'pending')
  await fs.writeFile(path.join(existing, 'image.png'), 'keep')
  const params = { draftId: 'pending', chatDataStoreKey: 'ai' }
  await discardAIImageDraft(root, params)
  await discardAIImageDraft(root, params)
  await assert.rejects(fs.stat(pending), { code: 'ENOENT' })
  assert.equal(await fs.readFile(path.join(existing, 'image.png'), 'utf8'), 'keep')
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
