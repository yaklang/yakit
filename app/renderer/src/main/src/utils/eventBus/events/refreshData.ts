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

    // 通知QueryAIMemoryEntity轮询更新
    onRefreshQueryAIMemoryEntity: string

    // WebSocket通知
    onRefreshMessageSocket: string

    // 通知rps
    onRefreshRps?: string
    onRefreshCurRps: number
    // 通知cps
    onRefreshCps?: string
    // 通知本地规则管理
    onRefreshRuleManagement?: string

    // 知识库-知识表
    onKnowledgeBaseEntry: string
    // 知识库-向量表
    onVectorStoreDocument: string
    // 知识库-实体表
    onErModelRelationship: string

    // mitm 染色规则提示
    onMitmRuleMoreLimt?: string
}
