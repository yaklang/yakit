import type { SoftwareVersion } from '@/utils/envfile'
import type { Dispatch, SetStateAction } from 'react'
import type React from 'react'

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
  /** 开始连接本地引擎 */
  startYakEngine: () => void
  /** 检查引擎版本后的本地连接 */
  link: (port: number) => void
}

export interface AllowSecretLocalJson {
  launchId?: string
  ok: boolean
  reason: string[]
  info: string
  host: string
  port: number
  address: string
  secret: string
  version: string
  phase?: string
  elapsedMs?: number
  phaseI18n?: { zh: string; en: string } | null
  reasonI18n?: { zh: string; en: string } | null
}

export interface LocalLinkParams {
  launchId?: string
  port: number
  secret?: string
}

export interface CheckAllowSecretLocal {
  policy?: 'auto' | 'ipc' | 'tcp'
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
export interface EngineEvent {
  type: 'ready' | 'failed' | 'log_ok'
  schemaVersion?: number
  address?: string
  transport?: string
  instanceId?: string
  engineVersion?: string
  phase?: string
  reason?: string
  reasonCode?: string
  elapsedMs?: number
  version?: string
  phaseI18n?: { zh: string; en: string } | null
  reasonI18n?: { zh: string; en: string } | null
}

export interface ExecResult {
  instance?: LocalEngineInstance
  fallback?: boolean
  attempts?: ExecResult[]
  ok: boolean
  status: string
  stage?: 'check' | 'start' | 'connect'
  message: string
  engineEvent?: EngineEvent | null
}

export interface AllowSecretLocalExecResult extends ExecResult {
  json: null | AllowSecretLocalJson
  engineEvent?: EngineEvent | null
}

export interface FixupDatabaseExecResult extends ExecResult {
  json: null | FixupDatabaseJson
}

export interface WriteEngineKeyToYakitProjects {
  version?: string
}

export interface ReclaimDatabaseSpace {
  dbPath: string[]
}
