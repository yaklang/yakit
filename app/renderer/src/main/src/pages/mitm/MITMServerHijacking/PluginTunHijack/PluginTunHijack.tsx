import React, {useEffect, useRef, useState, useImperativeHandle, useMemo} from "react"
import {Form} from "antd"
import {} from "@ant-design/icons"
import {useCreation, useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./PluginTunHijack.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
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
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"
import { YakitRoute } from "@/enums/yakitRoute"
import { YakExecutorParam } from "@/pages/invoker/YakExecutorParams"

export const PluginTunHijackDef: PluginTunHijackRefProps = {
    startPluginTunHijack: () => {},
    cancelPluginTunHijackById: () => {}
}

export const PluginTunHijack: React.FC<PluginTunHijackProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {pluginTunHijackData, pluginTunHijackActions} = props
        const {tunSessionState, setTunSessionState} = useStore()

        const startPluginTunHijack = useMemoizedFn(() => {
            pluginTunHijackActions.startPluginTunHijack()
        })

        const cancelPluginTunHijack = useMemoizedFn(() => {
            pluginTunHijackActions.cancelPluginTunHijackById()
        })

        // useImperativeHandle(ref, () => ({}), [])

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
                        cancelPluginTunHijack={cancelPluginTunHijack}
                        deviceName={tunSessionState.deviceName}
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

const TunHijackQuitHint = "TunHijackQuitHint"

export const PluginTunHijackTable: React.FC<PluginTunHijackTableProps> = React.memo((props) => {
    const {cancelPluginTunHijack, deviceName} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [tableData, setTableData] = useState<HijackTableDataProps[]>([])
    const [visible, setVisible] = useState<boolean>(false)
    const [form] = Form.useForm()

    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

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
        PluginName: "路由表查询"
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
            setLoading(false)
        } catch (error) {
            failed("路由表查询失败")
            setLoading(false)
        }
    }, [pluginTunHijackFind.streamInfo])

    // 以下为路由表删除逻辑---
    // 是否为推出劫持的逻辑
    const isQuitRef = useRef<boolean>(false)
    const [pluginTunHijackDel, pluginTunHijackDelActions] = usePluginTunHijack({
        PluginName: "路由表删除",
        onEnd: () => {
            if (!isQuitRef.current) {
                pluginTunHijackFindActions.startPluginTunHijack()
                isQuitRef.current = false
            }
        }
    })
    const handleDeleteRoute = useMemoizedFn((ipList?: string[]) => {
        let ExecParams = [
            {Key: "tunName", Value: deviceName},
            {Key: "clear", Value: true}
        ]
        if (ipList && ipList.length !== 0) {
            ExecParams = [
                {Key: "ipList", Value: ipList.join(",")},
            ]
        }
        pluginTunHijackDelActions.startPluginTunHijack({
            ExecParams: ExecParams as YakExecutorParam[]
        })
    })
    useUpdateEffect(() => {
        // 路由表删除结果处理
        if(!pluginTunHijackDel.isExecuting){
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
            pluginTunHijackFindActions.startPluginTunHijack()
        }
    }, [pluginTunHijackAdd.streamInfo])
    // 以上为路由表增加逻辑---

    const [quitVisible, setQuitVisible] = useState<boolean>(false)
    const [quitNoPrompt, setQuitNoPrompt] = useState<boolean>(false)

    // 退出Tun劫持逻辑
    const onQuitFun = useMemoizedFn(()=>{
        isQuitRef.current = true
        handleDeleteRoute()
        cancelPluginTunHijack()
        // 如有其余操作的关闭来源 需通知其已执行Tun劫持关闭
        // 点击页面关闭时直接关闭
        if(formPageRef.current === "mitm"){
            emiter.emit("onCloseTunHijackCallback", formPageRef.current)
            formPageRef.current = undefined;
        }
        else if(formPageRef.current === "page"){
            info("正在关闭Tun劫持服务，请稍后...")
            setTimeout(()=>{
                emiter.emit("closePage", JSON.stringify({route: YakitRoute.MITMHacker}))
            },500)
        }
    })

    const onQuitTunHijackFun = useMemoizedFn(() => {
        if (!quitNoPrompt) {
            setQuitVisible(true)
        } else {
            onQuitFun()
        }
    })

    const handleQuitOK = useMemoizedFn(() => {
        setRemoteValue(TunHijackQuitHint, quitNoPrompt ? "true" : "false")
        setQuitVisible(false)
        onQuitFun()
    })

    const handleQuitCancel = useMemoizedFn(() => {
        setQuitVisible(false)
    })

    useEffect(() => {
        getRemoteValue(TunHijackQuitHint)
            .then((res) => {
                const replace = res === "true"
                setQuitNoPrompt(replace)
            })
            .catch(() => {})
    }, [])

    // 关闭来源
    const formPageRef = useRef<"mitm" | "page">();
    const onCloseTunHijackConfirmModalFun = useMemoizedFn((fromPage:"mitm" | "page")=>{
        formPageRef.current = fromPage;
        // 来自其余操作关闭tun劫持的请求
        // if(fromPage === "mitm"){
            onQuitTunHijackFun()
        // }
        // else if(fromPage === "page"){
        //     onQuitFun()
        // }
        
    })

    useEffect(()=>{
        emiter.on("onCloseTunHijackConfirmModal", onCloseTunHijackConfirmModalFun)
        return ()=>{
            emiter.off("onCloseTunHijackConfirmModal", onCloseTunHijackConfirmModalFun)
        }
    },[])

    return (
        <div className={styles["plugin-tun-hijack-table"]}>
            <div className={styles["plugin-tun-hijack-result"]}>
                <div className={styles["plugin-tun-hijack-header"]}>
                    <div className={styles["title"]}>
                        <div className={styles["text"]}>路由列表</div>
                        <YakitButton type='text' onClick={() => pluginTunHijackFindActions.startPluginTunHijack()}>
                            <OutlineRefreshIcon />
                        </YakitButton>
                    </div>
                    <div className={styles["extra"]}>
                        <YakitButton type='primary' onClick={addRoute}>
                            添加路由
                        </YakitButton>
                        <YakitButton type='outline1' colors='danger' onClick={() => handleDeleteRoute(selectedRowKeys.length > 0 ? selectedRowKeys : undefined)}>
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

            <YakitHint
                visible={quitVisible}
                title='关闭Tun代理会清空路由表'
                content={"关闭Tun代理后会清空路由表，不删除会导致无法访问劫持网站"}
                footerExtra={
                    <YakitCheckbox checked={quitNoPrompt} onChange={(e) => setQuitNoPrompt(e.target.checked)}>
                        不再提醒
                    </YakitCheckbox>
                }
                okButtonText='好的'
                onOk={handleQuitOK}
                cancelButtonText='取消'
                onCancel={handleQuitCancel}
            />
        </div>
    )
})
