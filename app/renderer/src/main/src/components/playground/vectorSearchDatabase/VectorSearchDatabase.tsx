import React, {useEffect, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {failed, info, success} from "@/utils/notification"
import {Progress, Space, Tag, Table} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {randomString} from "@/utils/randomUtil"

import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ExecResult} from "@/pages/invoker/schema"
import {Uint8ArrayToString} from "@/utils/str"
import {useGetState, useMemoizedFn} from "ahooks"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import classNames from "classnames"
import styles from "./VectorSearchDatabase.module.scss"
import {ReloadOutlined, DownloadOutlined, CheckCircleOutlined, DatabaseOutlined, DeleteOutlined} from "@ant-design/icons"

const {ipcRenderer} = window.require("electron")

export interface VectorSearchDatabaseProps {}

interface VectorStoreCollection {
    Name: string
    Status: string
    Description?: string
    DocumentCount?: number
    LastUpdated?: string
}

interface VectorStoreCollectionResponse {
    Collections: VectorStoreCollection[]
}



export const VectorSearchDatabase: React.FC<VectorSearchDatabaseProps> = React.memo((props) => {
    const [collections, setCollections] = useState<VectorStoreCollection[]>([])
    const [loading, setLoading] = useState(false)
    const [collectionReadyStates, setCollectionReadyStates] = useState<Map<string, boolean>>(new Map())
    const [initializingCollections, setInitializingCollections] = useState<Set<string>>(new Set())
    const [downloadTokens, setDownloadTokens] = useState<Map<string, string>>(new Map())
    
    // 使用 ref 保存最新的 downloadTokens，用于组件卸载时清理
    const downloadTokensRef = useRef<Map<string, string>>(new Map())
    
    // 同步 downloadTokens 到 ref
    useEffect(() => {
        downloadTokensRef.current = downloadTokens
    }, [downloadTokens])



    // 获取所有向量存储集合
    const fetchCollections = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetAllVectorStoreCollections", {})
            .then((res: VectorStoreCollectionResponse) => {
                setCollections(res.Collections || [])
            })
            .catch((e) => {
                failed(`获取向量存储集合失败: ${e}`)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    // 检查单个集合是否准备就绪
    const checkCollectionReady = useMemoizedFn(async (collectionName: string) => {
        try {
            const res = await ipcRenderer.invoke("IsSearchVectorDatabaseReady", {CollectionNames: [collectionName]})
            return res.IsReady
        } catch (e) {
            console.error(`检查集合 ${collectionName} 状态失败:`, e)
            return false
        }
    })

    // 检查所有集合的准备状态
    const checkAllCollectionsReady = useMemoizedFn(async () => {
        if (collections.length === 0) return
        
        const newReadyStates = new Map<string, boolean>()
        
        try {
            // 并行检查所有集合状态
            const checks = collections.map(async (collection) => {
                try {
                    const isReady = await checkCollectionReady(collection.Name)
                    newReadyStates.set(collection.Name, isReady)
                } catch (e) {
                    newReadyStates.set(collection.Name, false)
                }
            })
            
            await Promise.all(checks)
            setCollectionReadyStates(newReadyStates)
        } catch (e) {
            failed(`检查集合状态失败: ${e}`)
        }
    })

    // 停止下载
    const stopDownload = useMemoizedFn((collectionName: string) => {
        const token = downloadTokens.get(collectionName)
        if (!token) {
            failed(`未找到集合 ${collectionName} 的下载标识`)
            return
        }
        
        ipcRenderer.invoke("cancel-InitSearchVectorDatabase", token)
            .then(() => {
                success(`集合 ${collectionName} 下载已停止`)
                setInitializingCollections(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(collectionName)
                    return newSet
                })
                setDownloadTokens(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(collectionName)
                    return newMap
                })
            })
            .catch((e) => {
                failed(`停止下载失败: ${e}`)
            })
    })

    // 删除集合
    const deleteCollection = useMemoizedFn((collectionName: string) => {
        ipcRenderer
            .invoke("DeleteSearchVectorDatabase", {CollectionNames: [collectionName]})
            .then((res: {Ok: boolean; Reason: string}) => {
                if (res.Ok) {
                    success(`集合 ${collectionName} 删除成功`)
                    // 重新获取集合列表
                    fetchCollections()
                } else {
                    failed(`删除集合失败: ${res.Reason}`)
                }
            })
            .catch((e) => {
                failed(`删除集合失败: ${e}`)
            })
    })

    useEffect(() => {
        // 页面初始化时直接获取集合列表
        fetchCollections()
    }, [])

    // 当集合列表更新时，检查所有集合状态
    useEffect(() => {
        if (collections.length > 0) {
            checkAllCollectionsReady()
        }
    }, [collections])

    // 组件卸载时停止所有下载任务
    useEffect(() => {
        return () => {
            // 停止所有下载任务
            downloadTokensRef.current.forEach((token, collectionName) => {
                console.log(`Stopping download for collection ${collectionName} with token ${token}`)
                ipcRenderer.invoke("cancel-InitSearchVectorDatabase", token).catch(e => {
                    console.error(`Failed to stop download for collection ${collectionName}:`, e)
                })
            })
        }
    }, [])

    const columns = [
        {
            title: "集合名称",
            dataIndex: "Name",
            key: "Name",
            render: (text: string, record: VectorStoreCollection) => (
                <div className={styles["collection-info"]}>
                    <div className={styles["collection-name"]}>{text}</div>
                    {record.Description && (
                        <div className={styles["collection-description"]}>{record.Description}</div>
                    )}
                </div>
            )
        },
        {
            title: "状态",
            dataIndex: "Status",
            key: "Status",
            width: 120,
            render: (status: string, record: VectorStoreCollection) => {
                const isInitializing = initializingCollections.has(record.Name)
                const isReady = collectionReadyStates.get(record.Name)
                
                if (isInitializing) {
                    return (
                        <Tag color="processing" className={styles["status-tag"]}>
                            初始化中
                        </Tag>
                    )
                }
                
                // 如果还没有检查过状态，显示检查中
                if (isReady === undefined) {
                    return (
                        <Tag 
                            color="default" 
                            className={classNames(styles["status-tag"], styles.checking)}
                        >
                            检查中
                        </Tag>
                    )
                }
                
                return (
                    <Tag 
                        color={isReady ? "success" : "error"}
                        className={classNames(styles["status-tag"], {
                            [styles.ready]: isReady,
                            [styles.notReady]: !isReady
                        })}
                    >
                        {isReady ? "已就绪" : "未初始化"}
                    </Tag>
                )
            }
        },
        {
            title: "文档数量",
            dataIndex: "DocumentCount",
            key: "DocumentCount",
            width: 100,
            render: (count: number) => count ? count.toLocaleString() : "-"
        },
        {
            title: "最后更新",
            dataIndex: "LastUpdated",
            key: "LastUpdated",
            width: 150,
            render: (date: string) => {
                if (!date) return "-"
                return new Date(date).toLocaleString()
            }
        },
        {
            title: "操作",
            key: "action",
            width: 220,
            render: (_, record: VectorStoreCollection) => {
                const isInitializing = initializingCollections.has(record.Name)
                const isReady = collectionReadyStates.get(record.Name)
                
                return (
                    <div className={styles["action-buttons"]}>
                        {/* 正在初始化时显示停止按钮 */}
                        {isInitializing && (
                            <YakitButton
                                type="text"
                                size="small"
                                colors="danger"
                                onClick={() => stopDownload(record.Name)}
                            >
                                停止
                            </YakitButton>
                        )}
                        
                        {/* 未初始化且未在初始化时显示初始化按钮 */}
                        {!isInitializing && isReady === false && (
                            <YakitButton
                                type="text"
                                size="small"
                                onClick={() => {
                                    const m = showYakitModal({
                                        title: `初始化向量存储集合 - ${record.Name}`,
                                        width: "50%",
                                        content: (
                                            <div style={{margin: 20}}>
                                                <InitializeCollectionPrompt
                                                    collectionName={record.Name}
                                                    onFinished={() => {
                                                        m.destroy()
                                                        // 初始化完成后重新检查集合状态
                                                        setTimeout(() => {
                                                            checkAllCollectionsReady()
                                                        }, 1000)
                                                        setInitializingCollections(prev => {
                                                            const newSet = new Set(prev)
                                                            newSet.delete(record.Name)
                                                            return newSet
                                                        })
                                                        setDownloadTokens(prev => {
                                                            const newMap = new Map(prev)
                                                            newMap.delete(record.Name)
                                                            return newMap
                                                        })
                                                    }}
                                                    onStarted={(token) => {
                                                        setInitializingCollections(prev => new Set(prev).add(record.Name))
                                                        setDownloadTokens(prev => new Map(prev).set(record.Name, token))
                                                    }}
                                                />
                                            </div>
                                        ),
                                        footer: null
                                    })
                                }}
                            >
                                <DownloadOutlined />
                                初始化
                            </YakitButton>
                        )}
                        
                        {/* 已就绪时显示状态 */}
                        {!isInitializing && isReady === true && (
                            <YakitButton
                                type="text"
                                size="small"
                                colors="success"
                                disabled
                            >
                                <CheckCircleOutlined />
                                已就绪
                            </YakitButton>
                        )}
                        
                        {/* 状态检查中 */}
                        {!isInitializing && isReady === undefined && (
                            <YakitButton
                                type="text"
                                size="small"
                                disabled
                            >
                                检查中...
                            </YakitButton>
                        )}
                        
                        {/* 删除按钮 - 只有在非初始化状态时才显示 */}
                        {!isInitializing && (
                            <YakitPopconfirm
                                title={
                                    <div>
                                        <div>{`确定要删除集合 "${record.Name}" 吗？`}</div>
                                        <div style={{fontSize: 12, color: "var(--yakit-text-color-secondary)", marginTop: 4}}>
                                            删除后将无法恢复，请确认操作。
                                        </div>
                                    </div>
                                }
                                onConfirm={() => deleteCollection(record.Name)}
                            >
                                <YakitButton
                                    type="text"
                                    size="small"
                                    colors="danger"
                                >
                                    <DeleteOutlined />
                                    删除
                                </YakitButton>
                            </YakitPopconfirm>
                        )}
                    </div>
                )
            }
        }
    ]

    return (
        <div className={styles["vector-search-database"]}>
            <AutoCard
                size="small"
                bordered={true}
                title={
                                        <Space>
                        <DatabaseOutlined />
                        <div>向量搜索数据库管理</div>
                        <YakitButton
                            type="text"
                            onClick={() => {
                                fetchCollections()
                            }}
                            icon={<ReloadOutlined />}
                            loading={loading}
                        />
                    </Space>
                }
                bodyStyle={{padding: 16, overflow: "hidden", height: "100%"}}
            >

                
                {loading && collections.length === 0 ? (
                    <div style={{textAlign: "center", padding: "50px 0"}}>
                        <YakitSpin size="large" />
                        <div style={{marginTop: 16, color: "var(--yakit-text-color)"}}>
                            正在加载向量存储集合...
                        </div>
                    </div>
                ) : collections.length === 0 ? (
                    <YakitEmpty description="暂无向量存储集合" />
                ) : (
                    <Table
                        className={styles["collection-table"]}
                        dataSource={collections}
                        columns={columns}
                        rowKey="Name"
                        pagination={false}
                        loading={loading}
                        size="small"
                    />
                )}
            </AutoCard>
        </div>
    )
})



// 初始化集合组件
interface InitializeCollectionPromptProps {
    collectionName: string
    onFinished: () => void
    onStarted: (token: string) => void
}

const InitializeCollectionPrompt: React.FC<InitializeCollectionPromptProps> = React.memo((props) => {
    const [token, setToken] = useState(randomString(60))
    const [data, setData, getData] = useGetState<string[]>([])
    const [percent, setPercent] = useState(0)
    const [loading, setLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [started, setStarted] = useState(false)

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setPercent(Math.ceil(data.Progress))
                return
            }
            if (!data.IsMessage) {
                return
            }
            setData([...getData(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[InitSearchVectorDatabase] error: ${error}`)
            setHasError(true)
            setLoading(false)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setLoading(false)
            if (!hasError) {
                info(`[InitSearchVectorDatabase] 集合 ${props.collectionName} 初始化完成`)
                props.onFinished()
            }
        })
        return () => {
            ipcRenderer.invoke("cancel-InitSearchVectorDatabase", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [hasError])

    const startInitialization = useMemoizedFn(() => {
        setHasError(false)
        setStarted(true)
        props.onStarted(token)
        ipcRenderer.invoke("InitSearchVectorDatabase", {CollectionNames: [props.collectionName]}, token).then(() => {
            success(`正在初始化集合 ${props.collectionName}`)
            setLoading(true)
        })
    })

    useEffect(() => {
        return () => {
            ipcRenderer.invoke("cancel-InitSearchVectorDatabase", token)
        }
    }, [token])

    return (
        <Space direction="vertical" style={{width: "100%"}}>
            {!started ? (
                <div className={styles["form-container"]}>
                    <div style={{marginBottom: 16}}>
                        <h4>初始化集合: {props.collectionName}</h4>
                        <p style={{color: "var(--yakit-text-color-secondary)", fontSize: 14}}>
                            这将下载并初始化向量存储集合，包括相关的模型文件和索引数据。
                        </p>
                    </div>
                    <YakitButton 
                        type="primary" 
                        onClick={startInitialization}
                        size="large"
                        style={{marginBottom: 8}}
                    >
                        开始初始化集合
                    </YakitButton>
                </div>
            ) : (
                <>
                    <div style={{marginBottom: 16}}>
                        <h4>初始化集合: {props.collectionName}</h4>
                    </div>
                    <div className={styles["initialization-progress"]}>
                        <Progress
                            strokeColor="#F28B44"
                            trailColor="#F0F2F5"
                            percent={percent}
                            format={(percent) => `初始化进度 ${percent}%`}
                        />
                    </div>
                    <div className={styles["initialization-progress-messages"]}>
                        {data.map((item, index) => (
                            <p key={index}>{item}</p>
                        ))}
                    </div>
                </>
            )}
        </Space>
    )
}) 