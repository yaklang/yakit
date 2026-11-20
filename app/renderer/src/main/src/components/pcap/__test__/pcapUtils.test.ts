import { describe, expect, it } from 'vitest'
import { decodeBytes, emptyFilters, fieldTree, fileName, formatTimestamp, packetQuery } from '../pcapUtils'

describe('PCAP viewer contracts', () => {
  it('keeps int64 cursors and timestamps exact', () => {
    const query = packetQuery('dataset', { ...emptyFilters, Protocol: 'HTTP', SrcPort: '0' }, '9007199254740993', 100)
    expect(query).toMatchObject({
      DatasetID: 'dataset',
      Filter: {
        ApplicationLayerTypes: ['HTTP'],
        SourcePort: [0],
      },
      Pagination: { AfterId: '9007199254740993', Limit: 100 },
    })
    expect(query.Filter?.TransportLayerTypes).toBeUndefined()
    expect(formatTimestamp('1700000000123456789')).toMatch(/\.123456789$/)
    expect(formatTimestamp('0')).not.toBe('—')
    expect(formatTimestamp(undefined)).toBe('—')
  })

  it('routes transport filters separately from saved application protocols', () => {
    expect(packetQuery('d', { ...emptyFilters, Protocol: 'TCP' }, '0', 50)).toMatchObject({
      Filter: { TransportLayerTypes: ['TCP'] },
    })
    expect(
      packetQuery('d', { ...emptyFilters, Protocol: 'TCP' }, '0', 50).Filter?.ApplicationLayerTypes,
    ).toBeUndefined()
  })

  it('rejects invalid port filters before calling the engine', () => {
    expect(() => packetQuery('d', { ...emptyFilters, DstPort: '70000' }, '0', 50)).toThrow('目的端口')
  })

  it('decodes IPC Buffer representations and base64 byte data', () => {
    expect([...decodeBytes(new Uint8Array([0, 255]))]).toEqual([0, 255])
    expect([...decodeBytes({ type: 'Buffer', data: [0, 255] })]).toEqual([0, 255])
    expect([...decodeBytes('AP8=')]).toEqual([0, 255])
    expect(fileName('C:\\captures\\http.pcap')).toBe('http.pcap')
  })

  it('maps typed bit ranges to the source byte interval and aggregates containers', () => {
    const tree = fieldTree([
      {
        Name: 'TCP',
        Children: [
          {
            Name: 'Source port',
            DisplayValue: '80',
            Children: [],
            Ranges: [{ SourceID: 'frame:1', BitOffset: '272', BitLength: '16' }],
          },
        ],
        Ranges: [],
      },
      {
        Name: 'HTTP',
        DisplayValue: 'message context only',
        Children: [],
        Ranges: [],
      },
    ])
    expect(tree.nodes[0]).toMatchObject({
      fieldName: 'TCP',
      fieldDepth: 0,
      fieldTone: 'transport',
    })
    expect(tree.nodes[0].children?.[0]).toMatchObject({
      fieldName: 'Source port',
      fieldValue: '80',
      fieldDepth: 1,
      fieldTone: 'transport',
    })
    expect(tree.selections['root/0/0']).toEqual({ sourceID: 'frame:1', ranges: [[34, 36]], label: 'Source port' })
    expect(tree.selections['root/0']).toEqual({ sourceID: 'frame:1', ranges: [[34, 36]], label: 'TCP' })
    expect(tree.selections['root/1']).toBeUndefined()
  })
})
