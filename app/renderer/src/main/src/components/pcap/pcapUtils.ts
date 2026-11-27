import type { TreeDataNode } from 'antd'
import type { ByteData, PacketFilters, PacketQuery, PCAPFieldNode, PCAPPacketsFilter } from './pcapTypes'

export const emptyFilters: PacketFilters = { Protocol: '', SrcIP: '', DstIP: '', SrcPort: '', DstPort: '', Keyword: '' }

export const fileName = (path: string) => path.split(/[/\\]/).pop() || path

export const formatBytes = (value: string | number) => {
  const size = Number(value)
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  return `${(size / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
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
  const { Protocol, SrcIP, DstIP, SrcPort, DstPort, Keyword } = filters
  const values = (value: string) =>
    value
      .trim()
      .split(/[\s,|]+/)
      .filter(Boolean)
  const ports = (value: string, label: string) =>
    values(value).map((item) => {
      const port = Number(item)
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error(`${label}必须是 0–65535 的整数`)
      }
      return port
    })
  const filter: PCAPPacketsFilter = {}
  if (SrcIP.trim()) filter.SourceIP = values(SrcIP)
  if (DstIP.trim()) filter.DestinationIP = values(DstIP)
  if (SrcPort.trim()) filter.SourcePort = ports(SrcPort, '源端口')
  if (DstPort.trim()) filter.DestinationPort = ports(DstPort, '目的端口')
  if (Keyword.trim()) filter.Keyword = Keyword.trim()

  const protocol = Protocol.trim()
  const transport = ['TCP', 'UDP', 'SCTP', 'ARP', 'ICMPv4', 'ICMPv6'].includes(protocol)
  if (protocol && transport) filter.TransportLayerTypes = [protocol]
  if (protocol && !transport) filter.ApplicationLayerTypes = [protocol]
  return {
    DatasetID: datasetID,
    Filter: filter,
    Pagination: { Limit: limit, AfterId: cursor },
  }
}

export type ByteRange = [number, number]
export interface FieldSelection {
  sourceID: string
  ranges: ByteRange[]
  label?: string
}

export type PCAPFieldTone = 'frame' | 'link' | 'network' | 'transport' | 'tls' | 'application' | 'default'
export interface PCAPFieldTreeNode extends TreeDataNode {
  fieldName: string
  fieldValue?: string
  fieldDepth: number
  fieldTone: PCAPFieldTone
  children?: PCAPFieldTreeNode[]
}

const fieldTone = (name: string): PCAPFieldTone => {
  const normalized = name.toLowerCase()
  if (normalized.startsWith('frame')) return 'frame'
  if (/(ethernet|arp|vlan)/.test(normalized)) return 'link'
  if (/(ipv4|ipv6|icmp)/.test(normalized)) return 'network'
  if (/(tcp|udp|sctp)/.test(normalized)) return 'transport'
  if (/(tls|ssl)/.test(normalized)) return 'tls'
  if (/(http|dns|dhcp|ftp|smtp|pop3|imap|ssh|ntp)/.test(normalized)) return 'application'
  return 'default'
}

const rangeForField = (range: PCAPFieldNode['Ranges'][number]): ByteRange | undefined => {
  const start = Number(range.BitOffset)
  const length = Number(range.BitLength)
  if (!range.SourceID || !Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length <= 0)
    return undefined
  return [Math.floor(start / 8), Math.ceil((start + length) / 8)]
}

export const fieldTree = (fields: PCAPFieldNode[]) => {
  const selections: Record<string, FieldSelection> = {}
  const walk = (
    items: PCAPFieldNode[],
    path: string,
    depth = 0,
    inheritedTone: PCAPFieldTone = 'default',
  ): PCAPFieldTreeNode[] =>
    items.map((field, index) => {
      const key = `${path}/${index}`
      const tone = depth === 0 ? fieldTone(field.Name) : inheritedTone
      const children = walk(field.Children || [], key, depth + 1, tone)
      const sourceID = field.Ranges?.[0]?.SourceID || ''
      const ownRanges = (field.Ranges || [])
        .filter((range) => range.SourceID === sourceID)
        .map(rangeForField)
        .filter((range): range is ByteRange => Boolean(range))
      if (sourceID && ownRanges.length) {
        selections[key] = { sourceID, ranges: ownRanges, label: field.Name }
      } else if (children.length) {
        const childSelections = children.map((child) => selections[String(child.key)]).filter(Boolean)
        const childSource = childSelections[0]?.sourceID
        if (childSource && childSelections.every((selection) => selection.sourceID === childSource)) {
          const ranges = childSelections.flatMap((selection) => selection.ranges)
          selections[key] = {
            sourceID: childSource,
            ranges: [[Math.min(...ranges.map((range) => range[0])), Math.max(...ranges.map((range) => range[1]))]],
            label: field.Name,
          }
        }
      }
      const title = field.DisplayValue ? `${field.Name}: ${field.DisplayValue}` : field.Name
      return {
        key,
        title,
        fieldName: field.Name,
        fieldValue: field.DisplayValue,
        fieldDepth: depth,
        fieldTone: tone,
        ...(depth === 0 ? { className: 'pcap-protocol-root' } : {}),
        ...(children.length ? { children } : { isLeaf: true }),
      }
    })
  return { nodes: walk(fields, 'root'), selections }
}
