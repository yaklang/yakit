import React, {useEffect, useState, useImperativeHandle, useMemo} from "react"
import {Form} from "antd"
import {useCreation, useMemoizedFn, useUpdateEffect} from "ahooks"
import styles from "./PluginTunHijack.module.scss"
import {failed, success} from "@/utils/notification"
import {
    HijackTableDataProps,
    PluginTunHijackProps,
    PluginTunHijackRefProps,
    PluginTunHijackTableProps
} from "./PluginTunHijackType"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {TraceSvgSvgIcon} from "@/assets/icons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlay2Icon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {QuitIcon} from "@/assets/newIcon"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import usePluginTunHijack from "./usePluginTunHijack"
import {useStore} from "@/store/mitmState"
import {HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"

export const PluginTunHijackDef: PluginTunHijackRefProps = {
    updatePluginTunHijack: () => {}
}

export const PluginTunHijack: React.FC<PluginTunHijackProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {pluginTunHijackData, pluginTunHijackActions, pluginTunHijackDel, onQuitTunHijackFun, handleDeleteRoute} =
            props
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
                        deviceName
                    })
                }
            } catch (error) {}
        }, [pluginTunHijackData.streamInfo])

        return (
            <div className={styles["plugin-tun-hijack"]}>
                {tunSessionState.deviceName ? (
                    <PluginTunHijackTable
                        ref={ref}
                        deviceName={tunSessionState.deviceName}
                        pluginTunHijackDel={pluginTunHijackDel}
                        onQuitTunHijackFun={onQuitTunHijackFun}
                        handleDeleteRoute={handleDeleteRoute}
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
                                <YakitButton type='primary' danger onClick={cancelPluginTunHijack}>
                                    停止启动
                                </YakitButton>
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

export const PluginTunHijackTable: React.FC<PluginTunHijackTableProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {deviceName, pluginTunHijackDel, handleDeleteRoute, onQuitTunHijackFun} = props

        const [loading, setLoading] = useState<boolean>(false)
        const [tableData, setTableData] = useState<HijackTableDataProps[]>([])
        const [visible, setVisible] = useState<boolean>(false)
        const [form] = Form.useForm()

        const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
        const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

        useImperativeHandle(
            ref,
            () => ({
                updatePluginTunHijack
            }),
            []
        )

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
        useEffect(() => {
            updatePluginTunHijack()
        }, [])

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
        const handleRouteOk = useMemoizedFn(() => {
            setAddLoading(true)
            form.validateFields().then((res) => {
                pluginTunHijackAddActions.startPluginTunHijack({
                    ExecParams: [
                        {Key: "name", Value: deviceName},
                        {Key: "target", Value: res.target}
                    ]
                })
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
            <div className={styles["plugin-tun-hijack-table"]}>
                <div className={styles["plugin-tun-hijack-result"]}>
                    <div className={styles["plugin-tun-hijack-header"]}>
                        <div className={styles["title"]}>
                            <div className={styles["text"]}>路由列表</div>
                            <YakitButton type='text' onClick={() => updatePluginTunHijack()}>
                                <OutlineRefreshIcon />
                            </YakitButton>
                        </div>
                        <div className={styles["extra"]}>
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
                            <div className={styles["plugin-tun-hijack-quit-icon"]} onClick={onQuitTunHijackFun}>
                                <QuitIcon />
                            </div>
                        </div>
                    </div>
                    <div className={styles["plugin-tun-hijack-content"]}>
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
