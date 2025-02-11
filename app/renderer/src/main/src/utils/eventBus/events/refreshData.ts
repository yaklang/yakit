export type RefreshDataEventProps = {
    // 通知QueryHTTPFlows轮询更新
    onRefreshQueryHTTPFlows?: string
    // 通知QueryYakScript轮询更新
    onRefreshQueryYakScript?: string
    // 通知QueryNewRisk轮询更新
    onRefreshQueryNewRisk?: string
    // 通知QuerySSARisks轮询更新
    onRefreshQuerySSARisks: string
    // 通知YakRunner轮询结构更新
    onRefreshYakRunnerFileTree: string
    // 通知CodeScan轮询更新
    onRefreshCodeScanResult: string

    // WebSocket通知
    onRefreshMessageSocket: string

    // 通知rps
    onRefreshRps?: string
    onRefreshCurRps: number
    // 通知cps
    onRefreshCps?: string
}