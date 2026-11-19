// The main process uses proto-loader's longs:String. Keep packet IDs, message
// IDs, byte offsets and nanosecond timestamps as strings across the bridge.
export interface PCAPDatabase {
  Id: string
  DatasetID: string
  SourcePath: string
  SourceSize: string
  Format: string
  State: string
  PacketCount: string
  LastError: string
  ProtocolsIndexed: boolean
}

export interface DatabasePage {
  Data: PCAPDatabase[]
  Total: string
  NextCursor: string
  HasMore: boolean
}

export interface ImportProgress {
  DatasetID: string
  State: string
  BytesIndexed: string
  TotalBytes: string
  PacketCount: string
  Finished: boolean
  Database?: PCAPDatabase
}

export interface PCAPNetInterface {
  Name: string
  Description: string
  NetInterfaceName: string
  Addr: string
  IP: string
  IsIpv4?: boolean
  IsIpv6?: boolean
}

export interface PcapMetadata {
  AvailablePcapDevices: PCAPNetInterface[]
  DefaultPublicNetInterface?: PCAPNetInterface
}

export interface LiveCaptureRequest {
  NetInterfaceList: string[]
  BPF?: string
  Snaplen?: number
  Promisc?: boolean
  BatchSize?: string
  FlushIntervalMilliseconds?: string
  DurationMilliseconds?: string
}

export interface LiveCaptureProgress {
  DatasetID: string
  State: string
  BytesIndexed: string
  TotalBytes: string
  PacketFrameCounter: string
  NetInterfaceTransferKBPerSeconds: string
  ProtocolCount: string
  SessionCount: string
  StreamCount: string
  StreamChunkCount: string
  Finished: boolean
  Error: string
}

export interface PacketFilters {
  Protocol: string
  SrcIP: string
  DstIP: string
  SrcPort: string
  DstPort: string
  Keyword: string
}

export interface PCAPPacketsFilter {
  Id?: string
  SourceIP?: string[]
  DestinationIP?: string[]
  SourcePort?: number[]
  DestinationPort?: number[]
  TransportLayerTypes?: string[]
  ApplicationLayerTypes?: string[]
  LinkLayerTypes?: string[]
  NetworkLayerTypes?: string[]
  StartTimestampNS?: string
  EndTimestampNS?: string
  Keyword?: string
}

export interface PacketQuery {
  DatasetID: string
  Filter?: PCAPPacketsFilter
  Pagination: { Limit: number; AfterId?: string }
  IncludeTotal?: boolean
}

export type ByteData = Uint8Array | number[] | { type: 'Buffer'; data: number[] } | string

export interface PCAPPacketSummary {
  Id: string
  TimestampNS?: string
  CapturedLength: string
  OriginalLength: string
  LinkType: string
  Section: string
  Interface: string
  SourceMAC: string
  DestinationMAC: string
  VLANStack: string
  SourceIP: string
  DestinationIP: string
  SourcePort: number
  DestinationPort: number
  Transport: string
  Protocol: string
  ApplicationProtocols: string[]
  Info: string
  DecodeError: string
}

export interface PacketPage {
  Data: PCAPPacketSummary[]
  Total?: string
  NextCursor: string
  HasMore: boolean
}

export interface PCAPFieldRange {
  SourceID: string
  BitOffset: string
  BitLength: string
}

export interface PCAPFieldNode {
  Name: string
  DisplayValue?: string
  Children: PCAPFieldNode[]
  Ranges: PCAPFieldRange[]
}

export interface PCAPByteSource {
  ID: string
  Kind: string
  Name: string
  Length: string
  Completeness: string
  ContributorPacketIds: string[]
  CompletedInPacketId: string
  InitialData: ByteData
  InitialOffset: string
  InitialTruncated: boolean
}

export interface PCAPMessageDetail {
  MessageId: string
  Protocol: string
  Summary: string
  Status: string
  Completeness: string
  SourceID: string
  Nodes: PCAPFieldNode[]
  DecodeError: string
  NodesTruncated: boolean
}

export interface PCAPRelatedMessage {
  MessageId: string
  Protocol: string
  Summary: string
  SourceID: string
  CompletedInPacketId: string
  Completeness: string
}

export interface PCAPPacketDetail {
  Packet: PCAPPacketSummary
  Nodes: PCAPFieldNode[]
  Messages: PCAPMessageDetail[]
  RelatedMessages: PCAPRelatedMessage[]
  ByteSources: PCAPByteSource[]
}

export interface ReadPCAPBytesResponse {
  Data: ByteData
  Offset: string
  TotalLength: string
  EOF: boolean
}
