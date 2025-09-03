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
    const [qaQueryAllCollectionsDefault, setQaQueryAllCollectionsDefault] = useState<boolean>(true)

    const handleSelectKb = (kb: KnowledgeBase) => {
        setSelectedKnowledgeBase(kb)
    }

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1)
    }

    const handleOpenQADrawer = (queryAllCollectionsDefault: boolean) => {
        setQaQueryAllCollectionsDefault(queryAllCollectionsDefault)
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
                    <YakitButton
                        type="primary"
                        size="small"
                        icon={<OutlineChatalt2Icon />}
                        onClick={() => handleOpenQADrawer(true)}
                    >
                        AI问答
                    </YakitButton>
                }
            >
                <YakitResizeBox
                    firstNode={
                        <KnowledgeBaseList
                            selectedKbId={selectedKnowledgeBase?.ID}
                            onSelectKb={handleSelectKb}
                            onRefresh={handleRefresh}
                            onOpenQA={(kb, queryAll) => {
                                setSelectedKnowledgeBase(kb)
                                setQaQueryAllCollectionsDefault(queryAll)
                                setQaDrawerVisible(true)
                            }}
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
                bodyStyle={{padding: 0, height: "100%", display: "flex", flexDirection: "column"}}
            >
                <KnowledgeBaseQA
                    knowledgeBase={selectedKnowledgeBase}
                    onRefresh={handleRefresh}
                    queryAllCollectionsDefault={qaQueryAllCollectionsDefault}
                />
            </YakitDrawer>
        </div>
    )
} 