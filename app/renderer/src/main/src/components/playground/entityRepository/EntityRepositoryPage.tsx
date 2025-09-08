import React, {useEffect, useMemo, useRef, useState} from "react"
import {Button, Space, Table, Tag, Form, Typography, Descriptions, Tooltip, Menu, Card, Tabs, Input, Select} from "antd"
import {genDefaultPagination, PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../../../pages/invoker/schema"
import {useGetState, useMemoizedFn} from "ahooks"
import {ReloadOutlined, SearchOutlined, DatabaseOutlined, NodeIndexOutlined, FileTextOutlined, EyeOutlined, CodeOutlined} from "@ant-design/icons"
import {failed} from "../../../utils/notification"
import {showModal} from "../../../utils/showModal"
import {InputItem} from "../../../utils/inputUtil"
import {ExportExcel} from "../../DataExport/DataExport"
import {onRemoveToolFC} from "../../../utils/deleteTool"
import {showByContextMenu} from "../../functionTemplate/showByContext"
import styles from "./EntityRepository.module.scss"
import {instance} from "@viz-js/viz"
import { a } from "@/alibaba/ali-react-table-dist/dist/chunks/ali-react-table-pipeline-2201dfe0.esm"

const {ipcRenderer} = window.require("electron")
const {Paragraph, Title} = Typography
const {TabPane} = Tabs


const GraphComponent = ({ dot }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true; // 处理组件卸载后的异步操作

        const render = async () => {
            if (!dot || !containerRef.current) return;

            setLoading(true);
            setError(null);

            try {
                // 获取 Viz 实例
                const viz = await instance();

                // 渲染 SVG
                const svg = viz.renderSVGElement(dot, {})

                const container = containerRef.current;
                if (!container) return;
                container.innerHTML = '';
                container.appendChild(svg);
            } catch (e) {
                console.error(e);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        render();

        return () => {
            isMounted = false; // 组件卸载时，设置标志位
        };

    }, [dot]); // 当 dot 字符串变化时，重新渲染
    return (
        <div style={{ textAlign: 'center' }}>
            {loading && <p>Loading graph...</p>}
            {error && <pre style={{ color: 'red' }}>Error: {error}</pre>}
            
            {/* 这个 div 是一个“黑盒”，React 只负责创建它，
                不会干涉它的子元素，因为内部没有 JSX */}
            <div ref={containerRef} />
        </div>
    )
};


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
    const [activeTab, setActiveTab] = useState("repositories")
    const [repositories, setRepositories] = useState<EntityRepository[]>([])
    const [entities, setEntities] = useState<Entity[]>([])
    const [relationships, setRelationships] = useState<Relationship[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedRepository, setSelectedRepository] = useState<EntityRepository | null>(null)
    const [ermDot, setErmDot] = useState<string>("")
    const [ermDepth, setErmDepth] = useState<number>(2)
    const [selectedEntityIds, setSelectedEntityIds] = useState<number[]>([])
    const [ermViewMode, setErmViewMode] = useState<'svg' | 'dot'>('svg')

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
            failed(`Failed to load repositories: ${e}`)
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
            failed(`Failed to load entities: ${e}`)
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
            failed(`Failed to load relationships: ${e}`)
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
            failed(`Failed to generate ERM dot: ${e}`)
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
            const ids = values.entityIds.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
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
            const ids = values.sourceEntityIds.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
            if (ids.length > 0) {
                newFilters.SourceEntityIDs = ids
            }
        }
        if (values.targetEntityIds) {
            const ids = values.targetEntityIds.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
            if (ids.length > 0) {
                newFilters.TargetEntityIDs = ids
            }
        }
        if (values.relationshipIds) {
            const ids = values.relationshipIds.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
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
            title: "ID",
            dataIndex: "ID",
            key: "ID",
            width: 80
        },
        {
            title: "Name",
            dataIndex: "Name",
            key: "Name",
            width: 200,
            render: (text: string) => (
                <span style={{fontWeight: "bold"}}>{text}</span>
            )
        },
        {
            title: "Description",
            dataIndex: "Description",
            key: "Description",
            width: 400,
            render: (text: string) => (
                <Paragraph ellipsis={{rows: 2}}>{text}</Paragraph>
            )
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            render: (_, record: EntityRepository) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => {
                            setSelectedRepository(record)
                            setActiveTab("entities")
                        }}
                    >
                        View Entities
                    </Button>
                </Space>
            )
        }
    ]

    // Entity columns
    const entityColumns = [
        {
            title: "ID",
            dataIndex: "ID",
            key: "ID",
            width: 80
        },
        {
            title: "Type",
            dataIndex: "Type",
            key: "Type",
            width: 150,
            render: (text: string) => (
                <Tag color="blue">{text}</Tag>
            )
        },
        {
            title: "Name",
            dataIndex: "Name",
            key: "Name",
            width: 200,
            render: (text: string) => (
                <span style={{fontWeight: "bold"}}>{text}</span>
            )
        },
        {
            title: "Description",
            dataIndex: "Description",
            key: "Description",
            width: 400,
            render: (text: string) => (
                <Paragraph ellipsis={{rows: 2,tooltip: true}}>{text}</Paragraph>
            )
        },
        {
            title: "Attributes",
            dataIndex: "Attributes",
            key: "Attributes",
            width: 200,
            render: (attributes: KVPair[]) => (
                <Space direction="vertical" size="small">
                    {attributes?.map((attr, index) => (
                        <Tag key={index} >
                            {attr.Key}: {attr.Value}
                        </Tag>
                    ))}
                </Space>
            )
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            render: (_, record: Entity) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => handleEntitySelectForERM(record.ID)}
                    >
                        Generate ERM
                    </Button>
                </Space>
            )
        }
    ]

    // Relationship columns
    const relationshipColumns = [
        {
            title: "ID",
            dataIndex: "ID",
            key: "ID",
            width: 80
        },
        {
            title: "Type",
            dataIndex: "Type",
            key: "Type",
            width: 150,
            render: (text: string) => (
                <Tag color="green">{text}</Tag>
            )
        },
        {
            title: "Source Entity ID",
            dataIndex: "SourceEntityID",
            key: "SourceEntityID",
            width: 120
        },
        {
            title: "Target Entity ID",
            dataIndex: "TargetEntityID",
            key: "TargetEntityID",
            width: 120
        },
        {
            title: "Attributes",
            dataIndex: "Attributes",
            key: "Attributes",
            render: (attributes: KVPair[]) => (
                <Space direction="vertical" size="small">
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
                    <DatabaseOutlined /> Entity Repository
                </Title>
            </div>
            
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane 
                    tab={
                        <span>
                            <DatabaseOutlined />
                            Repositories
                        </span>
                    } 
                    key="repositories"
                >
                    <div className={styles.tabContent}>
                        <Card className={styles.card}>
                            <div className={styles.actionButtons}>
                                <Space>
                            <Button 
                                type="primary" 
                                icon={<ReloadOutlined />}
                                onClick={loadRepositories}
                                loading={loading}
                            >
                                Refresh
                            </Button>
                            </Space>
                        </div>
                        
                                                                            <div className={styles.tableContainer}>
                            <Table
                                columns={repositoryColumns}
                                dataSource={repositories}
                                rowKey="ID"
                                loading={loading}
                                scroll={{ x: 'max-content', y: 200 }}
                                pagination={{
                                    total: repositories.length,
                                    pageSize: 20,
                                    showSizeChanger: true,
                                    showQuickJumper: true,
                                    showTotal: (total) => `Total ${total} repositories`
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
                            Entities
                        </span>
                    } 
                    key="entities"
                    disabled={!selectedRepository}
                >
                    <div className={styles.tabContent}>
                        <Card className={styles.card}>
                            {selectedRepository && (
                                <div className={styles.repositoryInfo}>
                                    <div className={styles.repositoryName}>
                                        Entities in: {selectedRepository.Name}
                                    </div>
                                    <div className={styles.repositoryDescription}>
                                        {selectedRepository.Description}
                                    </div>
                                </div>
                            )}
                            
                            <div className={styles.actionButtons}>
                                <Space>
                                    <Button 
                                        type="primary" 
                                        icon={<ReloadOutlined />}
                                        onClick={() => loadEntities()}
                                        loading={loading}
                                    >
                                        Refresh
                                    </Button>
                                    {selectedEntityIds.length > 0 && (
                                        <Button 
                                            type="default"
                                            onClick={() => {
                                                setActiveTab("erm")
                                                setTimeout(() => {
                                                    generateERMDot(selectedEntityIds, ermDepth)
                                                }, 100)
                                            }}
                                        >
                                            Generate ERM for Selected ({selectedEntityIds.length})
                                        </Button>
                                    )}
                                </Space>
                            </div>
                            
                            {/* Entity Filter Form */}
                            <Card size="small" className={styles.filterCard} style={{marginBottom: 16}}>
                                <div style={{marginBottom: 8, fontSize: 12, color: '#666'}}>
                                    <SearchOutlined /> Filter entities (all fields are optional)
                                </div>
                                <Form layout="inline" className={styles.filterForm} onFinish={handleEntityFilterChange}>
                                    <Form.Item label="Entity Type" name="entityType">
                                        <Input placeholder="Enter entity type" style={{width: 150}} />
                                    </Form.Item>
                                    <Form.Item label="Entity Name" name="entityName">
                                        <Input placeholder="Enter entity name" style={{width: 150}} />
                                    </Form.Item>
                                    <Form.Item label="Entity IDs" name="entityIds">
                                        <Input placeholder="Enter IDs (comma separated)" style={{width: 200}} />
                                    </Form.Item>
                                    <Form.Item>
                                        <Space>
                                            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                                                Search
                                            </Button>
                                            <Button onClick={clearEntityFilters}>
                                                Clear
                                            </Button>
                                        </Space>
                                    </Form.Item>
                                </Form>
                            </Card>
                            
                            <div className={styles.tableContainer}>
                                <Table
                                    columns={entityColumns}
                                    dataSource={entities}
                                    rowKey="ID"
                                    loading={loading}
                                    scroll={{ x: 'max-content', y: 200 }}
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
                                        showTotal: (total) => `Total ${total} entities`,
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
                            Relationships
                        </span>
                    } 
                    key="relationships"
                    disabled={!selectedRepository}
                >
                    <div className={styles.tabContent}>
                        <Card className={styles.card}>
                            {selectedRepository && (
                                <div className={styles.repositoryInfo}>
                                    <div className={styles.repositoryName}>
                                        Relationships in: {selectedRepository.Name}
                                    </div>
                                    <div className={styles.repositoryDescription}>
                                        {selectedRepository.Description}
                                    </div>
                                </div>
                            )}
                            
                            <div className={styles.actionButtons}>
                                <Space>
                                    <Button 
                                        type="primary" 
                                        icon={<ReloadOutlined />}
                                        onClick={() => loadRelationships()}
                                        loading={loading}
                                    >
                                        Refresh
                                    </Button>
                                </Space>
                            </div>
                            
                            {/* Relationship Filter Form */}
                            <Card size="small" className={styles.filterCard} style={{marginBottom: 16}}>
                                <div style={{marginBottom: 8, fontSize: 12, color: '#666'}}>
                                    <SearchOutlined /> Filter relationships (all fields are optional)
                                </div>
                                <Form layout="inline" className={styles.filterForm} onFinish={handleRelationshipFilterChange}>
                                    <Form.Item label="Relationship Type" name="relationshipType">
                                        <Input placeholder="Enter relationship type" style={{width: 150}} />
                                    </Form.Item>
                                    <Form.Item label="Source Entity IDs" name="sourceEntityIds">
                                        <Input placeholder="Enter source IDs (comma separated)" style={{width: 200}} />
                                    </Form.Item>
                                    <Form.Item label="Target Entity IDs" name="targetEntityIds">
                                        <Input placeholder="Enter target IDs (comma separated)" style={{width: 200}} />
                                    </Form.Item>
                                    <Form.Item label="Relationship IDs" name="relationshipIds">
                                        <Input placeholder="Enter relationship IDs (comma separated)" style={{width: 200}} />
                                    </Form.Item>
                                    <Form.Item>
                                        <Space>
                                            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                                                Search
                                            </Button>
                                            <Button onClick={clearRelationshipFilters}>
                                                Clear
                                            </Button>
                                        </Space>
                                    </Form.Item>
                                </Form>
                            </Card>
                            
                                                        <div className={styles.tableContainer}>
                                <Table
                                    columns={relationshipColumns}
                                    dataSource={relationships}
                                    rowKey="ID"
                                    loading={loading}
                                    scroll={{ x: 'max-content', y: 200 }}
                                    pagination={{
                                        current: relationshipPagination.Page,
                                        pageSize: relationshipPagination.Limit,
                                        total: relationshipTotal,
                                        showSizeChanger: true,
                                        showQuickJumper: true,
                                        showTotal: (total) => `Total ${total} relationships`,
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
                            ERM Diagram
                        </span>
                    } 
                    key="erm"
                    disabled={!selectedRepository}
                >
                    <div className={styles.tabContent}>
                        <Card className={styles.card}>
                            {selectedRepository && (
                                <div className={styles.repositoryInfo}>
                                    <div className={styles.repositoryName}>
                                        ERM Diagram for: {selectedRepository.Name}
                                    </div>
                                    <div className={styles.repositoryDescription}>
                                        {selectedRepository.Description}
                                    </div>
                                </div>
                            )}
                            
                            {/* ERM Generation Form */}
                            <Card size="small" className={styles.filterCard} style={{marginBottom: 16}}>
                                <div style={{marginBottom: 8, fontSize: 12, color: '#666'}}>
                                    <FileTextOutlined /> ERM Diagram Generation Settings
                                </div>
                                <div style={{marginBottom: 12, fontSize: 11, color: '#999'}}>
                                    Tip: You can select specific entities from the Entities tab, or enter entity IDs manually. 
                                    Leave entity IDs empty to generate diagram for all entities.
                                </div>
                                
                                <Space direction="vertical" className={styles.ermSettings} style={{width: '100%'}}>
                                    <Space>
                                        <span style={{fontSize: 12}}>Depth:</span>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={ermDepth}
                                            onChange={(e) => setErmDepth(parseInt(e.target.value) || 2)}
                                            style={{width: 80}}
                                            placeholder="2"
                                        />
                                        <span style={{fontSize: 12}}>Selected Entity IDs:</span>
                                        <Input
                                            value={selectedEntityIds.join(', ')}
                                            onChange={(e) => {
                                                const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                                                setSelectedEntityIds(ids)
                                            }}
                                            style={{width: 200}}
                                            placeholder="Enter entity IDs (comma separated)"
                                        />
                                    </Space>
                                    {selectedEntityIds.length > 0 && (
                                        <div style={{fontSize: 11, color: '#666'}}>
                                            Selected entities: {selectedEntityIds.map(id => {
                                                const entity = entities.find(e => e.ID === id)
                                                return entity ? `${id} (${entity.Name})` : id
                                            }).join(', ')}
                                        </div>
                                    )}
                                    <Space>
                                        <Button 
                                            type="primary" 
                                            icon={<ReloadOutlined />}
                                            onClick={() => generateERMDot(selectedEntityIds.length > 0 ? selectedEntityIds : undefined, ermDepth)}
                                            loading={loading}
                                        >
                                            Generate ERM Diagram
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                setSelectedEntityIds([])
                                                setErmDepth(2)
                                            }}
                                        >
                                            Clear Selection
                                        </Button>
                                        
                                    </Space>
                                </Space>
                            </Card>
                            
                            {/* View Mode Toggle */}
                            {ermDot && (
                                <div className={styles.viewModeToggle}>
                                    <Space>
                                        <Button
                                            type={ermViewMode === 'svg' ? 'primary' : 'default'}
                                            icon={<EyeOutlined />}
                                            onClick={() => setErmViewMode('svg')}
                                        >
                                            SVG View
                                        </Button>
                                        <Button
                                            type={ermViewMode === 'dot' ? 'primary' : 'default'}
                                            icon={<CodeOutlined />}
                                            onClick={() => setErmViewMode('dot')}
                                        >
                                            DOT Code
                                        </Button>
                                    </Space>
                                </div>
                            )}

                            {/* SVG Display */}
                            {ermViewMode === 'svg' && ermDot && (
                                <div className={styles.ermDiagram}>
                                    <Card title="ERM Diagram (SVG)" size="small">
                                        <div className={styles.svgContainer}>
                                            <GraphComponent dot={ermDot} />
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* DOT Code Display */}
                            {ermViewMode === 'dot' && ermDot && (
                                <div className={styles.ermDiagram}>
                                    <Card title="DOT Format" size="small">
                                        <pre className={styles.dotContent}>
                                            {ermDot}
                                        </pre>
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
