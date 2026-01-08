import {SoftwareVersion} from "@/utils/envfile"
import React, {Dispatch, SetStateAction} from "react"

export interface LocalEngineProps {
    ref?: React.ForwardedRef<LocalEngineLinkFuncProps>
    setLog: Dispatch<SetStateAction<string[]>>
    onLinkEngine: (params: LocalLinkParams) => void
    yakitStatus: YakitStatusType
    setYakitStatus: (v: YakitStatusType) => void
    buildInEngineVersion: string
    setRestartLoading: Dispatch<SetStateAction<boolean>>
    yakitUpdate: boolean
    setYakitUpdate: Dispatch<SetStateAction<boolean>>
}

export interface LocalEngineLinkFuncProps {
    /** 初始化并检查所有前置项后的本地连接 */
    init: (port: number) => void
    /** 检查引擎版本 */
    checkEngine: () => void
    /** 校验引擎来源 */
    checkEngineSource: (version?: string) => void
    /** 检查引擎版本后的本地连接 */
    link: (port: number) => void
}

export interface AllowSecretLocalJson {
    ok: boolean
    reason: string[]
    info: string
    host: string
    port: number
    address: string
    secret: string
    version: string
}

export interface LocalLinkParams {
    port: number
    secret?: string
}

export interface CheckAllowSecretLocal {
    port: number
    softwareVersion: SoftwareVersion
}

export interface FixupDatabase {
    softwareVersion: SoftwareVersion
}

interface FixupDatabaseJson {
    ok: boolean
    path: string[]
    info: string
}
export interface ExecResult {
    ok: boolean
    status: string
    message: string
}

export interface AllowSecretLocalExecResult extends ExecResult {
    ok: boolean
    status: string
    message: string
    json: null | AllowSecretLocalJson
}

export interface FixupDatabaseExecResult extends ExecResult {
    ok: boolean
    status: string
    message: string
    json: null | FixupDatabaseJson
}

export interface WriteEngineKeyToYakitProjects {
    version?: string
}
