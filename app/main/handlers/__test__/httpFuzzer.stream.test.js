// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { beforeEach, expect, it } from 'vitest'

const filename = new URL('../httpFuzzer.js', import.meta.url)
const source = readFileSync(filename, 'utf8')
const require = createRequire(filename)

const load = () => {
  const handlers = new Map()
  const sent = []
  const win = {
    isDestroyed: () => false,
    webContents: {
      isDestroyed: () => false,
      send: (channel, payload) => sent.push([channel, payload]),
    },
  }
  const streams = []
  const client = {
    HTTPFuzzer: () => {
      const stream = new EventEmitter()
      stream.cancel = () => {}
      streams.push(stream)
      return stream
    },
    HTTPFuzzerSequence: () => client.HTTPFuzzer(),
  }
  const dependencies = {
    electron: { ipcMain: { handle: (name, callback) => handlers.set(name, callback) } },
    '../filePath': { getYakProjects: () => '/tmp/yakit-projects' },
    fs: {},
  }
  const module = { exports: {} }
  new Function('require', 'module', source)((id) => dependencies[id] ?? require(id), module)
  module.exports(win, () => client)
  return { handlers, sent, streams }
}

let handlers
let sent
let streams

beforeEach(() => {
  ;({ handlers, sent, streams } = load())
})

it('sends each HTTPFuzzer result on the token channel only once', () => {
  handlers.get('HTTPFuzzer')({}, {}, 'tok')
  streams[0].emit('data', { ok: true })
  streams[0].emit('error', { details: 'boom' })
  expect(sent.map(([channel]) => channel)).toEqual(['tok-data', 'tok-error'])
  expect(sent.some(([channel]) => channel.startsWith('fuzzer-data-') || channel.startsWith('fuzzer-error-'))).toBe(
    false,
  )
})

it('sends each HTTPFuzzerSequence result on the token channel only once', () => {
  handlers.get('HTTPFuzzerSequence')({}, {}, 'seq')
  streams[0].emit('data', { ok: true })
  streams[0].emit('end')
  expect(sent.map(([channel]) => channel)).toEqual(['seq-data', 'seq-end'])
  expect(sent.some(([channel]) => channel.startsWith('fuzzer-sequence-'))).toBe(false)
})
