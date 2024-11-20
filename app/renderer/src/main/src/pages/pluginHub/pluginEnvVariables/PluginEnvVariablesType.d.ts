import {KVPair} from "@/models/kv"

export interface PluginEnvVariablesProps {
    /** 是否为插件详情页面的环境变量 */
    isPlugin?: boolean
    /** 插件详情页面的环境变量名 */
    keys?: string[]
}

export interface PluginEnvInfo extends KVPair {
    /** 是否在本地数据库中存在 */
    isLocal: boolean
}

export interface PluginEnvData {
    Env: KVPair[]
}

export interface QueryPluginEnvRequest {
    Key: string[]
}

export interface DeletePluginEnvRequest {
    Key?: string
    All?: boolean
}
