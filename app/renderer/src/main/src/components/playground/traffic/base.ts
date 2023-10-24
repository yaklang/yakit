import {TrafficPacket, TrafficSession, TrafficTCPReassembled} from "@/models/Traffic";

export interface TrafficViewerControlIf {
    realtime?: boolean;
    onClick?: (item: TrafficPacket | TrafficSession | TrafficTCPReassembled) => any;
    fromTimestamp?: number
}