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
  Id?: number
  ProjectName: string
  Description?: string
  Type: string
  FolderId?: number
  ChildFolderId?: number
  Database?: string
  ExternalModule?: string
  ExternalProjectCode?: string
}
/** 项目列表查询条件 */
export interface ProjectParamsProp extends QueryGeneralRequest {
  ProjectName?: string
  Description?: string
  Type: string
  FolderId?: number
  ChildFolderId?: number
  FrontendType?: 'project' | 'ssa_project'
  AfterUpdatedAt?: number
}
/** 单条项目数据 */
export interface ProjectDescription {
  Id: number
  ProjectName: string
  Description: string
  DatabasePath: string
  CreatedAt: number
  UpdateAt: number
  FolderId: number
  FolderName: string
  ChildFolderId: number
  ChildFolderName: string
  Type: string
  FileSize: string
  ExternalModule: string
  ExternalProjectCode: string
  OnlineSubTaskID: string
}
/** 在文件夹里新建/导入时的目录：一级文件夹 → (自己, 0)，二级文件夹 → (一级, 自己) */
export const resolveParentFolderIds = (parent: Pick<ProjectDescription, 'Id' | 'FolderId'>) =>
  +parent.FolderId === 0
    ? { FolderId: +parent.Id, ChildFolderId: 0 }
    : { FolderId: +parent.FolderId, ChildFolderId: +parent.Id }

/** 文件夹最多两级：只有一级文件夹（FolderId 为 0）下能再建子文件夹 */
export const canCreateSubFolder = (folder: Pick<ProjectDescription, 'FolderId'>) => +folder.FolderId === 0

/** 新建/导入成功后的目录：undefined 留在当前目录，[] 回根目录，否则进入所选文件夹 */
export const getSubmitFolderState = (
  folders: Pick<ProjectDescription, 'Id' | 'ProjectName'>[] | undefined,
  params: ProjectParamsProp,
): { files?: Pick<ProjectDescription, 'Id' | 'ProjectName' | 'FolderId'>[]; params: ProjectParamsProp } => {
  const Pagination = { ...params.Pagination, Page: 1 }
  if (!folders) return { params: { ...params, Pagination } }
  const [first, second] = folders
  return {
    // 二级文件夹的 FolderId 是一级文件夹 id
    files: folders.map((f, i) => ({ Id: +f.Id, ProjectName: f.ProjectName, FolderId: i ? +first.Id : 0 })),
    params: {
      Type: 'all',
      Pagination,
      FolderId: first ? +first.Id : undefined,
      ChildFolderId: second ? +second.Id : undefined,
    },
  }
}

export interface ProjectsResponse {
  Pagination: { Page: number; Limit: number }
  Projects: ProjectDescription[]
  Total: number
  TotalPage: number
  ProjectToTal: number
}

export interface ExportProjectProps {
  Id: number
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
