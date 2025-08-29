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

const {ipcRenderer} = window.require("electron")

export const RagCollectionList: React.FC<RagCollectionListProps> = ({
    selectedCollection,
    onSelectCollection,
    onRefresh
}) => {
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
            failed(`获取向量存储集合失败: ${error}`)
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
                title="RAG 向量存储集合"
                size="small"
                bodyStyle={{padding: 12}}
                extra={
                    <Space>
                        <YakitInput.Search
                            placeholder="搜索集合名称"
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
                            刷新
                        </YakitButton>
                    </Space>
                }
            >
                <YakitSpin spinning={loading}>
                    {collections.length === 0 ? (
                        <YakitEmpty description="暂无向量存储集合" />
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
                                                {collection.VectorCount || 0} 条
                                            </YakitTag>
                                        </div>
                                        
                                        <div className={styles["collection-details"]}>
                                            <div className={styles["detail-item"]}>
                                                <span className={styles["label"]}>模型:</span>
                                                <span className={styles["value"]}>{collection.ModelName || "未指定"}</span>
                                            </div>
                                            <div className={styles["detail-item"]}>
                                                <span className={styles["label"]}>维度:</span>
                                                <span className={styles["value"]}>{collection.Dimension || "未知"}</span>
                                            </div>
                                            <div className={styles["detail-item"]}>
                                                <span className={styles["label"]}>距离函数:</span>
                                                <span className={styles["value"]}>{collection.DistanceFuncType || "未指定"}</span>
                                            </div>
                                        </div>
                                        
                                        {collection.Description && (
                                            <div className={styles["collection-description"]}>
                                                {collection.Description}
                                            </div>
                                        )}
                                        
                                        <div className={styles["collection-meta"]}>
                                            <span className={styles["created-at"]}>
                                                集合ID: {collection.ID}
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
                                            详情
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
                            showTotal={(total, range) => `共 ${total} 条记录`}
                            onChange={handlePageChange}
                            pageSizeOptions={["10", "20", "50", "100"]}
                            size="small"
                        />
                    </div>
                )}
            </AutoCard>

            {/* 集合详情弹窗 */}
            <YakitModal
                title="向量存储集合详情"
                visible={detailModalVisible}
                onCancel={() => {
                    setDetailModalVisible(false)
                    setSelectedCollectionDetail(undefined)
                }}
                footer={[
                    <YakitButton key="close" onClick={() => setDetailModalVisible(false)}>
                        关闭
                    </YakitButton>
                ]}
                width={700}
            >
                {selectedCollectionDetail && (
                    <div className={styles["collection-detail"]}>
                        <div className={styles["detail-section"]}>
                            <h4>基本信息</h4>
                            <div className={styles["detail-grid"]}>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>集合ID:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.ID}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>集合名称:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.Name}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>向量数量:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.VectorCount}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>嵌入模型:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.ModelName || "未指定"}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>向量维度:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.Dimension || "未知"}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>距离度量:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.DistanceFuncType || "未指定"}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>M参数:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.M || "未设置"}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>Ml参数:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.Ml || "未设置"}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>EfSearch:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.EfSearch || "未设置"}</span>
                                </div>
                                <div className={styles["detail-row"]}>
                                    <span className={styles["label"]}>EfConstruct:</span>
                                    <span className={styles["value"]}>{selectedCollectionDetail.EfConstruct || "未设置"}</span>
                                </div>
                            </div>
                        </div>
                        
                        {selectedCollectionDetail.Description && (
                            <div className={styles["detail-section"]}>
                                <h4>描述信息</h4>
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
