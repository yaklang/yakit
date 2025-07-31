import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {KnowledgeBaseList} from "./KnowledgeBaseList"
import {KnowledgeEntryTable} from "./KnowledgeEntryTable"
import {KnowledgeBase, KnowledgeBaseManagerProps} from "./types"
import styles from "./KnowledgeBaseManager.module.scss"

const {ipcRenderer} = window.require("electron")

export const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = (props) => {
    const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase>()
    const [refreshKey, setRefreshKey] = useState(0)

    const handleSelectKb = (kb: KnowledgeBase) => {
        setSelectedKnowledgeBase(kb)
    }

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className={styles["knowledge-base-manager"]}>
            <AutoCard
                title="知识库管理"
                bodyStyle={{padding: 0, overflow: "hidden"}}
                style={{height: "100%"}}
            >
                <YakitResizeBox
                    firstNode={
                        <KnowledgeBaseList
                            selectedKbId={selectedKnowledgeBase?.Id}
                            onSelectKb={handleSelectKb}
                            onRefresh={handleRefresh}
                        />
                    }
                    firstMinSize="300px"
                    firstRatio="300px"
                    secondNode={
                        <KnowledgeEntryTable
                            knowledgeBase={selectedKnowledgeBase}
                            onRefresh={handleRefresh}
                        />
                    }
                />
            </AutoCard>
        </div>
    )
} 