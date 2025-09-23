export interface RunnerFileTreeProps {
    fileTreeLoad: boolean
    boxHeight: number
}

export interface OpenedFileProps {}

export type ActiveProps = "all" | "file" | "rule" | "global-filtering-function"

export interface RiskTreeProps {
    type: "file" | "rule" | "risk"
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
