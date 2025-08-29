import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {KnowledgeBaseList} from "./KnowledgeBaseList"
import {KnowledgeEntryTable} from "./KnowledgeEntryTable"
import {KnowledgeBaseQA} from "./KnowledgeBaseQA"
import {KnowledgeBase, KnowledgeBaseManagerProps} from "./types"
import styles from "./KnowledgeBaseManager.module.scss"
import {OutlineChatalt2Icon} from "@/assets/icon/outline"

const {ipcRenderer} = window.require("electron")

export const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = (props) => {
    const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase>()
    const [refreshKey, setRefreshKey] = useState(0)
    const [qaDrawerVisible, setQaDrawerVisible] = useState(false)

    const handleSelectKb = (kb: KnowledgeBase) => {
        setSelectedKnowledgeBase(kb)
    }

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1)
    }

    const handleOpenQADrawer = () => {
        if (!selectedKnowledgeBase) {
            // 可以添加提示用户先选择知识库
            return
        }
        setQaDrawerVisible(true)
    }

    const handleCloseQADrawer = () => {
        setQaDrawerVisible(false)
    }

    return (
        <div className={styles["knowledge-base-manager"]}>
            <AutoCard
                title="知识库管理"
                bodyStyle={{padding: 0, overflow: "hidden"}}
                style={{height: "100%"}}
                extra={
                    selectedKnowledgeBase && (
                        <YakitButton
                            type="primary"
                            size="small"
                            icon={<OutlineChatalt2Icon />}
                            onClick={handleOpenQADrawer}
                        >
                            AI问答
                        </YakitButton>
                    )
                }
            >
                <YakitResizeBox
                    firstNode={
                        <KnowledgeBaseList
                            selectedKbId={selectedKnowledgeBase?.ID}
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

            {/* AI问答抽屉 */}
            <YakitDrawer
                title={`AI问答 - ${selectedKnowledgeBase?.KnowledgeBaseName || "知识库"}`}
                placement="right"
                width={600}
                visible={qaDrawerVisible}
                onClose={handleCloseQADrawer}
                bodyStyle={{padding: 0}}
            >
                <KnowledgeBaseQA
                    knowledgeBase={selectedKnowledgeBase}
                    onRefresh={handleRefresh}
                />
            </YakitDrawer>
        </div>
    )
} 