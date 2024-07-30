// Map存储审计树结构详情
export const auditChildMap: Map<string, string[]> = new Map()

export const setMapAuditChildDetail = (id: string, info: string[]) => {
    auditChildMap.set(id, info)
}

export const getMapAuditChildDetail = (id: string) => {
    return auditChildMap.get(id)||[]
}

export const getMapAllAuditChildValue = () => {
    return Array.from(auditChildMap.values())
}

export const getMapAllAuditChildKey = () => {
    return Array.from(auditChildMap.keys())
}

export const clearMapAuditChildDetail = () => {
    auditChildMap.clear()
}

export const removeMapAuditChildDetail = (id: string) => {
    auditChildMap.delete(id)
}

export const hasMapAuditChildDetail = (id) => {
    return auditChildMap.has(id);
}