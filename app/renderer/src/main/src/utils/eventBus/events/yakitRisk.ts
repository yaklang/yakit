export type YakitRiskProps = {
    /** 刷新risk页面表格数据 */
    onRefRiskList?: string
    /** 刷新risk页面 统计 数据 */
    onRefRiskFieldGroup?: string
    /** 指定筛选漏洞等级 */
    specifyVulnerabilityLevel: string

    /** 刷新audit risk页面 统计 数据 */
    onRefAuditRiskFieldGroup?: string
    
}
