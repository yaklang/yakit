import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakRunnerScanHistoryPageInfoProps } from '@/store/pageInfo'
import { SSAProjectResponse } from '@/pages/yakRunnerAuditCode/AuditCode/AuditCodeType'
import {
  activateSSAProjectDatabase,
  resolveLatestSSAProgramLocation,
} from '@/pages/yakRunnerAuditCode/ssaProjectDatabase'
import { useIrifyCurrentSSAProjectStore } from '@/store/irifyCurrentSSAProject'
import { failed } from '@/utils/notification'

const { ipcRenderer } = window.require('electron')

export const normalizeSSAProjectResponse = (raw: Record<string, any>): SSAProjectResponse => {
  const p = raw || {}
  const databasePath = p.DatabasePath ?? p.database_path ?? ''
  const resolvedPath = p.ResolvedDatabasePath ?? p.resolved_database_path ?? ''
  const defaultPath = p.DefaultDatabasePath ?? p.default_database_path ?? ''
  return {
    ...p,
    CreateAt: p.CreateAt ?? p.CreatedAt ?? 0,
    UpdateAt: p.UpdateAt ?? p.UpdatedAt ?? 0,
    RiskNumber: p.RiskNumber ?? 0,
    CompileTimes: p.CompileTimes ?? 0,
    URL: p.URL ?? '',
    DatabasePath: databasePath,
    ResolvedDatabasePath: resolvedPath,
    DefaultDatabasePath: defaultPath,
  } as SSAProjectResponse
}

const normalizePath = (path?: string) => (path || '').trim()

export const hasDedicatedSSADatabase = (record: SSAProjectResponse) => {
  const dbPath = normalizePath(record.DatabasePath)
  if (!dbPath) {
    return false
  }
  const defaultPath = normalizePath(record.DefaultDatabasePath)
  const resolved = normalizePath(record.ResolvedDatabasePath)
  const ref = defaultPath || resolved
  if (ref && (dbPath === ref || dbPath.endsWith('default-yakssa.db'))) {
    return false
  }
  return true
}

/** 独立库 sqlite 路径（优先 profile 中的 DatabasePath，一般为 …/yakit-projects/ssa-projects/…） */
export const getDedicatedDatabaseDisplayPath = (record: SSAProjectResponse) => {
  return (
    normalizePath(record.DatabasePath) ||
    normalizePath(record.ResolvedDatabasePath) ||
    normalizePath(record.DefaultDatabasePath)
  )
}

export const getDefaultDatabaseDisplayPath = (record: SSAProjectResponse) => {
  return record.DefaultDatabasePath?.trim() || record.ResolvedDatabasePath?.trim() || ''
}

export const IRIFY_DEFAULT_PROJECT_NAME = '[default]'
export const IRIFY_TEMPORARY_PROJECT_NAME = '[temporary]'

/** UI bind mode for CreateSSAProject.DatabaseBindMode (matches ypb.SSAProjectDatabaseBindMode). */
export type SSAProjectDatabaseBindModeUI = 'auto' | 'shared' | 'dedicated'

export type SSAProjectPoolUI = 'auto' | 'shared' | 'dedicated'

export const toSSAProjectListPoolGRPC = (pool?: SSAProjectPoolUI): number => {
  switch (pool) {
    case 'shared':
      return 1
    case 'dedicated':
      return 2
    default:
      return 0
  }
}

export const getAuditModalLabels = (
  mode: SSAProjectDatabaseBindModeUI | undefined,
  t: (key: string, opts?: { defaultValue?: string }) => string,
) => {
  if (mode === 'dedicated') {
    return {
      title: t('AuditCode.addDedicatedProject', { defaultValue: '添加项目' }),
      submit: t('AuditCode.addDedicatedProject', { defaultValue: '添加项目' }),
    }
  }
  return {
    title: t('AuditCode.addProject', { defaultValue: '添加项目' }),
    submit: t('AuditCode.addProject', { defaultValue: '添加项目' }),
  }
}

export const toSSAProjectDatabaseBindModeGRPC = (mode?: SSAProjectDatabaseBindModeUI): number => {
  switch (mode) {
    case 'shared':
      return 1
    case 'dedicated':
      return 2
    default:
      return 0
  }
}

/** Profile 库项目：默认库 / 临时库，SSA 编译数据混存在同一 IR 库 */
export const isIRifySharedSchemaProject = (projectName?: string) => {
  const name = (projectName || '').trim()
  return name === IRIFY_DEFAULT_PROJECT_NAME || name === IRIFY_TEMPORARY_PROJECT_NAME
}

/** Switch active profile to [default] and open shared default IR database. */
export const linkIRifyDefaultProfile = async (): Promise<boolean> => {
  try {
    const res = await ipcRenderer.invoke('GetDefaultProjectEx', { Type: 'ssa_project' })
    if (!res?.Id) {
      failed('无法获取默认数据库')
      return false
    }
    await ipcRenderer.invoke('SetCurrentProject', { Id: +res.Id, Type: 'ssa_project' })
    useIrifyCurrentSSAProjectStore.getState().clearCurrent()
    await activateSSAProjectDatabase(0)
    emiter.emit('onGetProjectInfo')
    emiter.emit('onRefreshSSAProjectList')
    return true
  } catch (error) {
    failed(`链接默认数据库失败: ${error}`)
    return false
  }
}

export const openIRifyDefaultProfileCodeScan = async () => {
  const ok = await linkIRifyDefaultProfile()
  if (!ok) {
    return
  }
  emiter.emit('openPage', JSON.stringify({ route: YakitRoute.YakRunner_Code_Scan }))
}

export const getCurrentSSAProfileName = async (): Promise<string> => {
  try {
    const res = await ipcRenderer.invoke('GetCurrentProjectEx', { Type: 'ssa_project' })
    return (res?.ProjectName ?? '').trim()
  } catch {
    return ''
  }
}

/** 已在临时库、独立 Profile 或独立 SSA IR 上下文中时，打开规则管理无需切换 Profile/库 */
export const shouldStayOnCurrentProfileForRuleManagement = async (): Promise<boolean> => {
  const name = await getCurrentSSAProfileName()
  if (name === IRIFY_TEMPORARY_PROJECT_NAME) {
    return true
  }
  if (name && !isIRifySharedSchemaProject(name)) {
    return true
  }
  if (useIrifyCurrentSSAProjectStore.getState().current) {
    return true
  }
  if (name === IRIFY_DEFAULT_PROJECT_NAME) {
    return true
  }
  return false
}

export type OpenIRifyRuleManagementOptions = {
  /** 项目管理侧栏、首页等外部入口：仅在非临时/非独立场景下才链到 [default] */
  fromExternal?: boolean
}

/** 打开规则管理：不强制绑定默认库；仅在「外部进入」且当前无有效 Profile 时链到 [default] */
export const openIRifyRuleManagement = async (options?: OpenIRifyRuleManagementOptions): Promise<boolean> => {
  const stay = await shouldStayOnCurrentProfileForRuleManagement()
  if (!stay && options?.fromExternal) {
    const ok = await linkIRifyDefaultProfile()
    if (!ok) {
      return false
    }
  }
  emiter.emit('openPage', JSON.stringify({ route: YakitRoute.Rule_Management }))
  return true
}

/** @deprecated 使用 openIRifyRuleManagement({ fromExternal: true }) */
export const openIRifyDefaultProfileRuleManagement = () => openIRifyRuleManagement({ fromExternal: true })

/** 打开项目历史（编译/扫描记录）；独立库下限定当前 SSA 项目 */
export const openIRifyScanHistory = async (options?: { scopedToCurrentDedicatedProject?: boolean }) => {
  const pageParams: YakRunnerScanHistoryPageInfoProps = {
    Programs: [],
    ProjectIds: [],
  }
  if (options?.scopedToCurrentDedicatedProject) {
    const current = useIrifyCurrentSSAProjectStore.getState().current
    if (!current?.id) {
      failed('请先从「设置 → 项目管理 → 外部审计项目」打开一个独立数据库项目')
      return false
    }
    try {
      await activateSSAProjectDatabase(current.id)
    } catch (error) {
      failed(`切换 SSA 数据库失败: ${error}`)
      return false
    }
    pageParams.ProjectIds = [current.id]
    pageParams.Programs = [current.projectName]
  }
  emiter.emit(
    'openPage',
    JSON.stringify({
      route: YakitRoute.YakRunner_ScanHistory,
      params: pageParams,
    }),
  )
  return true
}

export const openIRifySSAProject = async (record: SSAProjectResponse, onDone?: () => void) => {
  const projectId = parseInt(String(record.ID || 0))
  const databasePath = getDedicatedDatabaseDisplayPath(record)
  const dedicated = hasDedicatedSSADatabase(record)

  try {
    if (dedicated && projectId > 0) {
      await activateSSAProjectDatabase(projectId)
      useIrifyCurrentSSAProjectStore.getState().setCurrentFromRecord(record)
    } else {
      useIrifyCurrentSSAProjectStore.getState().clearCurrent()
      await activateSSAProjectDatabase(0)
    }
  } catch (error) {
    failed(`切换 SSA 数据库失败: ${error}`)
    return
  }

  const programLocation = projectId > 0 ? await resolveLatestSSAProgramLocation(projectId) : undefined
  const location = programLocation || ''

  emiter.emit(
    'openPage',
    JSON.stringify({
      route: YakitRoute.YakRunner_Audit_Code,
      params: {
        Schema: 'syntaxflow',
        Path: '/',
        Location: location,
        leftTabActive: 'file',
        ssaProjectId: projectId > 0 ? projectId : undefined,
        projectManageName: record.ProjectName,
        databaseBindMode: dedicated ? 'dedicated' : 'shared',
        databasePath: dedicated ? databasePath || undefined : getDefaultDatabaseDisplayPath(record) || undefined,
      },
    }),
  )
  onDone?.()
}

/** 独立数据库 Profile 下从侧栏打开「代码审计」，默认加载最新编译 */
export const openIRifyAuditCodeForDedicated = async (): Promise<boolean> => {
  const current = useIrifyCurrentSSAProjectStore.getState().current
  if (!current?.id) {
    return false
  }
  try {
    await activateSSAProjectDatabase(current.id)
  } catch (error) {
    failed(`切换 SSA 数据库失败: ${error}`)
    return true
  }
  const programLocation = await resolveLatestSSAProgramLocation(current.id)
  emiter.emit(
    'openPage',
    JSON.stringify({
      route: YakitRoute.YakRunner_Audit_Code,
      params: {
        Schema: 'syntaxflow',
        Path: '/',
        Location: programLocation || '',
        leftTabActive: 'file',
        ssaProjectId: current.id,
        projectManageName: current.projectName,
        databaseBindMode: 'dedicated',
        databasePath: current.databasePath || undefined,
      },
    }),
  )
  return true
}
