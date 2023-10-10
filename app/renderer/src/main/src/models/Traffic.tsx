import React from "react";
import {KVPair} from "@/models/kv";

export interface TrafficSession {
    Id: number;
    SessionType: string;
    Uuid: string;
    DeviceName: string;
    DeviceType: string;
    IsLinkLayerEthernet: boolean;
    LinkLayerSrc: string;
    LinkLayerDst: string;
    IsIpv4: boolean;
    IsIpv6: boolean;
    NetworkSrcIP: string;
    NetworkDstIP: string;
    IsTcpIpStack: boolean;
    TransportLayerSrcPort: number;
    TransportLayerDstPort: number;
    IsTCPReassembled: boolean;
    IsHalfOpen: boolean;
    IsClosed: boolean;
    IsForceClosed: boolean;
    HaveClientHello: boolean;
    SNI: string;
}

export interface TrafficPacket {
    LinkLayerType: string;
    NetworkLayerType: string;
    TransportLayerType: string;
    ApplicationLayerType: string;
    Payload: Uint8Array;
    Raw: Uint8Array;
    EthernetEndpointHardwareAddrSrc: string;
    EthernetEndpointHardwareAddrDst: string;
    IsIpv4: boolean;
    IsIpv6: boolean;
    NetworkEndpointIPSrc: string;
    NetworkEndpointIPDst: string;
    TransportEndpointPortSrc: number;
    TransportEndpointPortDst: number;
    SessionId: string;
    Id: number;
}

export interface NetInterface {
    Name: string
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
    DefaultPublicNetInterface: NetInterface
}