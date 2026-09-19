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

Module._load = function (request, parent, isMain) {
  if (request === 'axios') return { get: () => Promise.resolve(responses.shift()) }
  if (request === 'fs') return {
    createWriteStream: () => {
      const writer = new EventEmitter()
      writer.destroy = (error) => { writer.error = error; writer.emit('close') }
      writers.push(writer)
      return writer
    },
    unlinkSync: () => {},
  }
  if (request === 'throttle-debounce') return { throttle: (_delay, callback) => callback }
  return originalLoad.call(this, request, parent, isMain)
}

const { requestWithProgress, yakitCancelRequestWithProgress } = require(${JSON.stringify(requestWithProgressPath)})
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
})
