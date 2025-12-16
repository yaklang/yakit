interface GetTunnelServerExternalIPParams {
    Addr: string
    Secret: string
}

export interface StartFacadeServerParams {
    IsRemote: boolean
    BridgeParam: GetTunnelServerExternalIPParams
    ReversePort: number
    ReverseHost: string
}
