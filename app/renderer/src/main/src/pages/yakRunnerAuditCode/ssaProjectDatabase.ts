import { genDefaultPagination } from '@/pages/invoker/schema'
import { apiQuerySSAPrograms } from '@/pages/yakRunnerScanHistory/utils'
import { AuditCodePageInfoProps } from '@/store/pageInfo'
import { resolveSSAProjectIdByName } from './utils'

const { ipcRenderer } = window.require('electron')

/** 通过 QuerySSAPrograms + ProjectIds 打开对应 SSA 项目的 IR 数据库（0 表示默认/共享 IR 库） */
export const activateSSAProjectDatabase = async (projectId: number): Promise<void> => {
  const ids = projectId > 0 ? [projectId] : [0]
  await ipcRenderer.invoke('QuerySSAPrograms', {
    Filter: { ProjectIds: ids },
    Pagination: genDefaultPagination(1, 1),
  })
}

export const isDedicatedAuditPage = (pageInfo?: Pick<AuditCodePageInfoProps, 'databaseBindMode'>): boolean => {
  return pageInfo?.databaseBindMode === 'dedicated'
}

/** 取项目下最近一次编译的 program 名（审计树路径须用 program 名，不能用项目管理名） */
export const resolveLatestSSAProgramLocation = async (projectId: number): Promise<string | undefined> => {
  if (projectId <= 0) {
    return undefined
  }
  const res = await apiQuerySSAPrograms({
    Filter: { ProjectIds: [projectId] },
    Pagination: { ...genDefaultPagination(1, 1), OrderBy: 'updated_at', Order: 'desc' },
  })
  const name = res?.Data?.[0]?.Name?.trim()
  return name || undefined
}

/** 将项目管理名或历史 Location 解析为 IR program 名；无编译记录时返回 undefined */
export const resolveProgramLocationForProject = async (
  projectId: number,
  hint?: string,
  projectManageName?: string,
): Promise<string | undefined> => {
  if (projectId <= 0) {
    return undefined
  }
  const latest = await resolveLatestSSAProgramLocation(projectId)
  if (latest) {
    return latest
  }
  const hintTrim = hint?.trim()
  if (!hintTrim) {
    return undefined
  }
  const manage = projectManageName?.trim()
  if (manage && hintTrim === manage) {
    return undefined
  }
  const res = await apiQuerySSAPrograms({
    Filter: { ProjectIds: [projectId], ProgramNames: [hintTrim] },
    Pagination: genDefaultPagination(1, 1),
  })
  return res?.Data?.[0]?.Name?.trim() || undefined
}

/** 根据 pageInfo 生成审计树 Location（program 名） */
export const resolveAuditCodePageLocation = async (
  pageInfo: Pick<AuditCodePageInfoProps, 'Location' | 'ssaProjectId' | 'projectManageName'>,
): Promise<string | undefined> => {
  const projectId = pageInfo.ssaProjectId || 0
  const manageName = pageInfo.projectManageName?.trim()
  const loc = pageInfo.Location?.trim()
  if (projectId <= 0) {
    if (!loc) {
      return undefined
    }
    const pid = await resolveSSAProjectIdByName(loc)
    if (pid > 0) {
      return resolveProgramLocationForProject(pid, loc, loc)
    }
    return loc
  }
  return resolveProgramLocationForProject(projectId, loc, manageName || loc)
}

/** 拉取当前 SSA 项目下的编译 program 列表（用于「最近编译」菜单） */
export const fetchRecentCompileProgramsForProject = async (
  projectId: number,
  limit = 30,
): Promise<{ path: string; name: string }[]> => {
  if (projectId <= 0) {
    return []
  }
  const res = await apiQuerySSAPrograms({
    Filter: { ProjectIds: [projectId] },
    Pagination: { ...genDefaultPagination(limit, 1), OrderBy: 'updated_at', Order: 'desc' },
  })
  return (res?.Data || [])
    .map((p) => p?.Name?.trim())
    .filter((name): name is string => !!name)
    .map((name) => ({ path: `/${name}`, name }))
}
