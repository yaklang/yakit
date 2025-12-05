import React, {useEffect, useRef, useState, useImperativeHandle, useMemo} from "react"
import {Form} from "antd"
import {} from "@ant-design/icons"
import {useCreation, useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./PluginTunHijack.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {PluginTunHijackProps, PluginTunHijackRefProps, PluginTunHijackTableProps} from "./PluginTunHijackType"
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
                // console.log("streamInfo---", pluginTunHijackData.streamInfo)
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
                    console.log("???", deviceName)

                    setTunSessionState({
                        deviceName
                    })
                }
            } catch (error) {}
        }, [pluginTunHijackData.streamInfo])

        return (
            <div className={styles["plugin-tun-hijack"]}>
                {tunSessionState.deviceName ? (
                    <PluginTunHijackTable cancelPluginTunHijack={cancelPluginTunHijack} deviceName={tunSessionState.deviceName} />
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

export const PluginTunHijackTable: React.FC<PluginTunHijackTableProps> = React.memo((props) => {
    const {cancelPluginTunHijack, deviceName} = props
    const [pluginTunHijackFind, pluginTunHijackFindActions] = usePluginTunHijack({
        PluginName: "路由表查询"
    })
    const [pluginTunHijackAdd, pluginTunHijackAddActions] = usePluginTunHijack({
        PluginName: "路由表增加"
    })
    const [pluginTunHijackDel, pluginTunHijackDelActions] = usePluginTunHijack({
        PluginName: "路由表删除"
    })
    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState([])
    const [tableData, setTableData] = useState([])
    const [visible, setVisible] = useState<boolean>(false)
    const [form] = Form.useForm()

    const addRoute = useMemoizedFn(() => {
        setVisible(true)
    })

    const onCancel = useMemoizedFn(() => {
        setVisible(false)
    })

    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "IP",
                dataKey: "PluginID",
                render: (_, record) => {
                    return _
                }
            },
            {
                title: "操作",
                width: 70,
                fixed: "right",
                dataKey: "Action",
                render: (_, record) => {
                    return (
                        <YakitButton type='text' colors='danger' size='small' onClick={() => handleDeleteRoute(record)}>
                            删除
                        </YakitButton>
                    )
                }
            }
        ]
    }, [])
    // 以下为路由表查询逻辑---
    useEffect(() => {
        updatePluginTunHijack()
    }, [])

    const updatePluginTunHijack = useMemoizedFn(() => {
        setLoading(true)
        pluginTunHijackFindActions.startPluginTunHijack()
    })
    useUpdateEffect(() => {
        // 路由表查询结果处理
        console.log("路由表查询结果处理---", pluginTunHijackFind.streamInfo)
        setLoading(false)
    }, [pluginTunHijackFind.streamInfo])

    // 以下为路由表删除逻辑---
    const handleDeleteRoute = useMemoizedFn((record) => {
        pluginTunHijackDelActions.startPluginTunHijack({
            ExecParams: [
                {Key: "ip_list", Value: "1"},
                {Key: "tun_device_name", Value: deviceName},
                {Key: "all_clean", Value: "true"}
            ]
        })
    })
    useUpdateEffect(() => {
        // 路由表删除结果处理
        console.log("pluginTunHijackDel---", pluginTunHijackDel.streamInfo)
    }, [pluginTunHijackDel.streamInfo])

    // 以下为路由表增加逻辑---
    const handleRouteOk = useMemoizedFn(() => {
        form.validateFields().then((res) => {
            console.log("handleRouteOk---", res)
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
        console.log("pluginTunHijackAdd---", pluginTunHijackAdd.streamInfo)
    }, [pluginTunHijackAdd.streamInfo])

    return (
        <div className={styles["plugin-tun-hijack-table"]}>
            <div className={styles["plugin-tun-hijack-result"]}>
                <div className={styles["plugin-tun-hijack-header"]}>
                    <div className={styles["title"]}>
                        <div className={styles["text"]}>路由列表</div>
                        <YakitButton type='text'>
                            <OutlineRefreshIcon />
                        </YakitButton>
                    </div>
                    <div className={styles["extra"]}>
                        <YakitButton type='primary' onClick={addRoute}>
                            添加路由
                        </YakitButton>
                        <YakitButton type='outline1' colors='danger' onClick={handleDeleteRoute}>
                            清空
                        </YakitButton>
                        <div className={styles["plugin-tun-hijack-quit-icon"]} onClick={cancelPluginTunHijack}>
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
                        renderKey={"id"}
                        pagination={{
                            page: 1,
                            limit: 50,
                            total: data.length,
                            onChange: () => {}
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
