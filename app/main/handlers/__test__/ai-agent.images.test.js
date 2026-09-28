// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { beforeEach, expect, it, vi } from 'vitest'

const filename = new URL('../ai-agent.js', import.meta.url)
const source = readFileSync(filename, 'utf8')
const require = createRequire(filename)
let handlers
let streams
let adopt
let discard
let event

beforeEach(() => {
  handlers = new Map()
  streams = []
  adopt = vi.fn().mockResolvedValue({ '/draft/image.png': '/session/image.png' })
  discard = vi.fn().mockResolvedValue(undefined)
  event = { sender: { send: vi.fn() } }
  const dependencies = {
    electron: { ipcMain: { handle: (name, callback) => handlers.set(name, callback) } },
    './handleStreamWithContext': { cancelHandler: () => vi.fn() },
    '../filePath': { getAiImageTemp: () => '/test-images' },
    './utils/adoptAIImages': { adoptAIImages: adopt, discardAIImageDraft: discard },
    fs: {
      existsSync: () => true,
      createWriteStream: () => {
        const stream = new EventEmitter()
        // 用背压暂停真实 handler 的写入，测试明确控制 finish/error 时机。
        stream.write = vi.fn(() => false)
        stream.end = vi.fn()
        streams.push(stream)
        return stream
      },
    },
  }
  // handler 使用 CommonJS require，注入 Electron 与文件边界，执行完整注册函数。
  const module = { exports: {} }
  new Function('require', 'module', source)((id) => dependencies[id] ?? require(id), module)
  module.exports({}, vi.fn())
})

const save = (draft = 'draft', filename = 'image.png') =>
  handlers.get('save-ai-image')(
    event,
    {
      sessionID: draft,
      chatDataStoreKey: 'ai',
      filename,
      buffer: Buffer.from('image'),
    },
    filename,
  )
const params = { draftId: 'draft', sessionId: 'session', chatDataStoreKey: 'ai' }
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

it('adoption waits for every image in the draft but not another draft', async () => {
  const first = save('draft', 'one.png')
  const second = save('draft', 'two.png')
  const other = save('other')
  const adoption = handlers.get('adopt-ai-images')(event, params)
  await flush()
  expect(adopt).not.toHaveBeenCalled()
  streams[0].emit('finish')
  await first
  expect(adopt).not.toHaveBeenCalled()
  streams[1].emit('finish')
  await second
  await expect(adoption).resolves.toEqual({ '/draft/image.png': '/session/image.png' })
  expect(adopt).toHaveBeenCalledExactlyOnceWith('/test-images', params)
  expect(event.sender.send).toHaveBeenCalledWith('save-ai-image-finish-one.png', '/test-images/ai/draft/one.png')
  streams[2].emit('finish')
  await other
})

it('discard waits for unfinished writes before removing the draft', async () => {
  const writing = save()
  const discarding = handlers.get('discard-ai-image-draft')(event, params)
  await flush()
  expect(discard).not.toHaveBeenCalled()
  streams[0].emit('finish')
  await writing
  await discarding
  expect(discard).toHaveBeenCalledExactlyOnceWith('/test-images', params)
})

it('write failure rejects adoption but still allows cleanup', async () => {
  const error = new Error('disk full')
  const writing = expect(save()).rejects.toThrow('disk full')
  const adoption = expect(handlers.get('adopt-ai-images')(event, params)).rejects.toThrow('disk full')
  const discarding = handlers.get('discard-ai-image-draft')(event, params)
  streams[0].emit('error', error)
  await Promise.all([writing, adoption, discarding])
  expect(adopt).not.toHaveBeenCalled()
  expect(discard).toHaveBeenCalledExactlyOnceWith('/test-images', params)
  expect(event.sender.send).toHaveBeenCalledWith('save-ai-image-err-image.png', error)

  // 已失败的写入需从等待集合移除，后续重试不能被旧的 rejected Promise 阻挡。
  const retry = save()
  streams[1].emit('finish')
  await retry
  await handlers.get('adopt-ai-images')(event, params)
  expect(adopt).toHaveBeenCalledTimes(1)
})
