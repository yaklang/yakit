import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form, Space, Divider, Pagination} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, success} from "@/utils/notification"
import {RagCollectionListProps, VectorStoreCollection, Paging} from "./types"
import styles from "./RagCollectionList.module.scss"
import {OutlineRefreshIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")

export const RagCollectionList: React.FC<RagCollectionListProps> = ({
    selectedCollection,
    onSelectCollection,
    onRefresh
}) => {
    const {t} = useI18nNamespaces(["playground"])
    const [collections, setCollections] = useState<VectorStoreCollection[]>([])
    const [loading, setLoading] = useState(false)
    const [searchKeyword, setSearchKeyword] = useState<string>("")
    const [pagination, setPagination] = useState<Paging>({
        Page: 1,
        Limit: 20
    })
    const [total, setTotal] = useState(0)
    const [detailModalVisible, setDetailModalVisible] = useState(false)
    const [selectedCollectionDetail, setSelectedCollectionDetail] = useState<VectorStoreCollection>()

    // 获取向量存储集合列表
    const fetchCollections = useMemoizedFn(async (resetPage = false) => {
        setLoading(true)
        try {
            const currentPagination = resetPage ? { ...pagination, Page: 1 } : pagination
            if (resetPage) {
                setPagination(currentPagination)
            }
            
            const response = await ipcRenderer.invoke("GetAllVectorStoreCollectionsWithFilter", {
                Keyword: searchKeyword || undefined,
                Pagination: currentPagination
            })
            
            if (response && response.Collections) {
                setCollections(response.Collections)
                setTotal(response.Total || 0)
                if (response.Pagination) {
                    setPagination(response.Pagination)
                }
            } else {
                setCollections([])
                setTotal(0)
            }
        } catch (error) {
            failed(t("RagCollectionList.fetchFailed", {error: String(error)}))
            setCollections([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    })

    useEffect(() => {
        fetchCollections()
    }, [pagination.Page, pagination.Limit])

    // 搜索功能
    const handleSearch = useMemoizedFn(() => {
        fetchCollections(true)
    })

    // 分页变化
    const handlePageChange = useMemoizedFn((page: number, pageSize: number) => {
        setPagination({
            ...pagination,
            Page: page,
            Limit: pageSize
        })
    })

    // 刷新列表
    const handleRefreshList = useMemoizedFn(() => {
        fetchCollections(true)
        onRefresh()
    })

    // 查看集合详情
    const handleViewDetail = useMemoizedFn((collection: VectorStoreCollection) => {
        setSelectedCollectionDetail(collection)
        setDetailModalVisible(true)
    })

    return (
        <div className={styles["rag-collection-list"]}>
            <AutoCard
                title={t("RagCollectionList.title")}
                size="small"
                bodyStyle={{padding: 12}}
                extra={
                    <Space>
                        <YakitInput.Search
                            placeholder={t("RagCollectionList.searchPlaceholder")}
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onSearch={handleSearch}
                            style={{width: 200}}
                            size="small"
                            suffix={<OutlineSearchIcon />}
                        />
                        <YakitButton
                            type="outline1"
                            size="small"
                            icon={<OutlineRefreshIcon />}
                            onClick={handleRefreshList}
                        >
                            {t("RagCollectionList.refresh")}
                        </YakitButton>
                    </Space>
                }
            >
                <YakitSpin spinning={loading}>
                    {collections.length === 0 ? (
                        <YakitEmpty description={t("RagCollectionList.empty")}/>
                    ) : (
                        <div className={styles["collection-list"]}>
                            {collections.map((collection) => (
                                <div
                                    key={collection.ID}
                                    className={`${styles["collection-item"]} ${
                                        selectedCollection?.ID === collection.ID ? styles["selected"] : ""
                                    }`}
                                    onClick={() => onSelectCollection(collection)}
                                >
                                    <div className={styles["collection-info"]}>
                                        <div className={styles["collection-header"]}>
                                            <div className={styles["collection-name"]}>
                                                {collection.Name}
                                            </div>
                                            <YakitTag 
                                                color={(collection.VectorCount || 0) > 1000 ? "success" : 
                                                       (collection.VectorCount || 0) > 100 ? "warning" : "info"}
                                            >
                                                {t("RagCollectionList.count", {count: collection.VectorCount || 0})}
                                            </YakitTag>
                                        </div>
                                        
                                        <div className={styles["collection-details"]}>
                                            <div className={styles["detail-item"]}>
                                                <span className={styles["label"]}>{t("RagCollectionList.model")}:</span>
                                                <span className={styles["value"]}>{collection.ModelName || t("RagCollectionList.unspecified")}</span>
                                            </div>
                                            <div className={styles["detail-item"]}>
                                                <span className={styles["label"]}>{t("RagCollectionList.dimension")}:</span>
                                                <span className={styles["value"]}>{collection.Dimension || t("RagCollectionList.unknown")}</span>
                                            </div>
                                            <div className={styles["detail-item"]}>
                                                <span className={styles["label"]}>{t("RagCollectionList.distanceFunc")}:</span>
                                                <span className={styles["value"]}>{collection.DistanceFuncType || t("RagCollectionList.unspecified")}</span>
                                            </div>
                                        </div>
                                        
                                        {collection.Description && (
                                            <div className={styles["collection-description"]}>
                                                {collection.Description}
                                            </div>
                                        )}
                                        
                                        <div className={styles["collection-meta"]}>
                                            <span className={styles["created-at"]}>
                                                {t("RagCollectionList.collectionId")}: {collection.ID}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className={styles["collection-actions"]}>
                                        <YakitButton
                                            type="text2"
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleViewDetail(collection)
                                            }}
                                        >
                                            {t("RagCollectionList.detail")}
                                        </YakitButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </YakitSpin>
                
                {total > 0 && (
                    <div className={styles["pagination-wrapper"]}>
                        <Pagination
                            current={pagination.Page}
                            pageSize={pagination.Limit}
                            total={total}
                            showSizeChanger={true}
                            showQuickJumper={true}
                            showTotal={(total) => (
                                <div style={{color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>
                                    {t("RagCollectionList.totalRecords", {count: total})}
                                </div>
                            )}
                            onChange={handlePageChange}
                            pageSizeOptions={["10", "20", "50", "100"]}
                            size="small"
                        />
                    </div>
                )}
            </AutoCard>

            {/* 集合详情弹窗 */}
            <YakitModal
                title={t("RagCollectionList.detailTitle")}
                visible={detailModalVisible}
                onCancel={() => {
                    setDetailModalVisible(false)
                    setSelectedCollectionDetail(undefined)
                }}
                footer={[
                    <YakitButton key="close" onClick={() => setDetailModalVisible(false)}>
                        {t("RagCollectionList.close")}
                    </YakitButton>
                ]}
                width={700}
            >
                {selectedCollectionDetail && (
                    <div className={styles["collection-detail"]}>
                        <div className={styles["detail-section"]}>
                            <h4>{t("RagCollectionList.basicInfo")}</h4>
                            <div className={styles["detail-grid"]}>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.collectionId")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.ID}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.collectionName")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.Name}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.vectorCount")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.VectorCount}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.embeddingModel")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.ModelName || t("RagCollectionList.unspecified")}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.dimension")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.Dimension || t("RagCollectionList.unknown")}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.distanceMeasure")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.DistanceFuncType || t("RagCollectionList.unspecified")}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.mParameter")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.M || t("RagCollectionList.notSet")}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.mlParameter")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.Ml || t("RagCollectionList.notSet")}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.efSearch")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.EfSearch || t("RagCollectionList.notSet")}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>{t("RagCollectionList.efConstruct")}:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.EfConstruct || t("RagCollectionList.notSet")}</span>
                                </div>
                            </div>
                        </div>
                        
                        {selectedCollectionDetail.Description && (
                            <div className={styles["detail-section"]}>
                                <h4>{t("RagCollectionList.description")}</h4>
                                <div className={styles["description-content"]}>
                                    {selectedCollectionDetail.Description}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </YakitModal>
        </div>
    )
}
