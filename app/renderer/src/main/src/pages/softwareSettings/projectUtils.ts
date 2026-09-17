import type { GrpcOutput } from '@/services/ipc'
import { grpcPagingToUI, int64ToSafeNumber } from '@/utils/int64'
import type { QueryGeneralRequest } from '../invoker/schema'
import { isIRify } from '@/utils/envfile'
import type { YaklangEngineMode } from '@/yakitGVDefine'

export const getEnvTypeByProjects = () => {
  return isIRify() ? 'ssa_project' : 'project'
}

export interface ProjectManageProp {
  engineMode: YaklangEngineMode
  onEngineModeChange: (mode: YaklangEngineMode, keepalive?: boolean) => any
  onFinish: () => any
  projectListRefreshTrigger?: number
}
/** (新建|编辑)项目|文件夹参数 */
export interface ProjectParamsProps {
  Id?: number | string
  ProjectName: string
  Description?: string
  Type: string
  FolderId?: number | string
  ChildFolderId?: number | string
  Database?: string
  ExternalModule?: string
  ExternalProjectCode?: string
}
/** 项目列表查询条件 */
export interface ProjectParamsProp extends QueryGeneralRequest {
  ProjectName?: string
  Description?: string
  Type: string
  FolderId?: number | string
  ChildFolderId?: number | string
  FrontendType?: 'project' | 'ssa_project'
  AfterUpdatedAt?: number
}
/** 单条项目数据 */
export interface ProjectDescription {
  Id: number | string
  ProjectName: string
  Description: string
  DatabasePath: string
  CreatedAt: number
  UpdateAt: number
  FolderId: number | string
  FolderName: string
  ChildFolderId: number | string
  ChildFolderName: string
  Type: string
  FileSize: string
  ExternalModule: string
  ExternalProjectCode: string
  OnlineSubTaskID: string
}
export interface ProjectsResponse {
  Pagination: { Page: number; Limit: number }
  Projects: ProjectDescription[]
  Total: number
  TotalPage: number
  ProjectToTal: number
}

export interface ExportProjectProps {
  Id: number | string
  ProjectName: string
  Password: string
}

/** 文件夹级联组件节点属性 */
export interface FileProjectInfoProps extends ProjectDescription {
  children?: ProjectDescription[]
  isLeaf?: boolean
  loading?: boolean
}

export interface ProjectIOProgress {
  TargetPath: string
  Percent: number
  Verbose: string
}

export function projectsForUI(value: GrpcOutput<'GetProjects'>): ProjectsResponse {
  return {
    ...value,
    Projects: value.Projects.map((project) => ({
      ...project,
      CreatedAt: int64ToSafeNumber(project.CreatedAt),
      UpdateAt: int64ToSafeNumber(project.UpdateAt),
    })),
    Pagination: grpcPagingToUI(value.Pagination),
    Total: int64ToSafeNumber(value.Total),
    TotalPage: int64ToSafeNumber(value.TotalPage),
    ProjectToTal: int64ToSafeNumber(value.ProjectToTal),
  }
}

export function projectForUI(value: GrpcOutput<'GetCurrentProjectEx'>): ProjectDescription {
  return { ...value, CreatedAt: int64ToSafeNumber(value.CreatedAt), UpdateAt: int64ToSafeNumber(value.UpdateAt) }
}
