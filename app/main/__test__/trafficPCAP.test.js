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
  const stream = Object.assign(new EventEmitter(), { cancel: vi.fn(), write: vi.fn() })
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
    PcapX: vi.fn(() => stream),
    GetPcapMetadata: vi.fn((_params, cb) => cb(null, { AvailablePcapDevices: [] })),
    QueryPCAPDatabase: vi.fn((_params, cb) => cb(null, { Data: [] })),
    QueryPCAPPackets: vi.fn((_params, cb) => cb(null, { Data: [] })),
    GetPCAPPacketDetail: vi.fn((_params, cb) => cb(null, { Packet: { Id: '1' } })),
    ReadPCAPBytes: vi.fn((_params, cb) => cb(null, { Data: Buffer.from([1, 2]) })),
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
      'GetPcapMetadata',
      'PcapX',
      'ImportPCAPFile',
      'QueryPCAPDatabase',
      'QueryPCAPPackets',
      'GetPCAPPacketDetail',
      'ReadPCAPBytes',
      'ExportPCAPData',
      'DeletePCAPDatabase',
    ])
      expect(handlers.has(name)).toBe(true)
    await expect(handlers.get('QueryPCAPDatabase')({}, {})).resolves.toEqual({ Data: [] })
    expect(client.QueryPCAPDatabase).toHaveBeenCalledOnce()
    await expect(handlers.get('GetPCAPPacketDetail')({}, { DatasetID: 'd', PacketID: '1' })).resolves.toMatchObject({
      Packet: { Id: '1' },
    })
    await expect(
      handlers.get('ReadPCAPBytes')({}, { DatasetID: 'd', SourceID: 'frame:1', Offset: '0', Length: '2' }),
    ).resolves.toEqual({ Data: Buffer.from([1, 2]) })
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

  it('routes PcapX responses through the renderer stream helper', async () => {
    const { handlers, window, stream } = loadHandlers()
    const event = { sender: { id: 7 } }
    const request = { NetInterfaceList: ['eth0'] }
    handlers.get('PcapX')(event, request, 'live-test')
    expect(stream.write).toHaveBeenCalledWith(request)
    stream.emit('data', { Database: { DatasetID: 'dataset-live' }, Finished: false })
    expect(window.webContents.send).toHaveBeenCalledWith('live-test-data', {
      Database: { DatasetID: 'dataset-live' },
      Finished: false,
    })
    await handlers.get('cancel-PcapX')({ sender: { id: 7 } }, 'live-test')
    expect(stream.cancel).toHaveBeenCalledOnce()
  })
})

describe('PCAP protobuf contract', () => {
  const loader = require('@grpc/proto-loader')
  const grpc = require('@grpc/grpc-js')
  const definition = loader.loadSync(path.resolve('app/protos/grpc.proto'), {
    keepCase: true,
    longs: String,
    defaults: true,
    oneofs: true,
  })
  const service = grpc.loadPackageDefinition(definition).ypb.Yak.service

  it('keeps the deprecated traffic packet wire shape', () => {
    const method = service.QueryTrafficPacket
    const request = {
      Pagination: { Page: '1', Limit: '100', OrderBy: 'id', Order: 'asc', AfterId: '24' },
      TimestampNow: '1700000000123456789',
      SessionId: 'session',
      LinkLayerTypes: 'ethernet',
      NetworkLayerTypes: 'ipv4',
      TransportLayerTypes: 'tcp',
      ApplicationLayerTypes: 'http',
      SrcIP: '10.0.0.1',
      DstIP: '10.0.0.2',
      SrcPort: '0',
      DstPort: '80',
      FromId: '9007199254740993',
    }
    expect(method.requestDeserialize(method.requestSerialize(request))).toMatchObject(request)
    expect([...method.requestSerialize({ FromId: '1' })]).toEqual([96, 1])
    const packet = {
      Id: '9007199254740993',
      Raw: Buffer.from([0, 255]),
      Protocol: 'http',
      Info: 'GET / HTTP/1.1',
    }
    expect(
      method.responseDeserialize(
        method.responseSerialize({
          Data: [packet],
          Pagination: { Page: '1', Limit: '100', OrderBy: 'id', Order: 'asc', AfterId: packet.Id },
        }),
      ),
    ).toMatchObject({
      Data: [packet],
      Pagination: { Page: '1', Limit: '100', OrderBy: 'id', Order: 'asc', AfterId: packet.Id },
    })
  })

  it('exposes the new packet query, detail and bounded byte methods', () => {
    expect(service.QueryPCAPPackets).toBeTruthy()
    expect(service.GetPCAPPacketDetail).toBeTruthy()
    expect(service.ReadPCAPBytes).toBeTruthy()

    const query = service.QueryPCAPPackets
    const request = {
      DatasetID: 'dataset',
      Filter: {
        SourceIP: ['10.0.0.1'],
        SourcePort: [0],
        ApplicationLayerTypes: ['http'],
        StartTimestampNS: '1700000000123456789',
        EndTimestampNS: '1700000001123456789',
      },
      Pagination: { Limit: 100, AfterId: '9007199254740993' },
    }
    expect(query.requestDeserialize(query.requestSerialize(request))).toMatchObject({
      ...request,
      Pagination: { ...request.Pagination, Limit: '100' },
    })

    const detail = service.GetPCAPPacketDetail
    expect(
      detail.requestDeserialize(detail.requestSerialize({ DatasetID: 'dataset', PacketID: '9007199254740993' })),
    ).toMatchObject({ DatasetID: 'dataset', PacketID: '9007199254740993' })

    const read = service.ReadPCAPBytes
    const response = {
      Data: Buffer.from([0, 255]),
      Offset: '9007199254740993',
      TotalLength: '9007199254741000',
      EOF: false,
    }
    expect(read.responseDeserialize(read.responseSerialize(response))).toMatchObject(response)
  })

  it('carries live capture controls and database progress over PcapX', () => {
    const method = service.PcapX
    const request = {
      NetInterfaceList: ['eth0'],
      BPF: 'tcp port 80',
      Snaplen: 4096,
      Promisc: true,
      BatchSize: '2000',
      FlushIntervalMilliseconds: '250',
      DurationMilliseconds: '0',
    }
    expect(method.requestDeserialize(method.requestSerialize(request))).toMatchObject(request)
    const response = {
      PacketFrameCounter: '42',
      NetInterfaceTransferKBPerSeconds: '1024',
      TCPReassembledCount: '7',
      TrafficSessionCount: '3',
      Database: {
        DatasetID: 'dataset-live',
        State: 'ready',
        PacketCount: '42',
        ProtocolCount: '8',
        SessionCount: '3',
        StreamCount: '5',
        StreamChunkCount: '7',
        SourceKind: 'live',
        CaptureInterface: 'eth0',
        CaptureBPF: 'tcp port 80',
        StreamsIndexed: true,
        CreatedAt: '1700000000',
      },
      Finished: false,
      Error: '',
    }
    expect(method.responseDeserialize(method.responseSerialize(response))).toMatchObject(response)
  })

  it('round-trips PCAP database source and index metadata', () => {
    const method = service.QueryPCAPDatabase
    const database = {
      DatasetID: 'dataset-live',
      SourceKind: 'live',
      CaptureInterface: 'eth0',
      CaptureBPF: 'tcp port 80',
      ProtocolCount: '8',
      SessionCount: '3',
      StreamCount: '5',
      StreamChunkCount: '7',
      StreamsIndexed: true,
      CreatedAt: '1700000000',
    }
    expect(
      method.responseDeserialize(
        method.responseSerialize({
          Data: [database],
          Pagination: { Page: '1', Limit: '100', OrderBy: 'id', Order: 'asc', AfterId: '24' },
        }),
      ),
    ).toMatchObject({
      Data: [database],
      Pagination: { Page: '1', Limit: '100', OrderBy: 'id', Order: 'asc', AfterId: '24' },
    })
  })
})
