import {v4 as uuidv4} from "uuid"
import { GraphInfoProps } from "./RightAuditDetail"
export const GraphInfoMap: Map<string, GraphInfoProps> = new Map()

export const setMapGraphInfoDetail = (nodeId: string, info: GraphInfoProps) => {
    GraphInfoMap.set(nodeId, info)
}

export const getMapGraphInfoDetail = (nodeId: string) => {
    return (
        GraphInfoMap.get(nodeId)
    )
}

export const getMapAllGraphInfoValue = () => {
    return Array.from(GraphInfoMap.values())
}

export const getMapAllGraphInfoKey = () => {
    return Array.from(GraphInfoMap.keys())
}

export const getMapAllGraphInfoSize = () => {
    return GraphInfoMap.size
}

export const clearMapGraphInfoDetail = () => {
    GraphInfoMap.clear()
}

export const removeMapGraphInfoDetail = (nodeId: string) => {
    GraphInfoMap.delete(nodeId)
}