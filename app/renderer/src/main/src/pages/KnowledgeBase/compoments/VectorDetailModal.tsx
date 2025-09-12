import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {FC, useEffect} from "react"

import styles from "../knowledgeBase.module.scss"
import {useRequest, useSafeState} from "ahooks"
import {failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"

const {ipcRenderer} = window.require("electron")

interface TVectorDetailModalProps {
    vectorDetailModalData: {
        vectorDetailModalVisible: boolean
        selectedVectorDetail: Record<string, any>
    }
    handleCloseVectorDetailModal: (preValue: {
        vectorDetailModalVisible: boolean
        selectedVectorDetail: Record<string, any>
    }) => void
    knowledgeBaseId?: number
}

const VectorDetailModal: FC<TVectorDetailModalProps> = ({
    vectorDetailModalData: {vectorDetailModalVisible, selectedVectorDetail},
    handleCloseVectorDetailModal,
    knowledgeBaseId
}) => {
    const [expand, setExpand] = useSafeState(false)
    const {data: entryDocument, run} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("GetDocumentByVectorStoreEntryID", {
                ID: selectedVectorDetail?.ID
            })
            return result?.Document
        },
        {
            manual: true,
            onError: (error) => failed(`获取文档内容失败: ${error}`)
        }
    )
    const handClose = () =>
        handleCloseVectorDetailModal({
            vectorDetailModalVisible: false,
            selectedVectorDetail 
        })

    useEffect(() => {
        selectedVectorDetail?.ID && run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedVectorDetail])

    return (
        <YakitModal
            getContainer={document.getElementById("repository-manage") || document.body}
            title='向量存储条目详情'
            visible={vectorDetailModalVisible}
            onCancel={handClose}
            maskClosable={false}
            footer={[
                <div className={styles["vector-detail-modal-footer"]} key={randomString(50)}>
                    <YakitButton key='vectorDatailClose' onClick={handClose}>
                        关闭
                    </YakitButton>
                </div>
            ]}
            width={900}
            bodyStyle={{maxHeight: "80vh", overflow: "auto"}}
        >
            <div className={styles["entry-detail"]}>
                <div>
                    <h4>基本信息</h4>
                    <div className={styles["detail-grid"]}>
                        <div className={styles["detail-row"]}>
                            <div className={styles["label"]}>条目ID:</div>
                            <div className={styles["value"]}>{selectedVectorDetail.ID}</div>
                        </div>
                        <div className={styles["detail-row"]}>
                            <div className={styles["label"]}>UID:</div>
                            <div className={styles["value"]}>{selectedVectorDetail.UID || "无"}</div>
                        </div>
                        <div className={styles["detail-row"]}>
                            <div className={styles["label"]}>集合ID:</div>
                            <div className={styles["value"]}>{knowledgeBaseId}</div>
                        </div>
                        <div className={styles["detail-row"]}>
                            <div className={styles["label"]}>向量维度:</div>
                            <div className={styles["value"]}>
                                {selectedVectorDetail.Embedding ? selectedVectorDetail.Embedding.length : 0}
                            </div>
                        </div>
                        <div className={styles["detail-row"]}>
                            <div className={styles["label"]}>内容长度:</div>
                            <div className={styles["value"]}>
                                {selectedVectorDetail.Content ? selectedVectorDetail.Content.length : 0} 字符
                            </div>
                        </div>
                        <div className={styles["detail-row"]}>
                            <div className={styles["label"]}>元数据长度:</div>
                            <div className={styles["value"]}>
                                {selectedVectorDetail.Metadata ? selectedVectorDetail.Metadata.length : 0} 字符
                            </div>
                        </div>
                    </div>
                </div>

                {selectedVectorDetail.Content && (
                    <div>
                        <h4>内容预览</h4>
                        <div className={styles["detail-section"]}>
                            <div className={styles["content-display"]}>{selectedVectorDetail.Content}</div>
                        </div>
                    </div>
                )}

                {entryDocument && (
                    <div>
                        <h4>关联知识库条目</h4>
                        <div className={styles["detail-section"]}>
                            <div className={styles["document-display"]}>
                                {entryDocument.KnowledgeTitle && (
                                    <div className={styles["row"]}>
                                        <div className={styles["title"]}>标题:</div>
                                        <div className={styles["content"]}>{entryDocument.KnowledgeTitle}</div>
                                    </div>
                                )}
                                {entryDocument.KnowledgeType && (
                                    <div className={styles["row"]}>
                                        <div className={styles["title"]}>类型:</div>
                                        <div className={styles["content"]}>{entryDocument.KnowledgeType}</div>
                                    </div>
                                )}
                                {entryDocument.Summary && (
                                    <div className={styles["row"]}>
                                        <div className={styles["title"]}>摘要:</div>
                                        <div className={styles["content"]}>{entryDocument.Summary}</div>
                                    </div>
                                )}
                                {entryDocument.Keywords && entryDocument.Keywords.length > 0 && (
                                    <div className={styles["row"]}>
                                        <div className={styles["title"]}>关键词:</div>
                                        <div className={styles["content"]}>{entryDocument.Keywords.join(", ")}</div>
                                    </div>
                                )}
                                {entryDocument.ImportanceScore !== undefined && (
                                    <div className={styles["row"]}>
                                        <div className={styles["title"]}>重要度:</div>
                                        <div className={styles["content"]}>{entryDocument.ImportanceScore}</div>
                                    </div>
                                )}
                                {entryDocument.SourcePage && (
                                    <div className={styles["row"]}>
                                        <div className={styles["title"]}>源页码:</div>
                                        <div className={styles["content"]}>{entryDocument.SourcePage}</div>
                                    </div>
                                )}
                                {entryDocument.PotentialQuestions && entryDocument.PotentialQuestions.length > 0 && (
                                    <div className={styles["row"]}>
                                        <div className={styles["title"]}>潜在问题:</div>
                                        <div className={styles["content"]}>
                                            {entryDocument.PotentialQuestions.join("; ")}
                                        </div>
                                    </div>
                                )}
                                {entryDocument.KnowledgeDetails && (
                                    <div className={styles["row"]}>
                                        <div className={styles["title"]}>详细内容:</div>
                                        <div className={styles["content"]}>{entryDocument.KnowledgeDetails}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedVectorDetail.Metadata && (
                    <div>
                        <h4>元数据</h4>
                        <div className={styles["detail-section"]}>
                            <div className={styles["metadata-display"]}>
                                <div className={styles["metadata-item"]}>
                                    <div className={styles["metadata-value"]}>{selectedVectorDetail.Metadata}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {selectedVectorDetail.Embedding && selectedVectorDetail.Embedding.length > 0 && (
                    <div>
                        <h4>向量数据 (前20维)</h4>
                        <div className={styles["detail-section"]}>
                            {expand ? (
                                <div className={styles["vector-display"]}>
                                    {selectedVectorDetail.Embedding.map((value, index) => (
                                        <YakitTag key={index} size='small'>
                                            {index}: {typeof value === "number" ? value.toFixed(6) : value}
                                        </YakitTag>
                                    ))}
                                    <YakitButton size='small' color='blue' onClick={() => setExpand(false)}>
                                        收起
                                    </YakitButton>
                                </div>
                            ) : (
                                <div className={styles["vector-display"]}>
                                    {selectedVectorDetail.Embedding.slice(0, 20).map((value, index) => (
                                        <YakitTag key={index} size='small'>
                                            {index}: {typeof value === "number" ? value.toFixed(6) : value}
                                        </YakitTag>
                                    ))}
                                    {selectedVectorDetail.Embedding.length > 20 && (
                                        <YakitButton size='small' color='blue' onClick={() => setExpand(true)}>
                                            剩余 {selectedVectorDetail.Embedding.length - 20} 维
                                        </YakitButton>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </YakitModal>
    )
}

export {VectorDetailModal}
