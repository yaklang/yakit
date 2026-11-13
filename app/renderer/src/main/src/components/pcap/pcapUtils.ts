import type { TreeDataNode } from 'antd'
import type { ByteData, PacketFilters, PacketQuery, ProtocolField } from './pcapTypes'

export const emptyFilters: PacketFilters = { Protocol: '', SrcIP: '', DstIP: '', SrcPort: '', DstPort: '', Keyword: '' }

export const fileName = (path: string) => path.split(/[/\\]/).pop() || path

export const formatBytes = (value: string | number) => {
  const size = Number(value)
  if (!size) return '0 B'
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 3)
  return `${(size / 1024 ** index).toFixed(index ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][index]}`
}

export const formatTimestamp = (value?: string) => {
  if (value === undefined || value === null || value === '') return '—'
  try {
    const timestamp = BigInt(value)
    const billion = BigInt(1000000000)
    const remainder = ((timestamp % billion) + billion) % billion
    const seconds = (timestamp - remainder) / billion
    const time = new Date(Number(seconds) * 1000).toLocaleTimeString('en-GB', { hour12: false })
    return `${time}.${remainder.toString().padStart(9, '0')}`
  } catch {
    return '—'
  }
}

export const decodeBytes = (value?: ByteData): Uint8Array => {
  if (!value) return new Uint8Array()
  if (typeof value === 'string') return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
  if ('type' in value && value.type === 'Buffer') return new Uint8Array(value.data)
  return new Uint8Array(value as ArrayLike<number>)
}

export const packetQuery = (datasetID: string, filters: PacketFilters, cursor: string, limit: number): PacketQuery => {
  const { Protocol, ...fields } = filters
  const transport = ['TCP', 'UDP', 'SCTP', 'ARP', 'ICMPv4', 'ICMPv6'].includes(Protocol)
  return {
    DatasetID: datasetID,
    ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()])),
    TransportLayerTypes: transport ? Protocol : '',
    ApplicationLayerTypes: !transport ? Protocol : '',
    FromId: cursor,
    Pagination: { Page: 1, Limit: limit },
    Full: false,
  }
}

export type ByteRange = [number, number]

export const protocolTree = (fields: ProtocolField[]) => {
  const scopes: Record<string, ByteRange> = {}
  const walk = (items: ProtocolField[], path: string): TreeDataNode[] =>
    items.map((field, index) => {
      const key = `${path}/${index}`
      const { name, value } = field
      if (Array.isArray(value)) {
        const children = walk(value, key)
        const ranges = children.map((child) => scopes[String(child.key)]).filter(Boolean)
        if (ranges.length) scopes[key] = [Math.min(...ranges.map((r) => r[0])), Math.max(...ranges.map((r) => r[1]))]
        return { key, title: name, children }
      }
      if (value?.scope && value.scope[0] >= 0 && value.scope[1] > value.scope[0]) {
        // The legacy parser contract uses bits; the byte viewer uses [start,end).
        scopes[key] = [Math.floor(value.scope[0] / 8), Math.ceil(value.scope[1] / 8)]
      }
      return { key, title: `${name}${value?.verbose !== undefined ? `: ${value.verbose}` : ''}`, isLeaf: true }
    })
  return { nodes: walk(fields, 'root'), scopes }
}
