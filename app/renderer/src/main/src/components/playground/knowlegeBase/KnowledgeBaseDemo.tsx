import React from "react"
import {KnowledgeBaseManager} from "./KnowledgeBaseManager"

export const KnowledgeBaseDemo: React.FC = () => {
    return (
        <div style={{height: "100vh", padding: "16px"}}>
            <KnowledgeBaseManager />
        </div>
    )
}

export default KnowledgeBaseDemo