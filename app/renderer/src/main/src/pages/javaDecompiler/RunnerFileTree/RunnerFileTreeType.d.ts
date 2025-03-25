import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"

export interface RunnerFileTreeProps {
    // JAR 文件路径
    jarPath: string
    // 文件树数据
    treeData: FileNodeProps[]
    // 是否加载中
    loading: boolean
    // 当前聚焦的节点
    focusedKey: string
    // 设置聚焦的节点
    setFocusedKey: (key: string) => void
    // 展开的节点
    expandedKeys: string[]
    // 设置展开的节点
    setExpandedKeys: (keys: string[]) => void
    // 加载文件树数据
    loadJarStructure: (url: string) => void
    // 节点加载处理
    onLoadData: (node: FileNodeProps) => Promise<void>
    // 节点选择处理
    onNodeSelect: (
        selectedKeys: string[],
        e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}
    ) => void
    // 重置操作
    resetDecompiler: () => void
    // 导入项目
    importProject: () => void
    // 导入项目并编译
    importProjectAndCompile: () => void
}
