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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")

export const RagEntryTable: React.FC<RagEntryTableProps> = ({selectedCollection, onRefresh}) => {
    const {t} = useI18nNamespaces(["playground"])
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
            failed(t("RagEntryTable.fetchFailed", {error: String(error)}))
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
                failed(t("RagEntryTable.fetchDocumentFailed", {error: String(error)}))
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
            title: t("RagEntryTable.id"),
            dataKey: "ID",
            width: 100,
            render: (text, item: VectorStoreEntry) => <div className={styles["id-cell"]}>{item.ID}</div>
        },
        {
            title: t("RagEntryTable.uid"),
            dataKey: "UID",
            width: 120,
            render: (text, item: VectorStoreEntry) => (
                <div className={styles["document-id-cell"]}>{item.UID || "-"}</div>
            )
        },
        {
            title: t("RagEntryTable.contentPreview"),
            dataKey: "Content",
            width: 300,
            render: (text, item: VectorStoreEntry) => (
                <div className={styles["content-cell"]} title={item.Content}>
                    {item.Content || "-"}
                </div>
            )
        },
        {
            title: t("RagEntryTable.metadata"),
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
                        <span className={styles["no-metadata"]}>{t("RagEntryTable.noMetadata")}</span>
                    )}
                </div>
            )
        },
        {
            title: t("RagEntryTable.vectorDimension"),
            dataKey: "VectorDimension",
            width: 100,
            render: (text, item: VectorStoreEntry) => (
                <YakitTag color='blue'>{item.Embedding ? item.Embedding.length : 0}</YakitTag>
            )
        },
        {
            title: t("RagEntryTable.createdAt"),
            dataKey: "CreatedAt",
            width: 150,
            render: (text, item: VectorStoreEntry) => <div className={styles["time-cell"]}>-</div>
        },
        {
            title: t("RagEntryTable.actions"),
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
                        title={t("RagEntryTable.viewDetail")}
                    />
                </Space>
            )
        }
    ]

    if (!selectedCollection) {
        return (
            <div className={styles["rag-entry-table"]}>
                <AutoCard title={t("RagEntryTable.title")} bodyStyle={{padding: 24}}>
                    <YakitEmpty description={t("RagEntryTable.selectCollectionFirst")} />
                </AutoCard>
            </div>
        )
    }

    return (
        <div className={styles["rag-entry-table"]}>
            <AutoCard
                title={t("RagEntryTable.titleWithCollection", {name: selectedCollection.Name})}
                size='small'
                bodyStyle={{padding: 0}}
                extra={
                    <Space>
                        <YakitInput.Search
                            placeholder={t("RagEntryTable.searchPlaceholder")}
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onSearch={handleSearch}
                            style={{width: 250}}
                            size='small'
                            suffix={<OutlineSearchIcon />}
                        />
                        <YakitTag color='blue'>{t("RagEntryTable.totalCount", {count: selectedCollection.VectorCount || 0})}</YakitTag>
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
                title={t("RagEntryTable.detailTitle")}
                visible={detailModalVisible}
                onCancel={handleCloseDetail}
                footer={[
                    <YakitButton key='close' onClick={handleCloseDetail}>
                        {t("RagEntryTable.close")}
                    </YakitButton>
                ]}
                width={900}
                bodyStyle={{maxHeight: "80vh", overflow: "auto"}}
            >
                {selectedEntryDetail && (
                    <div className={styles["entry-detail"]}>
                        <div className={styles["detail-section"]}>
                            <h4>{t("RagEntryTable.basicInfo")}</h4>
                            <div className={styles["detail-grid"]}>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagEntryTable.entryId")}:</span>
                                    <span className={styles["value"]}>{selectedEntryDetail.ID}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagEntryTable.uid")}:</span>
                                    <span className={styles["value"]}>{selectedEntryDetail.UID || t("RagEntryTable.none")}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagEntryTable.collectionId")}:</span>
                                    <span className={styles["value"]}>{selectedCollection?.ID}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagEntryTable.vectorDimension")}:</span>
                                    <span className={styles["value"]}>
                                        {selectedEntryDetail.Embedding ? selectedEntryDetail.Embedding.length : 0}
                                    </span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagEntryTable.contentLength")}:</span>
                                    <span className={styles["value"]}>
                                        {selectedEntryDetail.Content ? selectedEntryDetail.Content.length : 0} {t("RagEntryTable.characters")}
                                    </span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagEntryTable.metadataLength")}:</span>
                                    <span className={styles["value"]}>
                                        {selectedEntryDetail.Metadata ? selectedEntryDetail.Metadata.length : 0} {t("RagEntryTable.characters")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {selectedEntryDetail.Content && (
                            <div className={styles["detail-section"]}>
                                <h4>{t("RagEntryTable.contentPreview")}</h4>
                                <div className={styles["content-display"]}>{selectedEntryDetail.Content}</div>
                            </div>
                        )}

                        {entryDocument && (
                            <div className={styles["detail-section"]}>
                                <h4>{t("RagEntryTable.relatedKnowledgeEntry")}</h4>
                                <div className={styles["document-display"]}>
                                    {entryDocument.KnowledgeTitle && (
                                        <div>
                                            <strong>{t("RagEntryTable.titleLabel")}:</strong> {entryDocument.KnowledgeTitle}
                                        </div>
                                    )}
                                    {entryDocument.KnowledgeType && (
                                        <div>
                                            <strong>{t("RagEntryTable.typeLabel")}:</strong> {entryDocument.KnowledgeType}
                                        </div>
                                    )}
                                    {entryDocument.Summary && (
                                        <div>
                                            <strong>{t("RagEntryTable.summaryLabel")}:</strong> {entryDocument.Summary}
                                        </div>
                                    )}
                                    {entryDocument.KnowledgeDetails && (
                                        <div>
                                            <strong>{t("RagEntryTable.detailsLabel")}:</strong>
                                            <br />
                                            {entryDocument.KnowledgeDetails}
                                        </div>
                                    )}
                                    {entryDocument.Keywords && entryDocument.Keywords.length > 0 && (
                                        <div>
                                            <strong>{t("RagEntryTable.keywordsLabel")}:</strong> {entryDocument.Keywords.join(", ")}
                                        </div>
                                    )}
                                    {entryDocument.ImportanceScore !== undefined && (
                                        <div>
                                            <strong>{t("RagEntryTable.importanceLabel")}:</strong> {entryDocument.ImportanceScore}
                                        </div>
                                    )}
                                    {entryDocument.SourcePage && (
                                        <div>
                                            <strong>{t("RagEntryTable.sourcePageLabel")}:</strong> {entryDocument.SourcePage}
                                        </div>
                                    )}
                                    {entryDocument.PotentialQuestions &&
                                        entryDocument.PotentialQuestions.length > 0 && (
                                            <div>
                                                <strong>{t("RagEntryTable.potentialQuestionsLabel")}:</strong> {entryDocument.PotentialQuestions.join("; ")}
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}

                        {selectedEntryDetail.Metadata && (
                            <div className={styles["detail-section"]}>
                                <h4>{t("RagEntryTable.metadata")}</h4>
                                <div className={styles["metadata-display"]}>
                                    <div className={styles["metadata-item"]}>
                                        <span className={styles["metadata-value"]}>{selectedEntryDetail.Metadata}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedEntryDetail.Embedding && selectedEntryDetail.Embedding.length > 0 && (
                            <div className={styles["detail-section"]}>
                                <h4>{t("RagEntryTable.vectorDataFirst20")}</h4>
                                <div className={styles["vector-display"]}>
                                    {selectedEntryDetail.Embedding.slice(0, 20).map((value, index) => (
                                        <YakitTag key={index} size='small'>
                                            {index}: {typeof value === "number" ? value.toFixed(6) : value}
                                        </YakitTag>
                                    ))}
                                    {selectedEntryDetail.Embedding.length > 20 && (
                                        <YakitTag size='small' color='blue'>
                                            {t("RagEntryTable.moreDimensions", {count: selectedEntryDetail.Embedding.length - 20})}
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
