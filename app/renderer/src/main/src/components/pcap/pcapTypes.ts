// The main process uses proto-loader's longs:String. Keep packet IDs and
// nanosecond timestamps as strings all the way back to gRPC.
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

export interface PacketFilters {
  Protocol: string
  SrcIP: string
  DstIP: string
  SrcPort: string
  DstPort: string
  Keyword: string
}

export interface PacketQuery {
  DatasetID: string
  Pagination?: { Limit: number; Page?: number }
  FromId?: string
  Id?: string
  Full?: boolean
  SrcIP?: string
  DstIP?: string
  SrcPort?: string
  DstPort?: string
  TransportLayerTypes?: string
  ApplicationLayerTypes?: string
  Keyword?: string
}

export type ByteData = Uint8Array | number[] | { type: 'Buffer'; data: number[] } | string

export interface PCAPPacket {
  Id: string
  TimestampNS?: string
  CapturedLength: string
  OriginalLength: string
  LinkType: string
  Section: string
  Interface: string
  LinkLayerType: string
  NetworkLayerType: string
  TransportLayerType: string
  NetworkEndpointIPSrc: string
  NetworkEndpointIPDst: string
  TransportEndpointPortSrc: string
  TransportEndpointPortDst: string
  EthernetEndpointHardwareAddrSrc: string
  EthernetEndpointHardwareAddrDst: string
  Protocol: string
  Info: string
  DecodeError: string
  Raw: ByteData
  Details: string
}

export interface PacketPage {
  Data: PCAPPacket[]
  Total: string
  NextCursor: string
  HasMore: boolean
  Truncated: boolean
}

export interface ProtocolField {
  name: string
  value: ProtocolField[] | { leaf: boolean; verbose: string; scope?: [number, number] }
}

export interface PacketMessage {
  MessageId: number
  Protocol: string
  Info: string
  Status: string
  Completeness: string
  PacketIds: number[]
  CompletedInPacketId: number
  Kind: string
  RAW: string
  Result: ProtocolField[]
  DecodeError?: string
}

export interface PacketDetails {
  Result: ProtocolField[]
  Messages: PacketMessage[]
  ProtocolsIndexed: boolean
  DecodeError?: string
}
