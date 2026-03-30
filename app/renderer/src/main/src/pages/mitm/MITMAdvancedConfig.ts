import {RemoteMitmGV} from "@/enums/mitm"
import {KVPair} from "@/models/kv"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {JSONParseLog} from "@/utils/tool"
import {RemoteGV} from "@/yakitGV"
import {MITMConsts} from "./MITMConsts"
import type {ClientCertificate} from "./MITMServerStartForm/MITMServerStartForm"
import type {ExtraMITMServerProps} from "./MITMPage"

interface AdvancedConfigurationFromValue {
    certs: ClientCertificate[]
    preferGMTLS: boolean
    onlyEnableGMTLS: boolean
    enableProxyAuth: boolean
    proxyUsername: string
    proxyPassword: string
    dnsServers: string[]
    etcHosts: KVPair[]
    EnableHostsMappingBeforeDownstreamProxy: boolean
    filterWebsocket: boolean
    disableCACertPage: boolean
    DisableSystemProxy: boolean
    DisableWebsocketCompression: boolean
    PluginConcurrency: number
    OverwriteSNI: boolean
    SNI: string
    SNIMapping: {Key: string; Value: string}[]
    stateSecretHijacking?: string
}

const defaultDnsServers = ["8.8.8.8", "114.114.114.114"]

interface RemoteFieldConfig {
    key: string
    field: keyof AdvancedConfigurationFromValue
    read: (raw: string) => unknown
}

const parseBoolean = (raw: string) => raw === "true"
const parseNumber = (raw: string, defaultValue: number) => (raw ? Number(raw) : defaultValue)
const parseJSON = <T>(raw: string, defaultValue: T): T => {
    if (!raw) {
        return defaultValue
    }
    try {
        return JSON.parse(raw) as T
    } catch {
        return defaultValue
    }
}

const parseCerts = (raw: string) => {
    try {
        return JSONParseLog(raw, {page: "MITMAdvancedConfig", fun: "certs"}) as ClientCertificate[]
    } catch {
        return []
    }
}

const parseSNI = (raw: string, defaults = createDefaultAdvancedConfig()) => {
    const sniValue = parseJSON(raw, {
        OverwriteSNI: defaults.OverwriteSNI,
        SNI: defaults.SNI,
        SNIMapping: defaults.SNIMapping
    })

    return {
        OverwriteSNI:
            typeof sniValue.OverwriteSNI === "boolean" ? sniValue.OverwriteSNI : sniValue.OverwriteSNI === "true",
        SNI: sniValue.SNI || "",
        SNIMapping: Array.isArray(sniValue.SNIMapping) && sniValue.SNIMapping.length ? sniValue.SNIMapping : defaults.SNIMapping
    }
}

//DefFieldsVal
const createDefaultAdvancedConfig = (): AdvancedConfigurationFromValue => ({
    certs: [],
    preferGMTLS: false,
    onlyEnableGMTLS: false,
    enableProxyAuth: false,
    proxyUsername: "",
    proxyPassword: "",
    dnsServers: [...defaultDnsServers],
    etcHosts: [],
    EnableHostsMappingBeforeDownstreamProxy: false,
    filterWebsocket: false,
    disableCACertPage: false,
    DisableSystemProxy: false,
    DisableWebsocketCompression: false,
    PluginConcurrency: 20,
    OverwriteSNI: false,
    SNI: "",
    SNIMapping: [{Key: "", Value: ""}]
})

const configKey = RemoteMitmGV.MitmAdvancedConfig

const fieldConfigs: RemoteFieldConfig[] = [
    {field: "certs", key: MITMConsts.MITMDefaultClientCertificates, read: parseCerts},
    {field: "preferGMTLS", key: MITMConsts.MITMDefaultPreferGMTLS, read: parseBoolean},
    {field: "onlyEnableGMTLS", key: MITMConsts.MITMDefaultOnlyEnableGMTLS, read: parseBoolean},
    {field: "enableProxyAuth", key: MITMConsts.MITMDefaultEnableProxyAuth, read: parseBoolean},
    {field: "proxyUsername", key: MITMConsts.MITMDefaultProxyUsername, read: (raw) => raw},
    {field: "proxyPassword", key: MITMConsts.MITMDefaultProxyPassword, read: (raw) => raw},
    {field: "dnsServers", key: MITMConsts.MITMDefaultDnsServers, read: (raw) => parseJSON(raw, [...defaultDnsServers])},
    {field: "etcHosts", key: MITMConsts.MITMDefaultEtcHosts, read: (raw) => parseJSON(raw, [])},
    {
        field: "EnableHostsMappingBeforeDownstreamProxy",
        key: RemoteGV.MITMEnableHostsMappingBeforeDownstreamProxy,
        read: parseBoolean
    },
    {field: "filterWebsocket", key: MITMConsts.MITMDefaultFilterWebsocket, read: parseBoolean},
    {field: "disableCACertPage", key: RemoteGV.MITMDisableCACertPage, read: parseBoolean},
    {field: "DisableSystemProxy", key: RemoteGV.MITMDisableSystemProxy, read: parseBoolean},
    {field: "DisableWebsocketCompression", key: RemoteGV.MITMDisableWebsocketCompression, read: parseBoolean},
    {field: "PluginConcurrency", key: RemoteGV.MITMPluginConcurrency, read: (raw) => parseNumber(raw, 20)}
]

const normalizeConfig = (value?: Partial<AdvancedConfigurationFromValue> | null): AdvancedConfigurationFromValue => {
    const defaults = createDefaultAdvancedConfig()
    const merged = {
        ...defaults,
        ...(value || {})
    }

    return {
        ...merged,
        certs: Array.isArray(merged.certs) ? merged.certs : defaults.certs,
        dnsServers: Array.isArray(merged.dnsServers) ? merged.dnsServers : defaults.dnsServers,
        etcHosts: Array.isArray(merged.etcHosts) ? merged.etcHosts : defaults.etcHosts,
        SNIMapping: Array.isArray(merged.SNIMapping) && merged.SNIMapping.length ? merged.SNIMapping : defaults.SNIMapping,
        SNI: merged.SNI || ""
    }
}

const parseConfig = (raw: string): AdvancedConfigurationFromValue | null => {
    if (!raw) {
        return null
    }
    try {
        return normalizeConfig(JSON.parse(raw))
    } catch {
        return null
    }
}

const loadLegacyConfig = async (): Promise<AdvancedConfigurationFromValue> => {
    const defaults = createDefaultAdvancedConfig()
    const fields: Partial<AdvancedConfigurationFromValue> = {}

    await Promise.all(
        fieldConfigs.map(async ({field, key, read}) => {
            fields[field] = read((await getRemoteValue(key)) || "") as never
        })
    )

    return normalizeConfig({
        ...defaults,
        ...fields,
        ...parseSNI(await getRemoteValue(RemoteMitmGV.MitmSNI), defaults)
    })
}

const loadAdvancedConfig = async (): Promise<AdvancedConfigurationFromValue> => {
    //先取全局配置 MitmAdvancedConfig 没有则单个取然后给MitmAdvancedConfig存个值
    const raw = await getRemoteValue(configKey)
    const value = parseConfig(raw)
    if (value) {
        return value
    }

    const legacyValue = await loadLegacyConfig()
    setRemoteValue(configKey, JSON.stringify(legacyValue))
    return legacyValue
}

const saveAdvancedConfig = (values: AdvancedConfigurationFromValue) => {
    const value = normalizeConfig(values)
    setRemoteValue(configKey, JSON.stringify(value))
    setRemoteValue(
        RemoteMitmGV.MitmSNI,
        JSON.stringify({
            OverwriteSNI: value.OverwriteSNI,
            SNI: value.SNI,
            SNIMapping: value.SNIMapping
        })
    )
}

const buildMitmExtra = (params: AdvancedConfigurationFromValue): ExtraMITMServerProps => {
    const {
      onlyEnableGMTLS,
      preferGMTLS,
      enableProxyAuth,
      proxyUsername,
      proxyPassword,
      dnsServers,
      etcHosts,
      EnableHostsMappingBeforeDownstreamProxy,
      filterWebsocket,
      disableCACertPage,
      DisableSystemProxy,
      DisableWebsocketCompression,
      PluginConcurrency,
      OverwriteSNI,
      SNI,
      SNIMapping,
      stateSecretHijacking
    } = params
    const extra: ExtraMITMServerProps = {
        onlyEnableGMTLS,
        preferGMTLS,
        enableProxyAuth,
        proxyUsername,
        proxyPassword,
        dnsServers,
        hosts: etcHosts,
        EnableHostsMappingBeforeDownstreamProxy,
        filterWebsocket,
        disableCACertPage,
        DisableSystemProxy,
        DisableWebsocketCompression,
        PluginConcurrency,
        OverwriteSNI,
        SNI: OverwriteSNI ? SNI : "",
        SNIMapping: (SNIMapping || []).filter(({Key}) => Key && Key.trim())
    }

    if (stateSecretHijacking === "enableGMTLS") {
        extra.enableGMTLS = true
    } else if (stateSecretHijacking === "randomJA3") {
        extra.RandomJA3 = true
    }

    return extra
}

const buildMitmExtraV2 = (extra?: ExtraMITMServerProps) => {
    if (!extra || Object.keys(extra).length === 0) {
        return undefined
    }

    const {
      enableGMTLS,
      RandomJA3,
      enableProxyAuth,
      onlyEnableGMTLS,
      preferGMTLS,
      proxyPassword,
      proxyUsername,
      dnsServers,
      hosts,
      EnableHostsMappingBeforeDownstreamProxy,
      filterWebsocket,
      disableCACertPage,
      DisableSystemProxy,
      DisableWebsocketCompression,
      PluginConcurrency,
      OverwriteSNI,
      SNI,
      SNIMapping
    } = extra

    return {
        EnableGMTLS: enableGMTLS,
        RandomJA3,
        EnableProxyAuth: enableProxyAuth,
        OnlyEnableGMTLS: onlyEnableGMTLS,
        PreferGMTLS: preferGMTLS,
        ProxyPassword: proxyPassword,
        ProxyUsername: proxyUsername,
        DnsServers: dnsServers,
        HostsMapping: hosts,
        EnableHostsMappingBeforeDownstreamProxy,
        FilterWebsocket: filterWebsocket,
        DisableCACertPage: disableCACertPage,
        DisableSystemProxy,
        DisableWebsocketCompression,
        PluginConcurrency,
        OverwriteSNI,
        SNI,
        SNIMapping
    }
}

export type {
    AdvancedConfigurationFromValue
}

export {
    createDefaultAdvancedConfig,
    loadAdvancedConfig,
    saveAdvancedConfig,
    buildMitmExtra,
    buildMitmExtraV2
}