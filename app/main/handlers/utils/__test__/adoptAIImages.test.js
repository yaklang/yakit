const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { adoptAIImages, discardAIImageDraft } = require('../adoptAIImages')

test('adopts draft images without changing bytes and returns exact path mapping', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-images-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
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

test('rejects traversal and does not overwrite an existing session directory', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-images-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
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
