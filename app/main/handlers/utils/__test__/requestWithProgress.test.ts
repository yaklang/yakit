import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const requestWithProgressPath = require.resolve('../requestWithProgress')
const trackerPath = require.resolve('../yakitDownloadTracker')

const runtimeTest = String.raw`
const Module = require('module')
const EventEmitter = require('events')
const originalLoad = Module._load
const writers = []
const responses = []
const errors = []

function response() {
  const data = new EventEmitter()
  const item = { status: 200, headers: { 'content-length': '10' }, data }
  data.pipe = (writer) => { item.writer = writer }
  responses.push(item)
  return item
}

// 对齐真实 fs.WriteStream.destroy(err)：emit 'error' 后 emit 'close'
function stubWriter() {
  const writer = new EventEmitter()
  writer.destroy = (error) => { writer.error = error; writer.emit('error', error); writer.emit('close') }
  writers.push(writer)
  return writer
}

let pendingAxiosResolve = null

Module._load = function (request, parent, isMain) {
  if (request === 'axios') {
    return {
      get: () => {
        if (pendingAxiosResolve) {
          return new Promise((resolve) => { pendingAxiosResolve(resolve) })
        }
        return Promise.resolve(responses.shift())
      },
    }
  }
  if (request === 'fs') return {
    createWriteStream: stubWriter,
    unlinkSync: () => {},
  }
  if (request === 'throttle-debounce') return { throttle: (_delay, callback) => callback }
  return originalLoad.call(this, request, parent, isMain)
}

const {
  requestWithProgress,
  yakitCancelRequestWithProgress,
  engineCancelRequestWithProgress,
  isDestBusy,
} = require(${JSON.stringify(requestWithProgressPath)})
const { createYakitDownloadTracker } = require(${JSON.stringify(trackerPath)})
const tick = () => new Promise((resolve) => setImmediate(resolve))

;(async () => {
  responses.push(response())
  requestWithProgress('https://example.test/a', 'a.yakit')
  await tick()
  try {
    await yakitCancelRequestWithProgress('a.yakit')
    throw new Error('cancel should reject')
  } catch (error) {
    if (error.message !== 'Write operation stoped') throw error
  }
  if (writers[0].error.message !== 'Write operation cancelled') throw new Error('cancelled wrong writer')

  responses.push(response(), response(), response())
  requestWithProgress('https://example.test/a', 'same.yakit', {}, undefined, undefined, (error) => errors.push(error))
  await tick()
  requestWithProgress('https://example.test/b', 'same.yakit', {}, undefined, undefined, (error) => errors.push(error))
  await tick()
  if (errors.at(-1).message !== 'Download already in progress for same.yakit') throw new Error('same destination was not rejected')
  writers.at(-1).emit('finish')
  await tick()
  requestWithProgress('https://example.test/c', 'same.yakit')
  await tick()
  if (writers.length !== 3) throw new Error('completed destination was not released')

  const tracker = createYakitDownloadTracker()
  const first = { sender: { id: 1 } }
  const second = { sender: { id: 2 } }
  const firstTask = tracker.start(first)
  const secondTask = tracker.start(second)
  if (tracker.start(first) !== undefined) throw new Error('same sender was not rejected')
  tracker.setDest(first, firstTask, 'first.yakit')
  tracker.setDest(second, secondTask, 'second.yakit')
  if (tracker.getDest(first) !== 'first.yakit' || tracker.getDest(second) !== 'second.yakit') throw new Error('sender destinations leaked')

  // 窗口期取消（dest 已知、writer 尚未建立）：cancel 须 reject 且暂存意图，
  // 响应到达后下载不得建 writer，onError 收到 cancelled
  const windowErrors = []
  pendingAxiosResolve = (resolve) => {
    const data = new EventEmitter()
    data.pipe = () => {}
    resolve({ status: 200, headers: { 'content-length': '10' }, data })
  }
  requestWithProgress('https://example.test/x', 'window.yakit', {}, undefined, undefined, (error) => windowErrors.push(error))
  await tick()
  const writersBefore = writers.length
  try {
    await yakitCancelRequestWithProgress('window.yakit')
    throw new Error('cancel before stream should reject')
  } catch (error) {
    if (error.message !== 'Write operation stoped') throw error
  }
  await tick()
  if (writers.length !== writersBefore) throw new Error('writer was created despite window cancel')
  if (windowErrors.at(-1).message !== 'Write operation cancelled') throw new Error('stream was not cancelled after window cancel')

  // tracker 窗口期取消标志：requestCancel 置位后 isCancelRequested 生效，clear 后失效
  const third = { sender: { id: 3 } }
  const thirdTask = tracker.start(third)
  if (tracker.requestCancel(third) !== true) throw new Error('requestCancel should mark running task')
  if (tracker.isCancelRequested(third, thirdTask) !== true) throw new Error('cancel flag not visible')
  if (tracker.requestCancel({ sender: { id: 99 } }) !== false) throw new Error('requestCancel on idle sender should return false')
  tracker.clear(third, thirdTask)
  if (tracker.isCancelRequested(third, thirdTask) !== false) throw new Error('cancel flag should clear with task')

  // 窗口期取消（axios 在途）+ 404 收场：暂存意图须随失败出口清理，不得毒化下次同 dest 下载
  const staleErrors = []
  let resolveStale = null
  pendingAxiosResolve = (resolve) => { resolveStale = resolve }
  requestWithProgress('https://example.test/stale404', 'stale.yakit', {}, undefined, undefined, (error) => staleErrors.push(error))
  await tick()
  try {
    await yakitCancelRequestWithProgress('stale.yakit')
    throw new Error('cancel before stream should reject')
  } catch (error) {
    if (error.message !== 'Write operation stoped') throw error
  }
  resolveStale({ status: 404, headers: {}, data: null })
  await tick()
  if (staleErrors.at(-1).message !== '404 not found in https://example.test/stale404') throw new Error('404 was not reported')
  pendingAxiosResolve = null
  responses.push(response())
  requestWithProgress('https://example.test/fresh', 'stale.yakit')
  await tick()
  await tick()
  if (writers.length !== writersBefore + 1) throw new Error('stale cancel intent poisoned the next download for same dest')
  writers.at(-1).emit('finish')
  await tick()

  // pendingByDest：axios 在途时第二路同 dest 须立即 onError，且 isDestBusy 为 true
  const pendingErrors = []
  let resolvePending = null
  pendingAxiosResolve = (resolve) => { resolvePending = resolve }
  requestWithProgress('https://example.test/pending', 'pending.yakit', {}, undefined, undefined, (error) => pendingErrors.push(error))
  await tick()
  if (!isDestBusy('pending.yakit')) throw new Error('dest should be busy while axios pending')
  requestWithProgress('https://example.test/pending2', 'pending.yakit', {}, undefined, undefined, (error) => pendingErrors.push(error))
  if (pendingErrors.at(-1).message !== 'Download already in progress for pending.yakit') {
    throw new Error('second download during pending was not rejected')
  }
  const data = new EventEmitter()
  data.pipe = () => {}
  resolvePending({ status: 200, headers: { 'content-length': '10' }, data })
  await tick()
  writers.at(-1).emit('finish')
  await tick()
  if (isDestBusy('pending.yakit')) throw new Error('dest should be free after finish')

  // engineCancel：无 writer 时须 reject（不得静默 resolve），并暂存意图阻止随后建流
  const engineErrors = []
  let resolveEngine = null
  pendingAxiosResolve = (resolve) => { resolveEngine = resolve }
  // stub filePath / engineVersion for engineCancel dest computation
  const Module2 = require('module')
  const prevLoad = Module2._load
  Module2._load = function (request, parent, isMain) {
    if (request === '../../filePath' || request.endsWith('/filePath') || request.includes('filePath')) {
      return { getYaklangEngineDir: () => '/engine' }
    }
    if (request === './engineVersion' || request.endsWith('/engineVersion') || request.includes('engineVersion')) {
      return { getLocalEngineCacheName: (v) => 'yak-' + v }
    }
    return prevLoad.call(this, request, parent, isMain)
  }
  const pathMod = require('path')
  const engineDest = pathMod.join('/engine', 'yak-v1.0.0')
  requestWithProgress('https://example.test/engine', engineDest, {}, undefined, undefined, (error) => engineErrors.push(error))
  await tick()
  const writersBeforeEngine = writers.length
  try {
    await engineCancelRequestWithProgress('v1.0.0')
    throw new Error('engine cancel before stream should reject')
  } catch (error) {
    if (error.message !== 'Write operation cancelled') throw error
  }
  const data2 = new EventEmitter()
  data2.pipe = () => {}
  resolveEngine({ status: 200, headers: { 'content-length': '10' }, data: data2 })
  await tick()
  if (writers.length !== writersBeforeEngine) throw new Error('engine writer created despite cancel intent')
  if (engineErrors.at(-1).message !== 'Write operation cancelled') throw new Error('engine stream was not cancelled after window cancel')
  Module2._load = prevLoad
  pendingAxiosResolve = null
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
`

describe('Yakit download cancellation', () => {
  it('runs cancellation, destination collision, completion cleanup, and per-sender tracking', () => {
    expect(() =>
      execFileSync(process.execPath, ['-e', runtimeTest], { cwd: process.cwd(), stdio: 'pipe' }),
    ).not.toThrow()
  })

  it('rejects cancellation issued before the download stream is established', () => {
    // 窗口期语义单独冒烟：无 writer 时 cancel 也必须 reject，而非静默 resolve
    const snippet = String.raw`
const Module = require('module')
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'axios') return { get: () => new Promise(() => {}) }
  if (request === 'fs') return { createWriteStream: () => { throw new Error('writer must not be created') } }
  if (request === 'throttle-debounce') return { throttle: (_d, cb) => cb }
  return originalLoad.call(this, request, parent, isMain)
}
const { yakitCancelRequestWithProgress } = require(${JSON.stringify(requestWithProgressPath)})
yakitCancelRequestWithProgress('never-started.yakit').then(
  () => { console.error('cancel before stream resolved silently'); process.exitCode = 1 },
  (error) => { process.exitCode = error.message === 'Write operation stoped' ? 0 : 1 },
)
`
    expect(() => execFileSync(process.execPath, ['-e', snippet], { cwd: process.cwd(), stdio: 'pipe' })).not.toThrow()
  })

  it('rejects engine cancellation issued before the download stream is established', () => {
    const snippet = String.raw`
const Module = require('module')
const path = require('path')
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'axios') return { get: () => new Promise(() => {}) }
  if (request === 'fs') return { createWriteStream: () => { throw new Error('writer must not be created') }, unlinkSync: () => {} }
  if (request === 'throttle-debounce') return { throttle: (_d, cb) => cb }
  if (request.includes('filePath')) return { getYaklangEngineDir: () => '/engine' }
  if (request.includes('engineVersion')) return { getLocalEngineCacheName: (v) => 'yak-' + v }
  return originalLoad.call(this, request, parent, isMain)
}
const { engineCancelRequestWithProgress } = require(${JSON.stringify(requestWithProgressPath)})
engineCancelRequestWithProgress('v1.2.3').then(
  () => { console.error('engine cancel before stream resolved silently'); process.exitCode = 1 },
  (error) => { process.exitCode = error.message === 'Write operation cancelled' ? 0 : 1 },
)
`
    expect(() => execFileSync(process.execPath, ['-e', snippet], { cwd: process.cwd(), stdio: 'pipe' })).not.toThrow()
  })
})
