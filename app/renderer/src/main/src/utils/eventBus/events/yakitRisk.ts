export type YakitRiskProps = {
    /** 刷新risk页面表格数据 */
    onRefRiskList?: string
    /** 刷新risk页面 统计 数据 */
    onRefRiskFieldGroup?: string
    /** 指定筛选漏洞等级 */
    specifyVulnerabilityLevel: string

    /** 刷新audit risk页面 统计 数据 */
    onRefAuditRiskFieldGroup?: string
    
    /** 以下为审计漏洞 */
    auditHoleVulnerabilityLevel: string
    /** 刷新审计risk页面表格数据 */
    onRefAuditRiskList?: string
}
