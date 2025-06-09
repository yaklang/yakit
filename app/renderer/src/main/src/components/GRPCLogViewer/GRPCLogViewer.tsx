import React, {useCallback, useEffect, useMemo, useState, memo} from "react"
import {
    addGRPCLogListener,
    clearGRPCLogs,
    getGRPCLogs,
    setLogCollecting,
    getLogCollectingStatus
} from "../../utils/grpcLogMonitor"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import YakitTabs from "../yakitUI/YakitTabs/YakitTabs"
import {Typography, Space, Tooltip, Empty} from "antd"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import styles from "./style.module.scss"
import {PauseCircleOutlined, PlayCircleOutlined} from "@ant-design/icons"
import {TableVirtualResize} from "../TableVirtualResize/TableVirtualResize"

// 由于react-json-view可能没有安装，暂时使用pre标签代替
// import ReactJson from "react-json-view"

const {Text} = Typography

// 最大日志数量，超过此数量会自动清理旧日志
const MAX_LOGS = 500

interface GRPCLogViewerProps {
    visible: boolean
}

interface GRPCLogEntry {
    type: "request" | "response" | "stream-write" | "stream-cancel" | "error" | "info"
    isStream: boolean
    methodName: string
    params?: any
    response?: any
    error?: string | null
    timestamp: number
    callId?: string
    source?: string
    message?: string
}

// JSON 展示组件，使用懒加载避免直接渲染大型对象
const JsonViewer = memo(({data}: {data: any}) => {
    const [expanded, setExpanded] = useState<boolean>(false)
    const preview = useMemo(() => {
        if (!data) return "null"

        try {
            const str = JSON.stringify(data)
            return str.length > 100 ? str.substring(0, 100) + "..." : str
        } catch (e) {
            return "Error: Cannot stringify object"
        }
    }, [data])

    if (!expanded) {
        return (
            <div>
                <pre onClick={() => setExpanded(true)} style={{cursor: "pointer", overflow: "hidden"}}>
                    {preview} <span style={{color: "#1890ff"}}>(click to expand)</span>
                </pre>
            </div>
        )
    }

    return (
        <div>
            <div style={{marginBottom: 8}}>
                <YakitButton size='small' onClick={() => setExpanded(false)}>
                    Collapse
                </YakitButton>
            </div>
            <pre style={{maxHeight: "400px", overflow: "auto"}}>{JSON.stringify(data, null, 2)}</pre>
        </div>
    )
})

// 表格单元格渲染函数
const renderTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return <Text>{date.toLocaleTimeString()}</Text>
}

const renderType = (type: string) => {
    let color: "success" | "info" | "warning" | "danger" | undefined = "info"
    switch (type) {
        case "request":
            color = "info"
            break
        case "response":
            color = "success"
            break
        case "stream-write":
            color = "warning"
            break
        case "stream-cancel":
            color = "warning"
            break
        case "error":
            color = "danger"
            break
        default:
            color = "info"
    }
    return <YakitTag color={color}>{type}</YakitTag>
}

const renderMethodName = (methodName: string) => <Text copyable>{methodName}</Text>

const renderIsStream = (isStream: boolean) => (isStream ? <YakitTag color='info'>Stream</YakitTag> : "")

const renderCallId = (callId: string) =>
    callId ? <Text copyable={{text: callId}}>{callId.substring(0, 12)}...</Text> : ""

export const GRPCLogViewer: React.FC<GRPCLogViewerProps> = ({visible}) => {
    const [logs, setLogs] = useState<GRPCLogEntry[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [filter, setFilter] = useState<string>("")
    const [selectedLog, setSelectedLog] = useState<GRPCLogEntry | null>(null)
    const [activeTab, setActiveTab] = useState<string>("all")
    const [isCollecting, setIsCollecting] = useState<boolean>(true)

    // 设置列配置
    const columns = useMemo(
        () => [
            {
                title: "Time",
                dataKey: "timestamp",
                width: 100,
                render: renderTimestamp
            },
            {
                title: "Type",
                dataKey: "type",
                width: 120,
                render: renderType
            },
            {
                title: "Method",
                dataKey: "methodName",
                render: renderMethodName
            },
            {
                title: "Stream",
                dataKey: "isStream",
                width: 80,
                render: renderIsStream
            },
            {
                title: "CallID",
                dataKey: "callId",
                width: 200,
                render: renderCallId
            }
        ],
        []
    )

    // 日志过滤器
    const filteredLogs = useMemo(() => {
        // 如果不可见，则不需要过滤
        if (!visible) return []

        // 先按类型过滤
        let typeFiltered = activeTab === "all" ? logs : logs.filter((log) => log.type === activeTab)

        // 再按搜索词过滤
        if (!filter) return typeFiltered
        return typeFiltered.filter(
            (log) =>
                log.methodName.toLowerCase().includes(filter.toLowerCase()) ||
                (log.callId && log.callId.toLowerCase().includes(filter.toLowerCase()))
        )
    }, [logs, filter, activeTab, visible])

    // 初始化和设置监听器
    useEffect(() => {
        if (!visible) return

        // 加载现有日志
        setLogs(getGRPCLogs())
        setLoading(false)
        setIsCollecting(getLogCollectingStatus())

        // 添加日志批量监听器
        const removeListener = addGRPCLogListener((newLogs) => {
            setLogs((prevLogs) => {
                // 如果是清空日志的消息，则重置日志
                if (newLogs.length === 1 && newLogs[0].methodName === "clearLogs") {
                    return []
                }
                return [...prevLogs, ...newLogs]
            })
        })

        return () => {
            removeListener()
        }
    }, [visible])

    // 清除日志的处理函数
    const handleClear = useCallback(() => {
        clearGRPCLogs()
        setSelectedLog(null)
    }, [])

    // 切换日志收集状态
    const toggleLogCollecting = useCallback((checked: boolean) => {
        setLogCollecting(checked)
        setIsCollecting(checked)
    }, [])

    // 行点击处理函数
    const handleRowClick = useCallback((record: GRPCLogEntry | null) => {
        setSelectedLog(record)
    }, [])

    // 渲染表格内容
    const renderTableContent = useMemo(() => {
        if (loading) {
            return <YakitSpin />
        }

        return (
            <TableVirtualResize
                isShowTitle={false}
                columns={columns}
                data={filteredLogs}
                isRefresh={false}
                renderKey='id'
                onSetCurrentRow={(rowDate) => {
                    handleRowClick(rowDate || null)
                }}
            />
        )
    }, [loading, columns, filteredLogs, handleRowClick])

    // 详情面板内容
    const renderDetailPanel = useMemo(() => {
        if (!selectedLog) return null

        return (
            <div className={styles.detailPanel}>
                <YakitTabs defaultActiveKey='1'>
                    {selectedLog.params && (
                        <YakitTabs.YakitTabPane tab='Params' key='1'>
                            <JsonViewer data={selectedLog.params} />
                        </YakitTabs.YakitTabPane>
                    )}
                    {selectedLog.response && (
                        <YakitTabs.YakitTabPane tab='Response' key='2'>
                            <JsonViewer data={selectedLog.response} />
                        </YakitTabs.YakitTabPane>
                    )}
                    {selectedLog.error && (
                        <YakitTabs.YakitTabPane tab='Error' key='3'>
                            <div className={styles.errorBox}>{selectedLog.error}</div>
                        </YakitTabs.YakitTabPane>
                    )}
                    <YakitTabs.YakitTabPane tab='Raw' key='4'>
                        <JsonViewer data={selectedLog} />
                    </YakitTabs.YakitTabPane>
                </YakitTabs>
            </div>
        )
    }, [selectedLog])

    if (!visible) return null

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title}>GRPC Logger</div>
                <div className={styles.actions}>
                    <Space>
                        <Tooltip title={isCollecting ? "Pause log collection" : "Resume log collection"}>
                            <YakitSwitch
                                checkedChildren={<PlayCircleOutlined />}
                                unCheckedChildren={<PauseCircleOutlined />}
                                checked={isCollecting}
                                onChange={toggleLogCollecting}
                            />
                        </Tooltip>
                        <YakitInput.Search
                            placeholder='Filter by method or callId'
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{width: 300}}
                        />
                        <YakitButton type='primary' danger onClick={handleClear}>
                            Clear
                        </YakitButton>
                    </Space>
                </div>
            </div>

            <div className={styles.content}>
                <YakitTabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className='scan-port-tabs no-theme-tabs'
                    destroyInactiveTabPane={true}
                    tabBarStyle={{marginBottom: 5}}
                >
                    <YakitTabs.YakitTabPane tab='All' key='all'>
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab='Request' key='request'>
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab='Response' key='response'>
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab='Stream Write' key='stream-write'>
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab='Stream Cancel' key='stream-cancel'>
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab='Error' key='error'>
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                </YakitTabs>
            </div>

            {renderDetailPanel}
        </div>
    )
}

// 修改为默认导出
export default GRPCLogViewer
