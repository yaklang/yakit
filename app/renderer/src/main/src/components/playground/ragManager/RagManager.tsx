import React, {useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {RagCollectionList} from "./RagCollectionList"
import {RagEntryTable} from "./RagEntryTable"
import {RagManagerProps, VectorStoreCollection} from "./types"
import styles from "./RagManager.module.scss"

export const RagManager: React.FC<RagManagerProps> = (props) => {
    const [selectedCollection, setSelectedCollection] = useState<VectorStoreCollection>()
    const [refreshKey, setRefreshKey] = useState(0)

    const handleSelectCollection = (collection: VectorStoreCollection) => {
        setSelectedCollection(collection)
    }

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className={styles["rag-manager"]}>
            <AutoCard
                title="RAG 向量存储管理"
                bodyStyle={{padding: 0, overflow: "hidden"}}
                style={{height: "100%"}}
            >
                <YakitResizeBox
                    firstNode={
                        <RagCollectionList
                            selectedCollection={selectedCollection}
                            onSelectCollection={handleSelectCollection}
                            onRefresh={handleRefresh}
                        />
                    }
                    firstMinSize="350px"
                    firstRatio="350px"
                    secondNode={
                        <RagEntryTable
                            selectedCollection={selectedCollection}
                            onRefresh={handleRefresh}
                        />
                    }
                />
            </AutoCard>
        </div>
    )
}
