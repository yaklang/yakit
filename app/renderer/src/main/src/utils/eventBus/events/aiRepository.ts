export type YakKnowledgeRepositoryEventProps = {
    // 知识库 一级页面关闭事件
    onCloseKnowledgeRepository?: string
    // ai agent 页面知识库传递参数
    selectedKnowledge: string

    // {
    //     type: string[]
    //     id: string
    // }
}
