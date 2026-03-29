import React, {useEffect, useMemo, useRef, useState} from "react"
import {Button, Space, Table, Tag, Form, Typography, Descriptions, Tooltip, Menu, Card, Tabs, Input, Select} from "antd"
import {
    genDefaultPagination,
    PaginationSchema,
    QueryGeneralRequest,
    QueryGeneralResponse
} from "../../../pages/invoker/schema"
import {useGetState, useMemoizedFn} from "ahooks"
import {
    ReloadOutlined,
    SearchOutlined,
    DatabaseOutlined,
    NodeIndexOutlined,
    FileTextOutlined,
    EyeOutlined,
    CodeOutlined
} from "@ant-design/icons"
import {failed} from "../../../utils/notification"
import {showModal} from "../../../utils/showModal"
import {InputItem} from "../../../utils/inputUtil"
import {ExportExcel} from "../../DataExport/DataExport"
import {onRemoveToolFC} from "../../../utils/deleteTool"
import {showByContextMenu} from "../../functionTemplate/showByContext"
import styles from "./EntityRepository.module.scss"
import {instance} from "@viz-js/viz"
import {a} from "@/alibaba/ali-react-table-dist/dist/chunks/ali-react-table-pipeline-2201dfe0.esm"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")
const {Paragraph, Title} = Typography
const {TabPane} = Tabs

const GraphComponent = ({dot}) => {
    const {t} = useI18nNamespaces(["playground"])
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true // 处理组件卸载后的异步操作

        const render = async () => {
            if (!dot || !containerRef.current) return

            setLoading(true)
            setError(null)

            try {
                // 获取 Viz 实例
                const viz = await instance()

                // 渲染 SVG
                const svg = viz.renderSVGElement(dot, {})

                const container = containerRef.current
                if (!container) return
                container.innerHTML = ""
                container.appendChild(svg)
            } catch (e) {
                console.error(e)
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        render()

        return () => {
            isMounted = false // 组件卸载时，设置标志位
        }
    }, [dot]) // 当 dot 字符串变化时，重新渲染
    return (
        <div style={{textAlign: "center"}}>
            {loading && <p>{t("EntityRepositoryPage.messages.loadingGraph")}</p>}
            {error && <pre style={{color: "red"}}>{t("EntityRepositoryPage.messages.graphError", {error})}</pre>}

            {/* 这个 div 是一个“黑盒”，React 只负责创建它，
                不会干涉它的子元素，因为内部没有 JSX */}
            <div ref={containerRef} />
        </div>
    )
}

// Entity Repository Types
export interface EntityRepository {
    ID: number
    Name: string
    Description: string
    HiddenIndex: string
}

export interface Entity {
    ID: number
    BaseIndex: string
    Type: string
    Name: string
    Description: string
    BaseID: number
    Attributes: KVPair[]
    Rationale: string
    HiddenIndex: string
}

export interface Relationship {
    ID: number
    Type: string
    SourceEntityID: number
    TargetEntityID: number
    Attributes: KVPair[]
    Rationale: string
    SourceEntityIndex: string
    TargetEntityIndex: string
}

export interface KVPair {
    Key: string
    Value: string
}

export interface EntityFilter {
    BaseID?: number
    BaseIndex?: string
    IDs?: number[]
    Types?: string[]
    Names?: string[]
}

export interface RelationshipFilter {
    BaseID?: number
    BaseIndex?: string
    IDs?: number[]
    Types?: string[]
    // 废弃
    SourceEntityIDs?: number[]
    TargetEntityIDs?: number[]
    AboutEntityIDs?: number[]
    // 建议
    SourceEntityIndex?: string[]
    TargetEntityIndex?: string[]
    AboutEntityIndex?: string[]
}

export interface QueryEntityRequest extends QueryGeneralRequest {
    Filter?: EntityFilter
}

export interface QueryRelationshipRequest extends QueryGeneralRequest {
    Filter?: RelationshipFilter
}

export interface QueryEntityResponse {
    Entities: Entity[]
    Pagination: PaginationSchema
    Total: number
}
export interface QueryRelationshipResponse {
    Relationships: Relationship[]
    Pagination: PaginationSchema
    Total: number
}
export interface ListEntityRepositoryResponse {
    EntityRepositories: EntityRepository[]
}

export interface GenerateERMDotRequest {
    Filter?: EntityFilter
    Depth?: number
}

export interface GenerateERMDotResponse {
    Dot: string
}

export const EntityRepositoryPage: React.FC = () => {
    const {t} = useI18nNamespaces(["playground"])
    const [activeTab, setActiveTab] = useState("repositories")
    const [repositories, setRepositories] = useState<EntityRepository[]>([])
    const [entities, setEntities] = useState<Entity[]>([])
    const [relationships, setRelationships] = useState<Relationship[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedRepository, setSelectedRepository] = useState<EntityRepository | null>(null)
    const [ermDot, setErmDot] = useState<string>("")
    const [ermDepth, setErmDepth] = useState<number>(2)
    const [selectedEntityIds, setSelectedEntityIds] = useState<number[]>([])
    const [ermViewMode, setErmViewMode] = useState<"svg" | "dot">("svg")

    // Pagination states
    const [entityPagination, setEntityPagination] = useState<PaginationSchema>(genDefaultPagination(20))
    const [relationshipPagination, setRelationshipPagination] = useState<PaginationSchema>(genDefaultPagination(20))
    const [entityTotal, setEntityTotal] = useState<number>(0)
    const [relationshipTotal, setRelationshipTotal] = useState<number>(0)

    // Filter states
    const [entityFilters, setEntityFilters] = useState<EntityFilter>({})
    const [relationshipFilters, setRelationshipFilters] = useState<RelationshipFilter>({})

    // Entity query params
    const [entityParams, setEntityParams, getEntityParams] = useGetState<QueryEntityRequest>({
        Pagination: genDefaultPagination(20)
    })

    // Relationship query params
    const [relationshipParams, setRelationshipParams, getRelationshipParams] = useGetState<QueryRelationshipRequest>({
        Pagination: genDefaultPagination(20)
    })

    // Load repositories
    const loadRepositories = useMemoizedFn(async () => {
        setLoading(true)
        try {
            const response: ListEntityRepositoryResponse = await ipcRenderer.invoke("ListEntityRepository", {})
            setRepositories(response.EntityRepositories || [])
        } catch (e) {
            failed(t("EntityRepositoryPage.messages.loadRepositoriesFailed", {error: String(e)}))
        } finally {
            setLoading(false)
        }
    })

    // Load entities
    const loadEntities = useMemoizedFn(async (page?: number, limit?: number) => {
        if (!selectedRepository) return

        setLoading(true)
        try {
            const paginationProps = {
                Page: page || entityPagination.Page,
                Limit: limit || entityPagination.Limit,
                OrderBy: "id",
                Order: "desc"
            }
            const response: QueryEntityResponse = await ipcRenderer.invoke("QueryEntity", {
                Filter: {
                    ...entityFilters,
                    BaseIndex: selectedRepository.HiddenIndex
                },
                Pagination: paginationProps
            })

            setEntities(response.Entities || [])
            setEntityPagination(response.Pagination)
            setEntityTotal(response.Total)
        } catch (e) {
            failed(t("EntityRepositoryPage.messages.loadEntitiesFailed", {error: String(e)}))
        } finally {
            setLoading(false)
        }
    })

    // Load relationships
    const loadRelationships = useMemoizedFn(async (page?: number, limit?: number) => {
        if (!selectedRepository) return

        setLoading(true)
        try {
            const paginationProps = {
                Page: page || relationshipPagination.Page,
                Limit: limit || relationshipPagination.Limit,
                OrderBy: "id",
                Order: "desc"
            }

            const response: QueryRelationshipResponse = await ipcRenderer.invoke("QueryRelationship", {
                Filter: {
                    ...relationshipFilters,
                    BaseIndex: selectedRepository.HiddenIndex
                },
                Pagination: paginationProps
            })
            setRelationships(response.Relationships || [])
            setRelationshipPagination(response.Pagination)
            setRelationshipTotal(response.Total)
        } catch (e) {
            failed(t("EntityRepositoryPage.messages.loadRelationshipsFailed", {error: String(e)}))
        } finally {
            setLoading(false)
        }
    })

    // Generate ERM Dot
    const generateERMDot = useMemoizedFn(async (entityIds?: number[], depth?: number) => {
        if (!selectedRepository) return

        setLoading(true)
        try {
            const filter: EntityFilter = {
                BaseIndex: selectedRepository.HiddenIndex
            }

            // 如果传入了实体ID，则添加到过滤条件中
            if (entityIds && entityIds.length > 0) {
                filter.IDs = entityIds
            }

            const response: GenerateERMDotResponse = await ipcRenderer.invoke("GenerateERMDot", {
                Filter: filter,
                Depth: depth || 2
            })

            const dotCode = response.Dot || ""
            setErmDot(dotCode)
        } catch (e) {
            failed(t("EntityRepositoryPage.messages.generateERMFailed", {error: String(e)}))
        } finally {
            setLoading(false)
        }
    })

    // Filter handlers
    const handleEntityFilterChange = useMemoizedFn((values: any) => {
        const newFilters: EntityFilter = {}

        if (values.entityType) {
            newFilters.Types = [values.entityType]
        }
        if (values.entityName) {
            newFilters.Names = [values.entityName]
        }
        if (values.entityIds) {
            const ids = values.entityIds
                .split(",")
                .map((id: string) => parseInt(id.trim()))
                .filter((id: number) => !isNaN(id))
            if (ids.length > 0) {
                newFilters.IDs = ids
            }
        }

        setEntityFilters(newFilters)
        setEntityPagination(genDefaultPagination(20))
        if (selectedRepository) {
            loadEntities(1, 20)
        }
    })

    const handleRelationshipFilterChange = useMemoizedFn((values: any) => {
        const newFilters: RelationshipFilter = {}

        if (values.relationshipType) {
            newFilters.Types = [values.relationshipType]
        }
        if (values.sourceEntityIds) {
            const ids = values.sourceEntityIds
                .split(",")
                .map((id: string) => parseInt(id.trim()))
                .filter((id: number) => !isNaN(id))
            if (ids.length > 0) {
                newFilters.SourceEntityIDs = ids
            }
        }
        if (values.targetEntityIds) {
            const ids = values.targetEntityIds
                .split(",")
                .map((id: string) => parseInt(id.trim()))
                .filter((id: number) => !isNaN(id))
            if (ids.length > 0) {
                newFilters.TargetEntityIDs = ids
            }
        }
        if (values.relationshipIds) {
            const ids = values.relationshipIds
                .split(",")
                .map((id: string) => parseInt(id.trim()))
                .filter((id: number) => !isNaN(id))
            if (ids.length > 0) {
                newFilters.IDs = ids
            }
        }

        setRelationshipFilters(newFilters)
        setRelationshipPagination(genDefaultPagination(20))
        if (selectedRepository) {
            loadRelationships(1, 20)
        }
    })

    const clearEntityFilters = useMemoizedFn(() => {
        setEntityFilters({})
        setEntityPagination(genDefaultPagination(20))
        if (selectedRepository) {
            loadEntities(1, 20)
        }
    })

    const clearRelationshipFilters = useMemoizedFn(() => {
        setRelationshipFilters({})
        setRelationshipPagination(genDefaultPagination(20))
        if (selectedRepository) {
            loadRelationships(1, 20)
        }
    })

    // Handle entity selection for ERM generation
    const handleEntitySelectForERM = useMemoizedFn((entityId: number) => {
        setSelectedEntityIds([entityId])
        setActiveTab("erm")
        // 自动生成ERM图
        setTimeout(() => {
            generateERMDot([entityId], ermDepth)
        }, 100)
    })

    // Repository columns
    const repositoryColumns = [
        {
            title: t("EntityRepositoryPage.table.id"),
            dataIndex: "ID",
            key: "ID",
            width: 80
        },
        {
            title: t("EntityRepositoryPage.table.name"),
            dataIndex: "Name",
            key: "Name",
            width: 200,
            render: (text: string) => <span style={{fontWeight: "bold"}}>{text}</span>
        },
        {
            title: t("EntityRepositoryPage.table.description"),
            dataIndex: "Description",
            key: "Description",
            width: 400,
            render: (text: string) => <Paragraph ellipsis={{rows: 2}}>{text}</Paragraph>
        },
        {
            title: t("EntityRepositoryPage.table.actions"),
            key: "actions",
            width: 120,
            render: (_, record: EntityRepository) => (
                <Space>
                    <Button
                        type='primary'
                        size='small'
                        onClick={() => {
                            setSelectedRepository(record)
                            setActiveTab("entities")
                        }}
                    >
                        {t("EntityRepositoryPage.buttons.viewEntities")}
                    </Button>
                </Space>
            )
        }
    ]

    // Entity columns
    const entityColumns = [
        {
            title: t("EntityRepositoryPage.table.id"),
            dataIndex: "ID",
            key: "ID",
            width: 80
        },
        {
            title: t("EntityRepositoryPage.table.type"),
            dataIndex: "Type",
            key: "Type",
            width: 150,
            render: (text: string) => <Tag color='blue'>{text}</Tag>
        },
        {
            title: t("EntityRepositoryPage.table.name"),
            dataIndex: "Name",
            key: "Name",
            width: 200,
            render: (text: string) => <span style={{fontWeight: "bold"}}>{text}</span>
        },
        {
            title: t("EntityRepositoryPage.table.description"),
            dataIndex: "Description",
            key: "Description",
            width: 400,
            render: (text: string) => <Paragraph ellipsis={{rows: 2, tooltip: true}}>{text}</Paragraph>
        },
        {
            title: t("EntityRepositoryPage.table.attributes"),
            dataIndex: "Attributes",
            key: "Attributes",
            width: 200,
            render: (attributes: KVPair[]) => (
                <Space direction='vertical' size='small'>
                    {attributes?.map((attr, index) => (
                        <Tag key={index}>
                            {attr.Key}: {attr.Value}
                        </Tag>
                    ))}
                </Space>
            )
        },
        {
            title: t("EntityRepositoryPage.table.actions"),
            key: "actions",
            width: 120,
            render: (_, record: Entity) => (
                <Space>
                    <Button type='primary' size='small' onClick={() => handleEntitySelectForERM(record.ID)}>
                        {t("EntityRepositoryPage.buttons.generateERM")}
                    </Button>
                </Space>
            )
        }
    ]

    // Relationship columns
    const relationshipColumns = [
        {
            title: t("EntityRepositoryPage.table.id"),
            dataIndex: "ID",
            key: "ID",
            width: 80
        },
        {
            title: t("EntityRepositoryPage.table.type"),
            dataIndex: "Type",
            key: "Type",
            width: 150,
            render: (text: string) => <Tag color='green'>{text}</Tag>
        },
        {
            title: t("EntityRepositoryPage.table.sourceEntityId"),
            dataIndex: "SourceEntityID",
            key: "SourceEntityID",
            width: 120
        },
        {
            title: t("EntityRepositoryPage.table.targetEntityId"),
            dataIndex: "TargetEntityID",
            key: "TargetEntityID",
            width: 120
        },
        {
            title: t("EntityRepositoryPage.table.attributes"),
            dataIndex: "Attributes",
            key: "Attributes",
            render: (attributes: KVPair[]) => (
                <Space direction='vertical' size='small'>
                    {attributes?.map((attr, index) => (
                        <Tag key={index}>
                            {attr.Key}: {attr.Value}
                        </Tag>
                    ))}
                </Space>
            )
        }
    ]

    useEffect(() => {
        loadRepositories()
    }, [])

    useEffect(() => {
        if (selectedRepository && activeTab === "entities") {
            loadEntities()
        }
    }, [selectedRepository, activeTab])

    useEffect(() => {
        if (selectedRepository && activeTab === "relationships") {
            loadRelationships()
        }
    }, [selectedRepository, activeTab])

    return (
            <div className={styles.entityRepositoryContainer}>
            <div className={styles.header}>
                <Title level={2} className={styles.title}>
                    <DatabaseOutlined /> {t("EntityRepositoryPage.title")}
                </Title>
            </div>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane
                    tab={
                        <span>
                            <DatabaseOutlined />
                            {t("EntityRepositoryPage.tabs.repositories")}
                        </span>
                    }
                    key='repositories'
                >
                    <div className={styles.tabContent}>
                        <Card className={styles.card}>
                            <div className={styles.actionButtons}>
                                <Space>
                                    <Button
                                        type='primary'
                                        icon={<ReloadOutlined />}
                                        onClick={loadRepositories}
                                        loading={loading}
                                    >
                                        {t("EntityRepositoryPage.buttons.refresh")}
                                    </Button>
                                </Space>
                            </div>

                            <div className={styles.tableContainer}>
                                <Table
                                    columns={repositoryColumns}
                                    dataSource={repositories}
                                    rowKey='ID'
                                    loading={loading}
                                    scroll={{x: "max-content", y: 200}}
                                    pagination={{
                                        total: repositories.length,
                                        pageSize: 20,
                                        showSizeChanger: true,
                                        showQuickJumper: true,
                                        showTotal: (total) => t("EntityRepositoryPage.pagination.repositoriesTotal", {total})
                                    }}
                                />
                            </div>
                        </Card>
                    </div>
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <FileTextOutlined />
                            {t("EntityRepositoryPage.tabs.entities")}
                        </span>
                    }
                    key='entities'
                    disabled={!selectedRepository}
                >
                    <div className={styles.tabContent}>
                        <Card className={styles.card}>
                            {selectedRepository && (
                                <div className={styles.repositoryInfo}>
                                    <div className={styles.repositoryName}>{t("EntityRepositoryPage.repositoryInfo.entitiesIn", {name: selectedRepository.Name})}</div>
                                    <div className={styles.repositoryDescription}>{selectedRepository.Description}</div>
                                </div>
                            )}

                            <div className={styles.actionButtons}>
                                <Space>
                                    <Button
                                        type='primary'
                                        icon={<ReloadOutlined />}
                                        onClick={() => loadEntities()}
                                        loading={loading}
                                    >
                                        {t("EntityRepositoryPage.buttons.refresh")}
                                    </Button>
                                    {selectedEntityIds.length > 0 && (
                                        <Button
                                            type='default'
                                            onClick={() => {
                                                setActiveTab("erm")
                                                setTimeout(() => {
                                                    generateERMDot(selectedEntityIds, ermDepth)
                                                }, 100)
                                            }}
                                        >
                                            {t("EntityRepositoryPage.buttons.generateERMForSelected", {count: selectedEntityIds.length})}
                                        </Button>
                                    )}
                                </Space>
                            </div>

                            {/* Entity Filter Form */}
                            <Card size='small' className={styles.filterCard} style={{marginBottom: 16}}>
                                <div style={{marginBottom: 8, fontSize: 12, color: "#666"}}>
                                    <SearchOutlined /> {t("EntityRepositoryPage.filters.entitiesHint")}
                                </div>
                                <Form layout='inline' className={styles.filterForm} onFinish={handleEntityFilterChange}>
                                    <Form.Item label={t("EntityRepositoryPage.filters.entityType")} name='entityType'>
                                        <Input placeholder={t("EntityRepositoryPage.filters.entityTypePlaceholder")} style={{width: 150}} />
                                    </Form.Item>
                                    <Form.Item label={t("EntityRepositoryPage.filters.entityName")} name='entityName'>
                                        <Input placeholder={t("EntityRepositoryPage.filters.entityNamePlaceholder")} style={{width: 150}} />
                                    </Form.Item>
                                    <Form.Item label={t("EntityRepositoryPage.filters.entityIds")} name='entityIds'>
                                        <Input placeholder={t("EntityRepositoryPage.filters.entityIdsPlaceholder")} style={{width: 200}} />
                                    </Form.Item>
                                    <Form.Item>
                                        <Space>
                                            <Button type='primary' htmlType='submit' icon={<SearchOutlined />}>
                                                {t("EntityRepositoryPage.buttons.search")}
                                            </Button>
                                            <Button onClick={clearEntityFilters}>{t("EntityRepositoryPage.buttons.clear")}</Button>
                                        </Space>
                                    </Form.Item>
                                </Form>
                            </Card>

                            <div className={styles.tableContainer}>
                                <Table
                                    columns={entityColumns}
                                    dataSource={entities}
                                    rowKey='ID'
                                    loading={loading}
                                    scroll={{x: "max-content", y: 200}}
                                    rowSelection={{
                                        selectedRowKeys: selectedEntityIds,
                                        onChange: (selectedRowKeys, selectedRows) => {
                                            setSelectedEntityIds(selectedRowKeys as number[])
                                        }
                                    }}
                                    pagination={{
                                        current: entityPagination.Page,
                                        pageSize: entityPagination.Limit,
                                        total: entityTotal,
                                        showSizeChanger: true,
                                        showQuickJumper: true,
                                        showTotal: (total) => t("EntityRepositoryPage.pagination.entitiesTotal", {total}),
                                        onChange: (page, pageSize) => {
                                            setEntityPagination({
                                                ...entityPagination,
                                                Page: page,
                                                Limit: pageSize || entityPagination.Limit
                                            })
                                            loadEntities(page, pageSize)
                                        }
                                    }}
                                />
                            </div>
                        </Card>
                    </div>
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <NodeIndexOutlined />
                            {t("EntityRepositoryPage.tabs.relationships")}
                        </span>
                    }
                    key='relationships'
                    disabled={!selectedRepository}
                >
                    <div className={styles.tabContent}>
                        <Card className={styles.card}>
                            {selectedRepository && (
                                <div className={styles.repositoryInfo}>
                                    <div className={styles.repositoryName}>
                                        {t("EntityRepositoryPage.repositoryInfo.relationshipsIn", {name: selectedRepository.Name})}
                                    </div>
                                    <div className={styles.repositoryDescription}>{selectedRepository.Description}</div>
                                </div>
                            )}

                            <div className={styles.actionButtons}>
                                <Space>
                                    <Button
                                        type='primary'
                                        icon={<ReloadOutlined />}
                                        onClick={() => loadRelationships()}
                                        loading={loading}
                                    >
                                        {t("EntityRepositoryPage.buttons.refresh")}
                                    </Button>
                                </Space>
                            </div>

                            {/* Relationship Filter Form */}
                            <Card size='small' className={styles.filterCard} style={{marginBottom: 16}}>
                                <div style={{marginBottom: 8, fontSize: 12, color: "#666"}}>
                                    <SearchOutlined /> {t("EntityRepositoryPage.filters.relationshipsHint")}
                                </div>
                                <Form
                                    layout='inline'
                                    className={styles.filterForm}
                                    onFinish={handleRelationshipFilterChange}
                                >
                                    <Form.Item label={t("EntityRepositoryPage.filters.relationshipType")} name='relationshipType'>
                                        <Input placeholder={t("EntityRepositoryPage.filters.relationshipTypePlaceholder")} style={{width: 150}} />
                                    </Form.Item>
                                    <Form.Item label={t("EntityRepositoryPage.filters.sourceEntityIds")} name='sourceEntityIds'>
                                        <Input placeholder={t("EntityRepositoryPage.filters.sourceEntityIdsPlaceholder")} style={{width: 200}} />
                                    </Form.Item>
                                    <Form.Item label={t("EntityRepositoryPage.filters.targetEntityIds")} name='targetEntityIds'>
                                        <Input placeholder={t("EntityRepositoryPage.filters.targetEntityIdsPlaceholder")} style={{width: 200}} />
                                    </Form.Item>
                                    <Form.Item label={t("EntityRepositoryPage.filters.relationshipIds")} name='relationshipIds'>
                                        <Input
                                            placeholder={t("EntityRepositoryPage.filters.relationshipIdsPlaceholder")}
                                            style={{width: 200}}
                                        />
                                    </Form.Item>
                                    <Form.Item>
                                        <Space>
                                            <Button type='primary' htmlType='submit' icon={<SearchOutlined />}>
                                                {t("EntityRepositoryPage.buttons.search")}
                                            </Button>
                                            <Button onClick={clearRelationshipFilters}>{t("EntityRepositoryPage.buttons.clear")}</Button>
                                        </Space>
                                    </Form.Item>
                                </Form>
                            </Card>

                            <div className={styles.tableContainer}>
                                <Table
                                    columns={relationshipColumns}
                                    dataSource={relationships}
                                    rowKey='ID'
                                    loading={loading}
                                    scroll={{x: "max-content", y: 200}}
                                    pagination={{
                                        current: relationshipPagination.Page,
                                        pageSize: relationshipPagination.Limit,
                                        total: relationshipTotal,
                                        showSizeChanger: true,
                                        showQuickJumper: true,
                                        showTotal: (total) => t("EntityRepositoryPage.pagination.relationshipsTotal", {total}),
                                        onChange: (page, pageSize) => {
                                            setRelationshipPagination({
                                                ...relationshipPagination,
                                                Page: page,
                                                Limit: pageSize || relationshipPagination.Limit
                                            })
                                            loadRelationships(page, pageSize)
                                        }
                                    }}
                                />
                            </div>
                        </Card>
                    </div>
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <FileTextOutlined />
                            {t("EntityRepositoryPage.tabs.erm")}
                        </span>
                    }
                    key='erm'
                    disabled={!selectedRepository}
                >
                    <div className={styles.tabContent}>
                        <Card className={styles.card}>
                            {selectedRepository && (
                                <div className={styles.repositoryInfo}>
                                    <div className={styles.repositoryName}>
                                        {t("EntityRepositoryPage.repositoryInfo.ermDiagramFor", {name: selectedRepository.Name})}
                                    </div>
                                    <div className={styles.repositoryDescription}>{selectedRepository.Description}</div>
                                </div>
                            )}

                            {/* ERM Generation Form */}
                            <Card size='small' className={styles.filterCard} style={{marginBottom: 16}}>
                                <div style={{marginBottom: 8, fontSize: 12, color: "#666"}}>
                                    <FileTextOutlined /> {t("EntityRepositoryPage.erm.settingsTitle")}
                                </div>
                                <div style={{marginBottom: 12, fontSize: 11, color: "#999"}}>
                                    {t("EntityRepositoryPage.erm.tip")}
                                </div>

                                <Space direction='vertical' className={styles.ermSettings} style={{width: "100%"}}>
                                    <Space>
                                        <span style={{fontSize: 12}}>{t("EntityRepositoryPage.erm.depth")}</span>
                                        <Input
                                            type='number'
                                            min={1}
                                            max={10}
                                            value={ermDepth}
                                            onChange={(e) => setErmDepth(parseInt(e.target.value) || 2)}
                                            style={{width: 80}}
                                            placeholder='2'
                                        />
                                        <span style={{fontSize: 12}}>{t("EntityRepositoryPage.erm.selectedEntityIds")}</span>
                                        <Input
                                            value={selectedEntityIds.join(", ")}
                                            onChange={(e) => {
                                                const ids = e.target.value
                                                    .split(",")
                                                    .map((id) => parseInt(id.trim()))
                                                    .filter((id) => !isNaN(id))
                                                setSelectedEntityIds(ids)
                                            }}
                                            style={{width: 200}}
                                            placeholder={t("EntityRepositoryPage.erm.selectedEntityIdsPlaceholder")}
                                        />
                                    </Space>
                                    {selectedEntityIds.length > 0 && (
                                        <div style={{fontSize: 11, color: "#666"}}>
                                            {t("EntityRepositoryPage.erm.selectedEntitiesLabel")} {" "}
                                            {selectedEntityIds
                                                .map((id) => {
                                                    const entity = entities.find((e) => e.ID === id)
                                                    return entity ? `${id} (${entity.Name})` : id
                                                })
                                                .join(", ")}
                                        </div>
                                    )}
                                    <Space>
                                        <Button
                                            type='primary'
                                            icon={<ReloadOutlined />}
                                            onClick={() =>
                                                generateERMDot(
                                                    selectedEntityIds.length > 0 ? selectedEntityIds : undefined,
                                                    ermDepth
                                                )
                                            }
                                            loading={loading}
                                        >
                                            {t("EntityRepositoryPage.buttons.generateERMDiagram")}
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setSelectedEntityIds([])
                                                setErmDepth(2)
                                            }}
                                        >
                                            {t("EntityRepositoryPage.buttons.clearSelection")}
                                        </Button>
                                    </Space>
                                </Space>
                            </Card>

                            {/* View Mode Toggle */}
                            {ermDot && (
                                <div className={styles.viewModeToggle}>
                                    <Space>
                                        <Button
                                            type={ermViewMode === "svg" ? "primary" : "default"}
                                            icon={<EyeOutlined />}
                                            onClick={() => setErmViewMode("svg")}
                                        >
                                            {t("EntityRepositoryPage.buttons.svgView")}
                                        </Button>
                                        <Button
                                            type={ermViewMode === "dot" ? "primary" : "default"}
                                            icon={<CodeOutlined />}
                                            onClick={() => setErmViewMode("dot")}
                                        >
                                            {t("EntityRepositoryPage.buttons.dotCode")}
                                        </Button>
                                    </Space>
                                </div>
                            )}

                            {/* SVG Display */}
                            {ermViewMode === "svg" && ermDot && (
                                <div className={styles.ermDiagram}>
                                    <Card title={t("EntityRepositoryPage.erm.svgTitle")} size='small'>
                                        <div className={styles.svgContainer}>
                                            <GraphComponent dot={ermDot} />
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* DOT Code Display */}
                            {ermViewMode === "dot" && ermDot && (
                                <div className={styles.ermDiagram}>
                                    <Card title={t("EntityRepositoryPage.erm.dotTitle")} size='small'>
                                        <pre className={styles.dotContent}>{ermDot}</pre>
                                    </Card>
                                </div>
                            )}
                        </Card>
                    </div>
                </TabPane>
            </Tabs>
        </div>
    )
}
