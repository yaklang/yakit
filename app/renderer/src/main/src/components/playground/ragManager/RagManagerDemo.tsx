import React from "react"
import {RagManager} from "./RagManager"

export interface RagManagerDemoProps {}

/**
 * RAG 向量存储管理演示页面
 * 用于管理和查看向量存储集合及其条目
 */
export const RagManagerDemo: React.FC<RagManagerDemoProps> = (props) => {
    return (
        <div style={{ height: "100vh", width: "100%" }}>
            <RagManager />
        </div>
    )
}

export default RagManagerDemo
