export interface ReverseNotification {
    uuid: string
    type: string
    remote_addr: string
    raw?: Uint8Array
    token?: string
    timestamp?: number
}
export const BRIDGE_ADDR = "yak-bridge-addr"
export const BRIDGE_SECRET = "yak-bridge-secret"
export const DNSLOG_INHERIT_BRIDGE = "yakit-DNSLOG_INHERIT_BRIDGE"
export const DNSLOG_ADDR = "yak-dnslog-addr"
export const DNSLOG_SECRET = "yak-dnslog-secret"
