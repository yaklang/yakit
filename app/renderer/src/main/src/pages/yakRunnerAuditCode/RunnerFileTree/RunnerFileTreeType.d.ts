import type { FileNodeProps } from '../FileTree/FileTreeType'
export interface RunnerFileTreeProps {
  fileTreeLoad: boolean
  boxHeight: number
  /** 左侧文件树 tab 切换（规则生成时需加宽左侧并隐藏审计结果栏） */
  onActiveTabChange?: (tab: ActiveProps) => void
}

export interface OpenedFileProps {}

export type ActiveProps = 'all' | 'file' | 'rule' | 'global-filtering-function' | 'rule-generate' | 'c-headers'

export interface RiskTreeProps {
  type: 'file' | 'rule' | 'risk'
  projectName?: string
  // 点击节点的返回
  onSelectedNodes?: (v: FileNodeProps) => void
  // 是否重置树
  init?: boolean
  // 搜索内容
  search?: string
  task_id?: string
  result_id?: string
  increment?: boolean
}

export interface RuleTreeProps {}
