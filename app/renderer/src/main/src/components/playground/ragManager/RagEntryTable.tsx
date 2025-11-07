import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {Space} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed} from "@/utils/notification"
import {RagEntryTableProps, VectorStoreEntry, Paging} from "./types"
import styles from "./RagEntryTable.module.scss"
import {OutlineSearchIcon, OutlineEyeIcon} from "@/assets/icon/outline"

const {ipcRenderer} = window.require("electron")

export const RagEntryTable: React.FC<RagEntryTableProps> = ({selectedCollection, onRefresh}) => {
    const [entries, setEntries] = useState<VectorStoreEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [searchKeyword, setSearchKeyword] = useState("")
    const [total, setTotal] = useState(0)
    const [pagination, setPagination] = useState<Paging>({
        Page: 1,
        Limit: 20,
        OrderBy: "id",
        Order: "desc"
    })
    const [detailModalVisible, setDetailModalVisible] = useState(false)
    const [selectedEntryDetail, setSelectedEntryDetail] = useState<VectorStoreEntry>()
    const [entryDocument, setEntryDocument] = useState<any>(null)

    // 获取向量存储条目列表
    const fetchEntries = useMemoizedFn(async () => {
        if (!selectedCollection) {
            setEntries([])
            setTotal(0)
            return
        }

        setLoading(true)
        try {
            const response = await ipcRenderer.invoke("ListVectorStoreEntries", {
                CollectionID: selectedCollection.ID,
                Keyword: searchKeyword || undefined,
                Pagination: pagination
            })

            if (response && response.Entries) {
                setEntries(response.Entries)
                setTotal(response.Total || 0)
            } else {
                setEntries([])
                setTotal(0)
            }
        } catch (error) {
            failed(`获取向量存储条目失败: ${error}`)
            setEntries([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    })

    useEffect(() => {
        fetchEntries()
    }, [selectedCollection, searchKeyword, pagination])

    // 搜索功能
    const handleSearch = useMemoizedFn((value: string) => {
        setSearchKeyword(value)
        setPagination((prev) => ({...prev, Page: 1}))
    })

    // 查看条目详情
    const handleViewDetail = useMemoizedFn(async (entry: VectorStoreEntry) => {
        setSelectedEntryDetail(entry)
        setDetailModalVisible(true)

        // 获取条目的完整文档内容
        if (entry.ID) {
            try {
                const response = await ipcRenderer.invoke("GetDocumentByVectorStoreEntryID", {
                    ID: entry.ID
                })
                setEntryDocument(response.Document || null)
            } catch (error) {
                failed(`获取文档内容失败: ${error}`)
                setEntryDocument(null)
            }
        }
    })

    // 关闭详情弹窗
    const handleCloseDetail = useMemoizedFn(() => {
        setDetailModalVisible(false)
        setSelectedEntryDetail(undefined)
        setEntryDocument(null)
    })

    const columns: ColumnsTypeProps[] = [
        {
            title: "ID",
            dataKey: "ID",
            width: 100,
            render: (text, item: VectorStoreEntry) => <div className={styles["id-cell"]}>{item.ID}</div>
        },
        {
            title: "UID",
            dataKey: "UID",
            width: 120,
            render: (text, item: VectorStoreEntry) => (
                <div className={styles["document-id-cell"]}>{item.UID || "-"}</div>
            )
        },
        {
            title: "内容预览",
            dataKey: "Content",
            width: 300,
            render: (text, item: VectorStoreEntry) => (
                <div className={styles["content-cell"]} title={item.Content}>
                    {item.Content || "-"}
                </div>
            )
        },
        {
            title: "元数据",
            dataKey: "Metadata",
            width: 200,
            render: (text, item: VectorStoreEntry) => (
                <div className={styles["metadata-cell"]}>
                    {item.Metadata ? (
                        <div className={styles["metadata-tags"]}>
                            <YakitTag size='small'>
                                {item.Metadata.substring(0, 20)}
                                {item.Metadata.length > 20 ? "..." : ""}
                            </YakitTag>
                        </div>
                    ) : (
                        <span className={styles["no-metadata"]}>无元数据</span>
                    )}
                </div>
            )
        },
        {
            title: "向量维度",
            dataKey: "VectorDimension",
            width: 100,
            render: (text, item: VectorStoreEntry) => (
                <YakitTag color='blue'>{item.Embedding ? item.Embedding.length : 0}</YakitTag>
            )
        },
        {
            title: "创建时间",
            dataKey: "CreatedAt",
            width: 150,
            render: (text, item: VectorStoreEntry) => <div className={styles["time-cell"]}>-</div>
        },
        {
            title: "操作",
            dataKey: "actions",
            width: 100,
            fixed: "right",
            render: (text, item: VectorStoreEntry) => (
                <Space>
                    <YakitButton
                        type='text2'
                        size='small'
                        icon={<OutlineEyeIcon />}
                        onClick={() => handleViewDetail(item)}
                        title='查看详情'
                    />
                </Space>
            )
        }
    ]

    if (!selectedCollection) {
        return (
            <div className={styles["rag-entry-table"]}>
                <AutoCard title='RAG 向量条目' bodyStyle={{padding: 24}}>
                    <YakitEmpty description='请先选择一个向量存储集合' />
                </AutoCard>
            </div>
        )
    }

    return (
        <div className={styles["rag-entry-table"]}>
            <AutoCard
                title={`RAG 向量条目 - ${selectedCollection.Name}`}
                size='small'
                bodyStyle={{padding: 0}}
                extra={
                    <Space>
                        <YakitInput.Search
                            placeholder='搜索条目内容...'
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onSearch={handleSearch}
                            style={{width: 250}}
                            size='small'
                            suffix={<OutlineSearchIcon />}
                        />
                        <YakitTag color='blue'>共 {selectedCollection.VectorCount} 条</YakitTag>
                    </Space>
                }
            >
                <TableVirtualResize<VectorStoreEntry>
                    loading={loading}
                    columns={columns}
                    data={entries}
                    renderKey='ID'
                    isRefresh={false}
                    pagination={{
                        page: pagination.Page,
                        limit: pagination.Limit,
                        total: total,
                        onChange: (page, limit) => {
                            setPagination((prev) => ({
                                ...prev,
                                Page: page,
                                Limit: limit || prev.Limit
                            }))
                        }
                    }}
                />
            </AutoCard>

            {/* 条目详情弹窗 */}
            <YakitModal
                title='向量存储条目详情'
                visible={detailModalVisible}
                onCancel={handleCloseDetail}
                footer={[
                    <YakitButton key='close' onClick={handleCloseDetail}>
                        关闭
                    </YakitButton>
                ]}
                width={900}
                bodyStyle={{maxHeight: "80vh", overflow: "auto"}}
            >
                {selectedEntryDetail && (
                    <div className={styles["entry-detail"]}>
                        <div className={styles["detail-section"]}>
                            <h4>基本信息</h4>
                            <div className={styles["detail-grid"]}>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>条目ID:</span>
                                    <span className={styles["value"]}>{selectedEntryDetail.ID}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>UID:</span>
                                    <span className={styles["value"]}>{selectedEntryDetail.UID || "无"}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>集合ID:</span>
                                    <span className={styles["value"]}>{selectedCollection?.ID}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>向量维度:</span>
                                    <span className={styles["value"]}>
                                        {selectedEntryDetail.Embedding ? selectedEntryDetail.Embedding.length : 0}
                                    </span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>内容长度:</span>
                                    <span className={styles["value"]}>
                                        {selectedEntryDetail.Content ? selectedEntryDetail.Content.length : 0} 字符
                                    </span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>元数据长度:</span>
                                    <span className={styles["value"]}>
                                        {selectedEntryDetail.Metadata ? selectedEntryDetail.Metadata.length : 0} 字符
                                    </span>
                                </div>
                            </div>
                        </div>

                        {selectedEntryDetail.Content && (
                            <div className={styles["detail-section"]}>
                                <h4>内容预览</h4>
                                <div className={styles["content-display"]}>{selectedEntryDetail.Content}</div>
                            </div>
                        )}

                        {entryDocument && (
                            <div className={styles["detail-section"]}>
                                <h4>关联知识库条目</h4>
                                <div className={styles["document-display"]}>
                                    {entryDocument.KnowledgeTitle && (
                                        <div>
                                            <strong>标题:</strong> {entryDocument.KnowledgeTitle}
                                        </div>
                                    )}
                                    {entryDocument.KnowledgeType && (
                                        <div>
                                            <strong>类型:</strong> {entryDocument.KnowledgeType}
                                        </div>
                                    )}
                                    {entryDocument.Summary && (
                                        <div>
                                            <strong>摘要:</strong> {entryDocument.Summary}
                                        </div>
                                    )}
                                    {entryDocument.KnowledgeDetails && (
                                        <div>
                                            <strong>详细内容:</strong>
                                            <br />
                                            {entryDocument.KnowledgeDetails}
                                        </div>
                                    )}
                                    {entryDocument.Keywords && entryDocument.Keywords.length > 0 && (
                                        <div>
                                            <strong>关键词:</strong> {entryDocument.Keywords.join(", ")}
                                        </div>
                                    )}
                                    {entryDocument.ImportanceScore !== undefined && (
                                        <div>
                                            <strong>重要度:</strong> {entryDocument.ImportanceScore}
                                        </div>
                                    )}
                                    {entryDocument.SourcePage && (
                                        <div>
                                            <strong>源页码:</strong> {entryDocument.SourcePage}
                                        </div>
                                    )}
                                    {entryDocument.PotentialQuestions &&
                                        entryDocument.PotentialQuestions.length > 0 && (
                                            <div>
                                                <strong>潜在问题:</strong> {entryDocument.PotentialQuestions.join("; ")}
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}

                        {selectedEntryDetail.Metadata && (
                            <div className={styles["detail-section"]}>
                                <h4>元数据</h4>
                                <div className={styles["metadata-display"]}>
                                    <div className={styles["metadata-item"]}>
                                        <span className={styles["metadata-value"]}>{selectedEntryDetail.Metadata}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedEntryDetail.Embedding && selectedEntryDetail.Embedding.length > 0 && (
                            <div className={styles["detail-section"]}>
                                <h4>向量数据 (前20维)</h4>
                                <div className={styles["vector-display"]}>
                                    {selectedEntryDetail.Embedding.slice(0, 20).map((value, index) => (
                                        <YakitTag key={index} size='small'>
                                            {index}: {typeof value === "number" ? value.toFixed(6) : value}
                                        </YakitTag>
                                    ))}
                                    {selectedEntryDetail.Embedding.length > 20 && (
                                        <YakitTag size='small' color='blue'>
                                            ... 还有 {selectedEntryDetail.Embedding.length - 20} 维
                                        </YakitTag>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </YakitModal>
        </div>
    )
}
