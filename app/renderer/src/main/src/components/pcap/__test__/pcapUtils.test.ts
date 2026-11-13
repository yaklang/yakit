import { describe, expect, it } from 'vitest'
import { decodeBytes, emptyFilters, fileName, formatTimestamp, packetQuery, protocolTree } from '../pcapUtils'

describe('PCAP viewer contracts', () => {
  it('keeps int64 cursors and timestamps exact', () => {
    const query = packetQuery('dataset', { ...emptyFilters, Protocol: 'HTTP', SrcPort: '0' }, '9007199254740993', 100)
    expect(query).toMatchObject({
      DatasetID: 'dataset',
      ApplicationLayerTypes: 'HTTP',
      TransportLayerTypes: '',
      SrcPort: '0',
      FromId: '9007199254740993',
      Full: false,
    })
    expect(formatTimestamp('1700000000123456789')).toMatch(/\.123456789$/)
    expect(formatTimestamp('0')).not.toBe('—')
    expect(formatTimestamp(undefined)).toBe('—')
  })

  it('routes transport filters separately from saved application protocols', () => {
    expect(packetQuery('d', { ...emptyFilters, Protocol: 'TCP' }, '0', 50)).toMatchObject({
      TransportLayerTypes: 'TCP',
      ApplicationLayerTypes: '',
    })
  })

  it('decodes both IPC Buffer representations and message base64', () => {
    expect([...decodeBytes(new Uint8Array([0, 255]))]).toEqual([0, 255])
    expect([...decodeBytes({ type: 'Buffer', data: [0, 255] })]).toEqual([0, 255])
    expect([...decodeBytes('AP8=')]).toEqual([0, 255])
    expect(fileName('C:\\captures\\http.pcap')).toBe('http.pcap')
  })

  it('uses bit scopes from the old tree and never fabricates message offsets', () => {
    const tree = protocolTree([
      { name: 'TCP', value: [{ name: 'Source port', value: { leaf: true, verbose: '80', scope: [272, 288] } }] },
      { name: 'HTTP', value: [{ name: 'Status code', value: { leaf: true, verbose: '200' } }] },
    ])
    expect(tree.scopes['root/0/0']).toEqual([34, 36])
    expect(tree.scopes['root/0']).toEqual([34, 36])
    expect(tree.scopes['root/1/0']).toBeUndefined()
    expect(tree.scopes['root/1']).toBeUndefined()
  })
})
