import { GraphInfoProps } from "./RightAuditDetail"

// Map审计结果详情列表
export const resultMap: Map<string, GraphInfoProps[]> = new Map()

export const setMapResultDetail = (_id: string, info: GraphInfoProps[]) => {
    resultMap.set(_id, info)
}

export const getMapResultDetail = (_id: string) => {
    return resultMap.get(_id)||[]
}

export const getMapAllResultValue = () => {
    return Array.from(resultMap.values())
}

export const getMapAllResultKey = () => {
    return Array.from(resultMap.keys())
}

export const clearMapResultDetail = () => {
    resultMap.clear()
}

export const removeMapResultDetail = (_id: string) => {
    resultMap.delete(_id)
}

export const hasMapResultDetail = (_id) => {
    return resultMap.has(_id);
}