import {v4 as uuidv4} from "uuid"
import {AuditNodeMapProps} from "../AuditCodeType"
import {YakURLResource} from "@/pages/yakURLTree/data"
export const auditMap: Map<string, AuditNodeMapProps> = new Map()

export const setMapAuditDetail = (id: string, info: AuditNodeMapProps) => {
    auditMap.set(id, info)
}

export const getMapAuditDetail = (id: string): AuditNodeMapProps => {
    return (
        auditMap.get(id) || {
            parent: null,
            name: "读取失败",
            isLeaf: true,
            id: `${uuidv4()}-fail`,
            ResourceType: "",
            VerboseType: "",
            Size: 0,
            Extra:[]
        }
    )
}

export const getMapAllAuditValue = () => {
    return Array.from(auditMap.values())
}

export const getMapAllAuditKey = () => {
    return Array.from(auditMap.keys())
}

export const getMapAllAuditSize = () => {
    return auditMap.size
}

export const clearMapAuditDetail = () => {
    auditMap.clear()
}

export const removeMapAuditDetail = (id: string) => {
    auditMap.delete(id)
}
