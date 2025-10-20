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
import {PauseCircleOutlined, PlayCircleOutlined, CopyOutlined} from "@ant-design/icons"
import {TableVirtualResize} from "../TableVirtualResize/TableVirtualResize"
import {success, info} from "@/utils/notification"

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
    data?: any // 用于流写入的数据
    error?: string | null
    timestamp: number
    callId?: string
    source?: string
    message?: string
}

// 表格单元格渲染函数
const renderTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return <Text>{date.toLocaleTimeString()}</Text>
}

const renderType = (type: string, isStream: boolean) => {
    let color: "success" | "info" | "warning" | "danger" | undefined = "info"
    let displayText = type
    
    switch (type) {
        case "request":
            color = "info"
            displayText = isStream ? "Stream 请求" : "请求"
            break
        case "response":
            color = "success"
            displayText = isStream ? "Stream 响应" : "响应"
            break
        case "stream-write":
            color = "warning"
            displayText = "Stream 写入"
            break
        case "stream-cancel":
            color = "warning"
            displayText = "Stream 取消"
            break
        case "error":
            color = "danger"
            displayText = isStream ? "Stream 错误" : "错误"
            break
        default:
            color = "info"
    }
    return <YakitTag color={color}>{displayText}</YakitTag>
}

const renderMethodName = (methodName: string) => <Text copyable>{methodName}</Text>

const renderIsStream = (isStream: boolean) => (isStream ? <YakitTag color='purple'>双向流</YakitTag> : "")

const renderCallId = (callId: string) =>
    callId ? (
        <Tooltip title={callId}>
            <Text copyable={{text: callId}}>{callId.substring(0, 12)}...</Text>
        </Tooltip>
    ) : ""

export const GRPCLogViewer: React.FC<GRPCLogViewerProps> = ({visible}) => {
    const [logs, setLogs] = useState<GRPCLogEntry[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [filter, setFilter] = useState<string>("")
    const [selectedLog, setSelectedLog] = useState<GRPCLogEntry | null>(null)
    const [activeTab, setActiveTab] = useState<string>("all")
    const [isCollecting, setIsCollecting] = useState<boolean>(true)
    const [showStreamStats, setShowStreamStats] = useState<boolean>(false)

    // 设置列配置
    const columns = useMemo(
        () => [
            {
                title: "时间",
                dataKey: "timestamp",
                width: 100,
                render: renderTimestamp
            },
            {
                title: "类型",
                dataKey: "type",
                width: 140,
                render: (type: string, record: GRPCLogEntry) => renderType(type, record.isStream)
            },
            {
                title: "方法名",
                dataKey: "methodName",
                render: renderMethodName
            },
            {
                title: "流标识",
                dataKey: "isStream",
                width: 90,
                render: renderIsStream
            },
            {
                title: "调用ID",
                dataKey: "callId",
                width: 180,
                render: renderCallId
            }
        ],
        []
    )

    // 计算流式调用统计
    const streamStats = useMemo(() => {
        const stats = new Map<string, {
            callId: string
            methodName: string
            requestCount: number
            responseCount: number
            errorCount: number
            firstTime: number
            lastTime: number
        }>()

        logs.forEach((log) => {
            if (log.isStream && log.callId) {
                if (!stats.has(log.callId)) {
                    stats.set(log.callId, {
                        callId: log.callId,
                        methodName: log.methodName,
                        requestCount: 0,
                        responseCount: 0,
                        errorCount: 0,
                        firstTime: log.timestamp,
                        lastTime: log.timestamp
                    })
                }

                const stat = stats.get(log.callId)!
                stat.lastTime = log.timestamp

                if (log.type === "request" || log.type === "stream-write") {
                    stat.requestCount++
                } else if (log.type === "response") {
                    stat.responseCount++
                } else if (log.type === "error") {
                    stat.errorCount++
                }
            }
        })

        return Array.from(stats.values())
    }, [logs])

    // 日志过滤器
    const filteredLogs = useMemo(() => {
        // 先按类型过滤
        let typeFiltered = activeTab === "all" ? logs : logs.filter((log) => log.type === activeTab)

        // 再按搜索词过滤
        if (!filter) return typeFiltered
        return typeFiltered.filter(
            (log) =>
                log.methodName.toLowerCase().includes(filter.toLowerCase()) ||
                (log.callId && log.callId.toLowerCase().includes(filter.toLowerCase()))
        )
    }, [logs, filter, activeTab])

    // 初始化和设置监听器（只在首次挂载时执行）
    useEffect(() => {
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
    }, [])

    // 清除日志的处理函数
    const handleClear = useCallback(() => {
        clearGRPCLogs()
        setSelectedLog(null)
        success("日志已清空")
    }, [])

    // 切换日志收集状态
    const toggleLogCollecting = useCallback((checked: boolean) => {
        setLogCollecting(checked)
        setIsCollecting(checked)
        
        if (!checked) {
            // 关闭监听时清除数据
            clearGRPCLogs()
            setSelectedLog(null)
            info("已停止日志收集并清除数据")
        } else {
            // 启动监听
            success("已启动日志收集")
        }
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

    // 检查是否是 Bytes 类型的数组
    const isBytesArray = useCallback((arr: any): boolean => {
        if (!Array.isArray(arr) || arr.length === 0) return false
        
        // 检查是否所有元素都是 0-255 的数字
        return arr.every(item => typeof item === 'number' && item >= 0 && item <= 255)
    }, [])

    // 将 Bytes 数组转换为 base64
    const convertBytesToBase64 = useCallback((obj: any, parentKey?: string): any => {
        if (!obj) return obj
        
        // 如果是 Uint8Array
        if (obj instanceof Uint8Array) {
            try {
                const binary = String.fromCharCode(...obj)
                return {
                    _type: "base64",
                    _length: obj.length,
                    data: btoa(binary)
                }
            } catch (e) {
                return obj
            }
        }
        
        // 如果是 Bytes 数组（通常字段名包含 bytes, data, payload 等）
        if (Array.isArray(obj) && isBytesArray(obj)) {
            // 根据字段名判断是否是字节数组
            const isBytesField = parentKey && (
                parentKey.toLowerCase().includes('byte') ||
                parentKey.toLowerCase().includes('data') ||
                parentKey.toLowerCase().includes('payload') ||
                parentKey.toLowerCase().includes('content')
            )
            
            if (isBytesField || obj.length > 10) { // 长度大于10的数字数组很可能是字节数据
                try {
                    const bytes = new Uint8Array(obj)
                    const binary = String.fromCharCode(...bytes)
                    return {
                        _type: "base64",
                        _length: obj.length,
                        data: btoa(binary)
                    }
                } catch (e) {
                    return obj
                }
            }
        }
        
        // 如果是数组，递归处理
        if (Array.isArray(obj)) {
            return obj.map(item => convertBytesToBase64(item, parentKey))
        }
        
        // 如果是对象，递归处理
        if (typeof obj === 'object' && obj !== null) {
            const result: any = {}
            for (const key in obj) {
                result[key] = convertBytesToBase64(obj[key], key)
            }
            return result
        }
        
        return obj
    }, [isBytesArray])

    // 生成直观数据（转换 Bytes 为 base64）
    const readableData = useMemo(() => {
        if (!selectedLog) return null
        return convertBytesToBase64(selectedLog)
    }, [selectedLog, convertBytesToBase64])

    // 复制 JSON 数据
    const handleCopyJson = useCallback((isReadable: boolean = false) => {
        if (!selectedLog) return
        
        try {
            const dataToConvert = isReadable ? readableData : selectedLog
            const jsonString = JSON.stringify(dataToConvert, null, 2)
            navigator.clipboard.writeText(jsonString).then(() => {
                success("已复制到剪贴板")
            }).catch((err) => {
                console.error("复制失败:", err)
                info("复制失败，请重试")
            })
        } catch (err) {
            console.error("JSON 序列化失败:", err)
            info("数据格式化失败")
        }
    }, [selectedLog, readableData])

    // 详情面板的当前标签页
    const [detailTab, setDetailTab] = useState<string>("readable")
    
    // 详情面板高度
    const [detailHeight, setDetailHeight] = useState<number>(350)
    const [isDragging, setIsDragging] = useState<boolean>(false)
    const [dragStartY, setDragStartY] = useState<number>(0)
    const [dragStartHeight, setDragStartHeight] = useState<number>(0)

    // 开始拖动
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        setIsDragging(true)
        setDragStartY(e.clientY)
        setDragStartHeight(detailHeight)
        e.preventDefault()
    }, [detailHeight])

    // 拖动中
    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return
        
        const deltaY = dragStartY - e.clientY
        const newHeight = Math.max(200, Math.min(600, dragStartHeight + deltaY))
        setDetailHeight(newHeight)
    }, [isDragging, dragStartY, dragStartHeight])

    // 结束拖动
    const handleDragEnd = useCallback(() => {
        setIsDragging(false)
    }, [])

    // 监听拖动事件
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove)
            document.addEventListener('mouseup', handleDragEnd)
            return () => {
                document.removeEventListener('mousemove', handleDragMove)
                document.removeEventListener('mouseup', handleDragEnd)
            }
        }
    }, [isDragging, handleDragMove, handleDragEnd])

    // 详情面板内容
    const renderDetailPanel = useMemo(() => {
        if (!selectedLog) return null

        const rawJsonString = JSON.stringify(selectedLog, null, 2)
        const readableJsonString = JSON.stringify(readableData, null, 2)

        return (
            <div className={styles.detailPanel} style={{height: detailHeight}}>
                {/* 拖动手柄 */}
                <div 
                    className={styles.dragHandle}
                    onMouseDown={handleDragStart}
                >
                    <div className={styles.dragLine} />
                </div>
                
                <div className={styles.detailHeader}>
                    <div className={styles.detailHeaderLeft}>
                        <Text strong>日志详情</Text>
                        {selectedLog.isStream && <YakitTag color="purple">流式调用</YakitTag>}
                        <YakitTag color="info">{selectedLog.type}</YakitTag>
                        <Text type="secondary" style={{fontSize: 12}}>
                            {selectedLog.methodName}
                        </Text>
                    </div>
                    <Tooltip title="复制当前标签页的 JSON 数据">
                        <YakitButton 
                            size="small" 
                            icon={<CopyOutlined />} 
                            onClick={() => handleCopyJson(detailTab === "readable")}
                        >
                            复制
                        </YakitButton>
                    </Tooltip>
                </div>
                <YakitTabs 
                    activeKey={detailTab} 
                    onChange={setDetailTab}
                    className={styles.detailTabs}
                    size="small"
                >
                    <YakitTabs.YakitTabPane tab="直观数据" key="readable">
                        <div className={styles.jsonContent}>
                            <pre className={styles.jsonPre}>{readableJsonString}</pre>
                        </div>
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab="原始数据" key="raw">
                        <div className={styles.jsonContent}>
                            <pre className={styles.jsonPre}>{rawJsonString}</pre>
                        </div>
                    </YakitTabs.YakitTabPane>
                </YakitTabs>
            </div>
        )
    }, [selectedLog, readableData, detailTab, detailHeight, handleCopyJson, handleDragStart])

    return (
        <div className={styles.container} style={{display: visible ? "flex" : "none"}}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.title}>GRPC 日志查看器</div>
                    <Space size={12} style={{marginLeft: 16}}>
                        <YakitTag color="info">总计: {logs.length}</YakitTag>
                        <YakitTag color="purple">流式连接: {streamStats.length}</YakitTag>
                        <YakitTag color="success">
                            普通请求: {logs.filter((l) => !l.isStream && l.type === "request").length}
                        </YakitTag>
                    </Space>
                </div>
                <div className={styles.actions}>
                    <Space size={12}>
                        {/* 日志收集开关 */}
                        <Tooltip 
                            title={
                                isCollecting 
                                    ? "点击暂停日志收集并清除数据" 
                                    : "点击启动日志收集"
                            }
                        >
                            <YakitButton
                                type={isCollecting ? "primary" : "outline2"}
                                icon={isCollecting ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                                onClick={() => toggleLogCollecting(!isCollecting)}
                            >
                                {isCollecting ? "收集中" : "已暂停"}
                            </YakitButton>
                        </Tooltip>

                        {/* 搜索框 */}
                        <YakitInput.Search
                            placeholder="按方法名或 CallID 筛选"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{width: 280}}
                            allowClear
                        />

                        {/* 清空按钮 */}
                        <Tooltip title="清空所有日志数据">
                            <YakitButton type="outline2" danger onClick={handleClear}>
                                清空日志
                            </YakitButton>
                        </Tooltip>
                    </Space>
                </div>
            </div>

            <div className={styles.content}>
                <YakitTabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="scan-port-tabs no-theme-tabs"
                    destroyInactiveTabPane={true}
                    tabBarStyle={{marginBottom: 5}}
                >
                    <YakitTabs.YakitTabPane tab="全部" key="all">
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab="请求" key="request">
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab="响应" key="response">
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab="流写入" key="stream-write">
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab="流取消" key="stream-cancel">
                        {renderTableContent}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab="错误" key="error">
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
