import React, {useEffect, useState, useImperativeHandle, useMemo, useRef} from "react"
import {Form, Tooltip} from "antd"
import {useControllableValue, useCreation, useInViewport, useMemoizedFn, useThrottleFn, useUpdateEffect} from "ahooks"
import styles from "./PluginTunHijack.module.scss"
import {failed, info, success, warn, yakitNotify} from "@/utils/notification"
import {
    ConnectionInfo,
    ConnectionInfoItemProps,
    HijackProcessInfoModalProps,
    HijackTableDataProps,
    PluginTunHijackProps,
    PluginTunHijackRefProps,
    PluginTunHijackTableProps,
    ProcessInfo,
    QuitTunHijackBtnProps,
    StopPluginTunHijackBtnProps,
    TunHijackProcessTableProps,
    WatchProcessRequest,
    WatchProcessResponse
} from "./PluginTunHijackType"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {TraceSvgSvgIcon} from "@/assets/icons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlay2Icon, OutlineRefreshIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {QuitIcon} from "@/assets/newIcon"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import usePluginTunHijack, {tunSessionStateDefault} from "./usePluginTunHijack"
import {useStore} from "@/store/mitmState"
import {HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {randomString} from "@/utils/randomUtil"
import classNames from "classnames"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {HijackRunnerPool, HijackTask} from "./HijackRunner"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {v4 as uuidv4} from "uuid"
const {TabPane} = PluginTabs
const {ipcRenderer} = window.require("electron")
export const PluginTunHijackDef: PluginTunHijackRefProps = {
    updatePluginTunHijack: () => {},
    closeTunHijackError: () => {}
}

export const PluginTunHijack: React.FC<PluginTunHijackProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            hidden,
            pluginTunHijackData,
            pluginTunHijackActions,
            pluginTunHijackDel,
            onQuitTunHijackFun,
            handleDeleteRoute,
            onCloseTunHijackFun
        } = props
        const {tunSessionState, setTunSessionState} = useStore()

        const startPluginTunHijack = useMemoizedFn(() => {
            pluginTunHijackActions.startPluginTunHijack()
        })

        const cancelPluginTunHijack = useMemoizedFn(() => {
            pluginTunHijackActions.cancelPluginTunHijackById()
        })

        const isExecuting = useMemo(() => pluginTunHijackData.isExecuting, [pluginTunHijackData.isExecuting])

        useUpdateEffect(() => {
            try {
                // 获取tun设备名
                if (pluginTunHijackData.streamInfo.cardState) {
                    const cardState = pluginTunHijackData.streamInfo.cardState
                    let tunnelInfo: HoldGRPCStreamProps.InfoCard | undefined = undefined
                    let deviceName: string | null = null
                    if (cardState.length > 0) {
                        tunnelInfo = cardState[0].info.find((item) => item.Id === "tunnel name")
                        if (tunnelInfo) {
                            deviceName = tunnelInfo.Data
                        }
                    }
                    setTunSessionState({
                        ...tunSessionState,
                        deviceName
                    })
                }
            } catch (error) {}
        }, [pluginTunHijackData.streamInfo])

        return (
            <div
                className={classNames(styles["plugin-tun-hijack"], {
                    [styles["plugin-tun-hijack-hidden"]]: hidden
                })}
            >
                {tunSessionState.deviceName ? (
                    <PluginTunHijackTable
                        ref={ref}
                        deviceName={tunSessionState.deviceName}
                        pluginTunHijackDel={pluginTunHijackDel}
                        onQuitTunHijackFun={onQuitTunHijackFun}
                        handleDeleteRoute={handleDeleteRoute}
                        onCloseTunHijackFun={onCloseTunHijackFun}
                    />
                ) : (
                    <div className={styles["plugin-tun-hijack-create"]}>
                        <YakitEmpty
                            image={<TraceSvgSvgIcon />}
                            title={isExecuting ? "正在启动..." : "Tun劫持"}
                            description={"开启Tun劫持后，无需配置代理即可进行劫持"}
                            style={{marginTop: 80}}
                        >
                            {isExecuting ? (
                                <StopPluginTunHijackBtn cancelPluginTunHijack={cancelPluginTunHijack} />
                            ) : (
                                <YakitButton
                                    type='primary'
                                    icon={<OutlinePlay2Icon />}
                                    onClick={startPluginTunHijack}
                                    loading={isExecuting}
                                >
                                    开始劫持
                                </YakitButton>
                            )}
                        </YakitEmpty>
                    </div>
                )}
            </div>
        )
    })
)

export const StopPluginTunHijackBtn: React.FC<StopPluginTunHijackBtnProps> = React.memo((props) => {
    const {cancelPluginTunHijack} = props
    const [isStop, setStop] = useState<boolean>(false)
    /** 定时器 */
    const timeRef = useRef<NodeJS.Timeout>()
    useEffect(() => {
        // 超时5S未启动则显示停止按钮
        timeRef.current = setTimeout(() => {
            warn("Tun劫持启动服务已超时")
            setStop(true)
        }, 5000)
        return () => {
            if (timeRef.current) {
                clearTimeout(timeRef.current)
            }
        }
    }, [])
    return (
        <>
            {isStop ? (
                <YakitButton type='primary' danger onClick={cancelPluginTunHijack}>
                    停止启动
                </YakitButton>
            ) : (
                <YakitSpin spinning={true}>正在启动</YakitSpin>
            )}
        </>
    )
})

export const PluginTunHijackTable: React.FC<PluginTunHijackTableProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {deviceName, pluginTunHijackDel, handleDeleteRoute, onQuitTunHijackFun, onCloseTunHijackFun} = props

        const [loading, setLoading] = useState<boolean>(false)
        const [tableData, setTableData] = useState<HijackTableDataProps[]>([])
        const [processTableData, setProcessTableData] = useState<ProcessInfo[]>([])
        const [visible, setVisible] = useState<boolean>(false)
        const [form] = Form.useForm()

        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

        const [tableType, setTableType] = useState<"process" | "route">("process")
        const tunHijackRunRef = useRef<HTMLDivElement>(null)
        const [inViewport] = useInViewport(tunHijackRunRef)
        useImperativeHandle(
            ref,
            () => ({
                updatePluginTunHijack,
                closeTunHijackError
            }),
            []
        )

        const {setTunSessionState} = useStore()
        const timeRef = useRef<NodeJS.Timeout>()
        // 关闭Tun劫持超时异常
        const closeTunHijackError = useMemoizedFn(() => {
            timeRef.current = setTimeout(() => {
                if (inViewport) {
                    failed("当前流关闭异常,执行强制关闭")
                    onCloseTunHijackFun()
                }
            }, 5000)
        })
        useEffect(() => {
            return () => {
                setTunSessionState(tunSessionStateDefault)
                if (timeRef.current) {
                    clearTimeout(timeRef.current)
                }
            }
        }, [])

        const onSelectAll = (newSelectedRowKeys: string[], selected: HijackTableDataProps[], checked: boolean) => {
            setIsAllSelect(checked)
            setSelectedRowKeys(newSelectedRowKeys)
        }
        const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: HijackTableDataProps) => {
            if (c) {
                setSelectedRowKeys((s) => [...s, key])
            } else {
                setSelectedRowKeys((s) => s.filter((ele) => ele !== key))
                setIsAllSelect(false)
            }
        })

        const addRoute = useMemoizedFn(() => {
            setVisible(true)
            form.setFieldsValue({
                target: ""
            })
        })

        const onCancel = useMemoizedFn(() => {
            setVisible(false)
        })

        const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
            return [
                {
                    title: "IP",
                    dataKey: "ip_addr"
                },
                // {
                //     title: "Tun名称",
                //     dataKey: "tun_name",
                // },
                {
                    title: "操作",
                    width: 70,
                    fixed: "right",
                    dataKey: "Action",
                    render: (_, record: HijackTableDataProps) => {
                        return (
                            <YakitButton
                                type='text'
                                colors='danger'
                                size='small'
                                onClick={() => handleDeleteRoute([record.ip_addr])}
                            >
                                删除
                            </YakitButton>
                        )
                    }
                }
            ]
        }, [])
        // 以下为路由表查询逻辑---
        const [pluginTunHijackFind, pluginTunHijackFindActions] = usePluginTunHijack({
            PluginName: "路由表查询",
            onEnd: () => {
                setLoading(false)
            }
        })

        // 用于控制路由列表轮询
        const extraTimerRef = useRef<NodeJS.Timeout>()
        useEffect(() => {
            if (tableType === "route") {
                updatePluginTunHijack()
                // 开启定时器
                if (extraTimerRef.current) {
                    clearInterval(extraTimerRef.current)
                }
                extraTimerRef.current = setInterval(() => pluginTunHijackFindActions.startPluginTunHijack(), 3 * 1000)
            }
            return () => {
                if (extraTimerRef.current) {
                    clearInterval(extraTimerRef.current)
                }
            }
        }, [tableType])

        const updatePluginTunHijack = useMemoizedFn(() => {
            setLoading(true)
            pluginTunHijackFindActions.startPluginTunHijack()
        })
        useUpdateEffect(() => {
            try {
                // 路由表查询结果处理
                const logState = pluginTunHijackFind.streamInfo.logState
                const tableArr = logState.filter((item) => item.level === "text")
                if (tableArr.length > 0) {
                    const parsedData = JSON.parse(tableArr?.[0].data) as HijackTableDataProps[]
                    const newData = parsedData.sort((a, b) => {
                        return a.ip_addr.localeCompare(b.ip_addr)
                    })
                    setTableData(newData)
                }
            } catch (error) {
                failed("路由表查询失败")
            }
        }, [pluginTunHijackFind.streamInfo])

        useUpdateEffect(() => {
            // 路由表删除结果处理
            if (!pluginTunHijackDel.isExecuting) {
                setIsAllSelect(false)
                setSelectedRowKeys([])
            }
        }, [pluginTunHijackDel.isExecuting])

        // 以下为路由表增加逻辑---
        const [pluginTunHijackAdd, pluginTunHijackAddActions] = usePluginTunHijack({
            PluginName: "路由表增加",
            onEnd: () => {
                setAddLoading(false)
            }
        })
        const [addLoading, setAddLoading] = useState<boolean>(false)
        const pluginTunHijackAddActionsFun = useMemoizedFn((target: string) => {
            pluginTunHijackAddActions.startPluginTunHijack({
                ExecParams: [
                    {Key: "name", Value: deviceName},
                    {Key: "target", Value: target}
                ]
            })
        })
        const handleRouteOk = useMemoizedFn(() => {
            setAddLoading(true)
            form.validateFields().then((res) => {
                pluginTunHijackAddActionsFun(res.target)
            })
        })
        useUpdateEffect(() => {
            // 路由表增加结果处理
            const cardState = pluginTunHijackAdd.streamInfo.cardState
            // 成功添加路由
            const successTag = cardState.find((item) => item.tag === "成功添加路由")
            if (successTag) {
                success("添加路由成功")
                setVisible(false)
                updatePluginTunHijack()
            }
        }, [pluginTunHijackAdd.streamInfo])
        // 以上为路由表增加逻辑---
        return (
            <div className={styles["plugin-tun-hijack-table"]} ref={tunHijackRunRef}>
                <div className={styles["plugin-tun-hijack-result"]}>
                    <div className={styles["plugin-tun-hijack-header"]}>
                        <div className={styles["title"]}>
                            <YakitRadioButtons
                                value={tableType}
                                onChange={(e) => {
                                    setTableType(e.target.value)
                                }}
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "process",
                                        label: "进程列表"
                                    },
                                    {
                                        value: "route",
                                        label: "路由列表"
                                    }
                                ]}
                            />
                            {tableType === "route" && (
                                <YakitButton type='text' onClick={() => updatePluginTunHijack()}>
                                    <OutlineRefreshIcon />
                                </YakitButton>
                            )}
                        </div>
                        <div className={styles["extra"]}>
                            {tableType === "route" && (
                                <>
                                    <YakitButton type='primary' onClick={addRoute}>
                                        添加路由
                                    </YakitButton>
                                    <YakitButton
                                        type='outline1'
                                        colors='danger'
                                        onClick={() =>
                                            handleDeleteRoute(selectedRowKeys.length > 0 ? selectedRowKeys : undefined)
                                        }
                                    >
                                        {selectedRowKeys.length > 0 ? "删除" : "清空"}
                                    </YakitButton>
                                </>
                            )}
                            <QuitTunHijackBtn
                                onQuitTunHijackFun={onQuitTunHijackFun}
                                processTableData={processTableData}
                            />
                        </div>
                    </div>
                    <div
                        className={classNames(styles["plugin-tun-hijack-content"], {
                            [styles["plugin-tun-hijack-content-hidden"]]: tableType === "process"
                        })}
                    >
                        <TableVirtualResize
                            loading={loading}
                            isRefresh={loading}
                            isShowTitle={false}
                            data={tableData}
                            renderKey={"ip_addr"}
                            pagination={{
                                page: 1,
                                limit: 50,
                                total: tableData.length,
                                onChange: () => {}
                            }}
                            rowSelection={{
                                isAll: isAllSelect,
                                type: "checkbox",
                                selectedRowKeys,
                                onSelectAll: onSelectAll,
                                onChangeCheckboxSingle
                            }}
                            columns={columns}
                        />
                    </div>
                    <div
                        className={classNames(styles["plugin-tun-hijack-content"], {
                            [styles["plugin-tun-hijack-content-hidden"]]: tableType === "route"
                        })}
                    >
                        <TunHijackProcessTable
                            deviceName={deviceName}
                            pluginTunHijackAddActionsFun={pluginTunHijackAddActionsFun}
                            setTableType={setTableType}
                            processTableData={processTableData}
                            setProcessTableData={setProcessTableData}
                        />
                    </div>
                </div>
                <YakitModal
                    visible={visible}
                    title='添加路由'
                    width={600}
                    destroyOnClose={true}
                    onCancel={onCancel}
                    onOk={handleRouteOk}
                    okText='开始执行'
                    okButtonProps={{
                        loading: addLoading
                    }}
                >
                    <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 15}}>
                        <Form.Item
                            label='目标列表'
                            name='target'
                            tooltip='需要劫持的目标列表，可以以逗号、换行分隔，并且会解析CIDR网段和域名'
                            rules={[{required: true, message: "请输入目标列表"}]}
                        >
                            <YakitInput placeholder={"请输入目标列表"} />
                        </Form.Item>
                    </Form>
                </YakitModal>
            </div>
        )
    })
)

export const QuitTunHijackBtn: React.FC<QuitTunHijackBtnProps> = React.memo((props) => {
    const {onQuitTunHijackFun, processTableData} = props
    const {tunSessionState, setTunSessionState} = useStore()
    const [isStop, setStop] = useState<boolean>(false)
    /** 定时器 */
    const timeRef = useRef<NodeJS.Timeout>()
    useEffect(() => {
        // 超时5S未启动则显示停止按钮
        timeRef.current = setTimeout(() => {
            warn("数据获取已超时")
            setStop(true)
            setTunSessionState({...tunSessionState, isQuitBtn: true})
        }, 5000)
        return () => {
            if (timeRef.current) {
                clearTimeout(timeRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (processTableData.length > 0) {
            clearTimeout(timeRef.current)
            setStop(true)
            setTunSessionState({...tunSessionState, isQuitBtn: true})
        }
    }, [processTableData])

    return isStop ? (
        <div className={styles["plugin-tun-hijack-quit-icon"]} onClick={onQuitTunHijackFun}>
            <QuitIcon />
        </div>
    ) : null
})

export const TunHijackProcessTable: React.FC<TunHijackProcessTableProps> = React.memo(
    (props: TunHijackProcessTableProps) => {
        const {deviceName, pluginTunHijackAddActionsFun, setTableType} = props
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [processTableData, setProcessTableData] = useControllableValue<ProcessInfo[]>(props, {
            valuePropName: "processTableData",
            trigger: "setProcessTableData",
            defaultValue: []
        })
        const [hijackProcessInfo, setHijackProcessInfo] = useState<ConnectionInfo[]>()
        const [hijackTasks, setHijackTasks] = useState<HijackTask[]>([])
        const [searchVal, setSearchVal] = useState<string>("")
        const [activeTab, setActiveTab] = useState<string>("all")
        const addToggleHijack = (pName: string, pid?: number) => {
            setHijackTasks((prev) => {
                return [...prev, {pid, pName, loading: true, uuid: `${uuidv4()}-hijack`}]
            })
            setActiveTab("hijacking")
        }

        const removeToggleHijack = (pName: string, pid?: number) => {
            setHijackTasks((prev) => {
                const exists = prev.some((t) => {
                    if (pid) {
                        return t.pid === pid
                    }
                    return t.pName === pName && !t.pid
                })
                if (exists) {
                    return prev.filter((t) => {
                        if (pid) {
                            return t.pid !== pid
                        }
                        return t.pName !== pName && !t.pid
                    })
                }
                // 如若没找到 则是由进程名劫持的多个pid 停止其多个任务
                else {
                    return prev.filter((t) => {
                        return pid ? !(t.pids || []).includes(pid) : t
                    })
                }
            })
        }

        const columns: ColumnsTypeProps[] = [
            {
                title: "PID",
                dataKey: "Pid",
                width: 96
            },
            {
                title: "进程名",
                dataKey: "Name",
                width: 120,
                filterProps: {
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />,
                    filterInputProps: {
                        placeholder: "请输入进程名搜索..."
                    }
                }
            },
            {
                title: "操作",
                width: 128,
                fixed: "right",
                dataKey: "Action",
                render: (_, record: ProcessInfo) => {
                    const hijackItem = hijackTasks.find((t) => {
                        if (t.pid) {
                            return t.pid === record.Pid
                        }
                        return t.pName === record.Name
                    })
                    return (
                        <>
                            <YakitSpin
                                spinning={!!hijackItem && hijackItem.loading}
                                size='small'
                                wrapperClassName={styles["action-spin"]}
                            >
                                {!!hijackItem && !hijackItem.loading ? (
                                    <YakitButton
                                        size='small'
                                        type='text'
                                        danger={!!hijackItem}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            removeToggleHijack(record.Name, record.Pid)
                                        }}
                                    >
                                        停止
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        size='small'
                                        type='text'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            addToggleHijack(record.Name, record.Pid)
                                        }}
                                    >
                                        劫持
                                    </YakitButton>
                                )}
                            </YakitSpin>
                            <YakitButton
                                type='text'
                                size='small'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    update({QueryPid: record.Pid})
                                }}
                            >
                                查看信息
                            </YakitButton>
                        </>
                    )
                }
            }
        ]

        const hijackColumns: ColumnsTypeProps[] = [
            {
                title: "PID",
                dataKey: "pid",
                width: 96,
                render: (pid: number | undefined, record: HijackTask) => {
                    if (pid) {
                        return pid
                    } else if (record.pids && record.pids.length > 0) {
                        return (
                            <Tooltip placement='topLeft' title={record.pids.join(", ")}>
                                {record.pids.join(", ")}
                            </Tooltip>
                        )
                    }
                    return "-"
                }
            },
            {
                title: "进程名",
                dataKey: "pName",
                width: 120
            },
            {
                title: "进程数",
                dataKey: "processesNum",
                width: 96,
                render: (processesNum: string) => (processesNum ? processesNum : "-")
            },
            {
                title: "操作",
                width: 70,
                fixed: "right",
                dataKey: "Action",
                render: (_, record: HijackTask) => {
                    return (
                        <>
                            <YakitButton
                                type='text'
                                size='small'
                                danger={true}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeToggleHijack(record.pName, record.pid)
                                }}
                            >
                                停止
                            </YakitButton>
                        </>
                    )
                }
            }
        ]

        const [token, setToken] = useState<string>(randomString(40))
        const update = useMemoizedFn((params: WatchProcessRequest = {}) => {
            const newParams: WatchProcessRequest = {
                StartParams: {
                    CheckIntervalSeconds: 5,
                    DisableReserveDNS: false
                },
                ...params
            }
            ipcRenderer.invoke("WatchProcessConnection", newParams, token).catch((err: any) => {
                yakitNotify("error", `[WatchProcessConnection] error:  ${err}`, true)
            })
        })

        const tableDataRef = React.useRef<ProcessInfo[]>([])

        const updateTableDate = useThrottleFn(
            (init?: boolean) => {
                let newTableData = [...tableDataRef.current]
                if (searchVal) {
                    newTableData = newTableData.filter((item) =>
                        item.Name.toLowerCase().includes(searchVal.toLowerCase())
                    )
                }
                setProcessTableData([...newTableData])
                init && setIsRefresh(!isRefresh)
            },
            {wait: 500}
        ).run

        useUpdateEffect(() => {
            updateTableDate(true)
        }, [searchVal])

        useEffect(() => {
            update()
            ipcRenderer.on(`${token}-data`, async (e, data: WatchProcessResponse) => {
                switch (data.Action) {
                    case "start":
                        if (!tableDataRef.current.find((item) => item.Pid === data.Process.Pid)) {
                            tableDataRef.current = tableDataRef.current.concat(data.Process)
                        }
                        break
                    case "exit":
                        tableDataRef.current = tableDataRef.current.filter((item) => item.Pid !== data.Process.Pid)
                        break
                    case "refresh":
                        tableDataRef.current = tableDataRef.current.map((item) => {
                            if (item.Pid === data.Process.Pid) {
                                return data.Process
                            }
                            return item
                        })
                        break
                    case "refresh_connections":
                        let Connections = data?.Connections
                        if (Connections && Connections.length > 0) {
                            setHijackProcessInfo(data.Connections)
                        } else {
                            warn("当前进程无网络连接信息")
                        }
                        break
                    default:
                        break
                }
                updateTableDate()
            })
            ipcRenderer.on(`${token}-error`, (e, error) => {
                yakitNotify("error", `[WatchProcessConnection] error:  ${error}`, true)
            })
            ipcRenderer.on(`${token}-end`, (e, data) => {
                info("[WatchProcessConnection] finished")
            })
            return () => {
                ipcRenderer.invoke("cancel-WatchProcessConnection", token)
                ipcRenderer.removeAllListeners(`${token}-data`)
                ipcRenderer.removeAllListeners(`${token}-error`)
                ipcRenderer.removeAllListeners(`${token}-end`)
            }
        }, [])
        const onTableChange = useMemoizedFn((page: number, limit: number, sort: SortProps, filter: any) => {
            setSearchVal(filter["Name"])
        })

        return (
            <>
                <HijackRunnerPool
                    deviceName={deviceName}
                    tasks={hijackTasks}
                    onTaskStop={(pid) => {
                        setHijackTasks((prev) =>
                            prev.filter((t) => {
                                // PID停止
                                if (t.pid) {
                                    return t.pid !== pid
                                }
                                // 进程名停止
                                else {
                                    return t.pName !== pid
                                }
                            })
                        )
                    }}
                    onTaskStatus={(i: HijackTask) => {
                        setHijackTasks((prev) =>
                            prev.map((t) => {
                                if (i.pid && t.pid === i.pid) {
                                    return i
                                }
                                if (!i.pid && !t.pid && t.pName === i.pName) {
                                    return i
                                }
                                return t
                            })
                        )
                    }}
                />
                <div className={styles["hijack-process-search-wrapper"]}>
                    <YakitInput.Search
                        placeholder='可直接输入进程名劫持，根据glob模式匹配，如: *chrome*'
                        onSearch={(value) => {
                            if (!value) return
                            if (hijackTasks.find((task) => task.pName === value && !task.pid)) {
                                info("该进程已在劫持中")
                            } else {
                                addToggleHijack(value)
                            }
                        }}
                        enterButton='劫持'
                        wrapperClassName={styles["hijack-process-search"]}
                    />
                    <PluginTabs
                        activeKey={activeTab}
                        onChange={(v) => {
                            setActiveTab(v)
                        }}
                        wrapperClassName={styles["hijack-process-tabs"]}
                        tabBarExtraContent={
                            hijackTasks.length > 0 ? (
                                <YakitButton
                                    danger
                                    size='small'
                                    onClick={() => {
                                        setHijackTasks([])
                                    }}
                                >
                                    全部停止
                                </YakitButton>
                            ) : null
                        }
                    >
                        <TabPane key='hijacking' tab='已劫持任务'>
                            <TableVirtualResize
                                isRefresh={false}
                                isShowTitle={false}
                                data={hijackTasks}
                                renderKey={"uuid"}
                                pagination={{
                                    page: 1,
                                    limit: 50,
                                    total: hijackTasks.length,
                                    onChange: () => {}
                                }}
                                columns={hijackColumns}
                                enableDrag
                            />
                        </TabPane>

                        <TabPane key='all' tab='全部'>
                            <TableVirtualResize
                                isRefresh={isRefresh}
                                isShowTitle={false}
                                data={processTableData}
                                renderKey={"Pid"}
                                pagination={{
                                    page: 1,
                                    limit: 50,
                                    total: processTableData.length,
                                    onChange: () => {}
                                }}
                                columns={columns}
                                enableDrag
                                onChange={onTableChange}
                            />
                        </TabPane>
                    </PluginTabs>
                </div>

                <HijackProcessInfoModal
                    hijackProcessInfo={hijackProcessInfo}
                    setHijackProcessInfo={setHijackProcessInfo}
                    pluginTunHijackAddActionsFun={pluginTunHijackAddActionsFun}
                    setTableType={setTableType}
                />
            </>
        )
    }
)

export const HijackProcessInfoModal: React.FC<HijackProcessInfoModalProps> = React.memo((props) => {
    const {pluginTunHijackAddActionsFun, setTableType} = props
    const [hijackProcessInfo, setHijackProcessInfo] = useControllableValue<ConnectionInfo[] | undefined>(props, {
        valuePropName: "hijackProcessInfo",
        trigger: "setHijackProcessInfo",
        defaultValue: undefined
    })

    const onPluginTunHijackAddActionsByConnection = useMemoizedFn((target: string) => {
        pluginTunHijackAddActionsFun(target)
        // 是否切换到路由表（由需求决定）
        // setTableType("route")
    })

    const hijackInfoColumns: ColumnsTypeProps[] = [
        {
            title: "本地地址",
            dataKey: "LocalAddress",
            width: 180
        },
        {
            title: "远程地址",
            dataKey: "RemoteAddress",
            width: 180
        },
        {
            title: "域名",
            dataKey: "Domain",
            width: 200,
            render: (data) => {
                return data ? data.join(", ") : "-"
            }
        },
        {
            title: "操作",
            width: 100,
            fixed: "right",
            dataKey: "Action",
            render: (_, record: ConnectionInfo) => {
                return (
                    <>
                        <YakitButton
                            type='text'
                            size='small'
                            danger={true}
                            onClick={(e) => {
                                onPluginTunHijackAddActionsByConnection(record.RemoteAddress)
                            }}
                        >
                            添加路由
                        </YakitButton>
                    </>
                )
            }
        }
    ]

    return (
        <YakitModal
            visible={!!hijackProcessInfo}
            title='信息详情'
            width={600}
            destroyOnClose={true}
            onCancel={() => setHijackProcessInfo(undefined)}
            footer={null}
        >
            <TableVirtualResize
                isRefresh={false}
                isShowTitle={false}
                data={hijackProcessInfo || []}
                renderKey={"LocalAddress"}
                pagination={{
                    page: 1,
                    limit: 50,
                    total: (hijackProcessInfo || []).length,
                    onChange: () => {}
                }}
                columns={hijackInfoColumns}
                enableDrag
            />
        </YakitModal>
    )
})
