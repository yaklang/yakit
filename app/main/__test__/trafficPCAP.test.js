import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import handlerHelper from '../handlers/handleStreamWithContext'

const require = createRequire(import.meta.url)
const loadHandlers = () => {
  const handlers = new Map()
  const stream = Object.assign(new EventEmitter(), { cancel: vi.fn() })
  const window = Object.assign(new EventEmitter(), {
    isDestroyed: () => false,
    webContents: Object.assign(new EventEmitter(), {
      id: 7,
      isDestroyed: () => false,
      isCrashed: () => false,
      send: vi.fn(),
    }),
  })
  const client = {
    ImportPCAPFile: vi.fn(() => stream),
    QueryPCAPDatabase: vi.fn((_params, cb) => cb(null, { Data: [] })),
  }
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(path.resolve('app/main/handlers/traffic.js'), 'utf8'), {
    module,
    require: (id) =>
      id === 'electron' ? { ipcMain: { handle: (name, handler) => handlers.set(name, handler) } } : handlerHelper,
  })
  module.exports(window, () => client)
  return { handlers, window, stream, client }
}

describe('PCAP main-process transport', () => {
  it('registers old queries and PCAP operations without shadowing stream helpers', async () => {
    const { handlers, client } = loadHandlers()
    for (const name of [
      'QueryTrafficPacket',
      'ParseTraffic',
      'ImportPCAPFile',
      'QueryPCAPDatabase',
      'ExportPCAPData',
      'DeletePCAPDatabase',
    ])
      expect(handlers.has(name)).toBe(true)
    await expect(handlers.get('QueryPCAPDatabase')({}, {})).resolves.toEqual({ Data: [] })
    expect(client.QueryPCAPDatabase).toHaveBeenCalledOnce()
  })

  it('owns import streams per renderer and cancels them when the window closes', () => {
    const { handlers, window, stream } = loadHandlers()
    const event = { sender: { id: 7 } }
    handlers.get('ImportPCAPFile')(event, { InputFile: '/captures/http.pcap' }, 'pcap-test')
    stream.emit('data', { Finished: false })
    expect(window.webContents.send).toHaveBeenCalledWith('pcap-test-data', { Finished: false })
    expect(() => handlers.get('cancel-ImportPCAPFile')({ sender: { id: 8 } }, 'pcap-test')).toThrow()
    window.emit('closed')
    expect(stream.cancel).toHaveBeenCalledOnce()
  })
})

describe('extended legacy protobuf contract', () => {
  const loader = require('@grpc/proto-loader')
  const grpc = require('@grpc/grpc-js')
  const definition = loader.loadSync(path.resolve('app/protos/grpc.proto'), {
    keepCase: true,
    longs: String,
    defaults: true,
    oneofs: true,
  })
  const service = grpc.loadPackageDefinition(definition).ypb.Yak.service

  it('keeps old wire numbers and round-trips exact packet IDs, nanoseconds and Full details', () => {
    const method = service.QueryTrafficPacket
    const request = {
      DatasetID: 'dataset',
      Full: true,
      Id: '9007199254740993',
      SrcPort: '0',
      StartTimestampNS: '1700000000123456789',
    }
    expect(method.requestDeserialize(method.requestSerialize(request))).toMatchObject(request)
    expect([...method.requestSerialize({ FromId: '1' })]).toEqual([96, 1])
    const packet = {
      Id: '9007199254740993',
      TimestampNS: '1700000000123456789',
      CapturedLength: '478',
      Raw: Buffer.from([0, 255]),
      Details: '{"Result":[],"Messages":[]}',
    }
    expect(
      method.responseDeserialize(method.responseSerialize({ Data: [packet], NextCursor: packet.Id, HasMore: true })),
    ).toMatchObject({ Data: [packet], NextCursor: packet.Id, HasMore: true })
  })
})
