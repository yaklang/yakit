import { int64ToSafeNumber } from '@/utils/int64'
import type { KVPair } from '@/models/kv'

export interface TrafficSession {
  Id: string | number
  SessionType: string
  Uuid: string
  DeviceName: string
  DeviceType: string
  IsLinkLayerEthernet: boolean
  LinkLayerSrc: string
  LinkLayerDst: string
  IsIpv4: boolean
  IsIpv6: boolean
  NetworkSrcIP: string
  NetworkDstIP: string
  IsTcpIpStack: boolean
  TransportLayerSrcPort: number
  TransportLayerDstPort: number
  IsTCPReassembled: boolean
  IsHalfOpen: boolean
  IsClosed: boolean
  IsForceClosed: boolean
  HaveClientHello: boolean
  SNI: string
  Protocol?: string
}

export interface TrafficTCPReassembled {
  Id: string | number
  SessionUuid: string
  Raw: Uint8Array
  Seq: string | number
  Timestamp: number

  Source: string
  Destination: string
  Protocol: string
}

export interface TrafficPacket {
  LinkLayerType: string
  NetworkLayerType: string
  TransportLayerType: string
  ApplicationLayerType: string
  Payload: Uint8Array
  Raw: Uint8Array
  EthernetEndpointHardwareAddrSrc: string
  EthernetEndpointHardwareAddrDst: string
  IsIpv4: boolean
  IsIpv6: boolean
  NetworkEndpointIPSrc: string
  NetworkEndpointIPDst: string
  TransportEndpointPortSrc: number
  TransportEndpointPortDst: number
  SessionId: string
  Protocol: string
  Info: string
  Id: string | number
}

export interface NetInterface {
  Name: string
  Description: string
  NetInterfaceName: string
  Addr: string
  IP: string
  IsIpv4?: boolean
  IsIpv6?: boolean
}

export interface PcapMetadata {
  AvailablePcapDevices: NetInterface[]
  AvailableSessionTypes: KVPair[]
  AvailableLinkLayerTypes: KVPair[]
  AvailableNetworkLayerTypes: KVPair[]
  AvailableTransportLayerTypes: KVPair[]
  DefaultPublicNetInterface: NetInterface | null
}

export function trafficPacketsForUI(value: import('@/services/ipc').GrpcOutput<'QueryTrafficPacket'>) {
  return {
    ...value,
    Data: value.Data.map((row) => ({
      ...row,
      TransportEndpointPortSrc: int64ToSafeNumber(row.TransportEndpointPortSrc),
      TransportEndpointPortDst: int64ToSafeNumber(row.TransportEndpointPortDst),
    })),
  }
}

export function trafficSessionsForUI(value: import('@/services/ipc').GrpcOutput<'QueryTrafficSession'>) {
  return {
    ...value,
    Data: value.Data.map((row) => ({
      ...row,
      TransportLayerSrcPort: int64ToSafeNumber(row.TransportLayerSrcPort),
      TransportLayerDstPort: int64ToSafeNumber(row.TransportLayerDstPort),
    })),
  }
}

export function tcpReassembledForUI(value: import('@/services/ipc').GrpcOutput<'QueryTrafficTCPReassembled'>) {
  return { ...value, Data: value.Data.map((row) => ({ ...row, Timestamp: int64ToSafeNumber(row.Timestamp) })) }
}
