import React from "react"
import {KnowledgeBaseManager} from "./KnowledgeBaseManager"

export interface KnowledgeBaseDemoProps {}

/**
 * 知识库管理演示页面
 * 使用方法：在路由中引用此组件即可
 */
export const KnowledgeBaseDemo: React.FC<KnowledgeBaseDemoProps> = (props) => {
    return (
        <div style={{ height: "100vh", width: "100%" }}>
            <KnowledgeBaseManager />
        </div>
    )
}

export default KnowledgeBaseDemo 