export interface RemoteEngineProps {
    loading: boolean
    setLoading: (flag: boolean) => any
    /** 是否已经安装引擎 */
    installedEngine: boolean
    onSubmit: (info: RemoteLinkInfo) => any
    /** 取消 & 切换本地连接 */
    onSwitchLocalEngine: () => any
}

/** @name 远程连接配置参数 */
export interface RemoteLinkInfo {
    /** 是否保存为历史连接 */
    allowSave: boolean
    /** 历史连接名称 */
    linkName?: string
    /** 远程主机地址 */
    host: string
    /** 远程端口 */
    port: string
    /** 是否开启TLS */
    tls: boolean
    /** 证书 */
    caPem?: string
    password?: string
}

/** @name 本地缓存远程连接配置信息 */
export interface YakitAuthInfo {
    name: string
    host: string
    port: number
    caPem: string
    tls: boolean
    password: string
}

export interface PEMExampleProps {
    children?: any
    setShow?: (flag: boolean) => any
}
