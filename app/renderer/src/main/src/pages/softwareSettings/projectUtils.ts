import type { QueryGeneralRequest } from '../invoker/schema'
import { isIRify } from '@/utils/envfile'
import type { YaklangEngineMode } from '@/yakitGVDefine'
import type { API } from '@/services/swagger/resposeType'

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

/** 企业版web配置过滤 */
export const judgeProjectConfig = (eeSystemConfig: API.SystemConfigList[]) => {
  if (isIRify()) {
    const config: { key: string; name: string }[] = []
    eeSystemConfig.forEach((item) => {
      if (item.configName === 'projectConfig' && item.content) {
        try {
          JSON.parse(item.content).forEach((configItem) => {
            config.push(configItem)
          })
        } catch (error) {}
      }
    })
    return config
  }
  return []
}