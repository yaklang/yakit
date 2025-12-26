import React, {useContext, useEffect, useRef, useState} from "react"
import {Divider, Form, notification, Typography} from "antd"
import emiter from "@/utils/eventBus/eventBus"
import ChromeLauncherButton from "@/pages/mitm/MITMChromeLauncher"
import {failed, info, yakitNotify} from "@/utils/notification"
import {useCreation, useDebounceEffect, useMemoizedFn} from "ahooks"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import {MITMServer} from "@/pages/mitm/MITMPage"
import style from "./MITMServerHijacking.module.scss"
import {QuitIcon} from "@/assets/newIcon"
import classNames from "classnames"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {AgentConfigModal, maskProxyPassword} from "../MITMServerStartForm/MITMServerStartForm"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import MITMContext, {MITMVersion} from "../Context/MITMContext"
import {RemoteGV} from "@/yakitGV"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {
    MITMEnablePluginModeRequest,
    MITMFilterWebsocketRequest,
    MITMHotPortRequest,
    MITMSetDownstreamProxyRequest,
    grpcMITMEnablePluginMode,
    grpcMITMFilterWebsocket,
    grpcMITMHotPort,
    grpcMITMSetDownstreamProxy,
    grpcMITMSetDisableSystemProxy,
    grpcMITMStopCall
} from "../MITMHacker/utils"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitBaseSelectRef} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {onGetRemoteValuesBase} from "@/components/yakitUI/utils"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import ProxyRulesConfig, {ProxyTest} from "@/components/configNetwork/ProxyRulesConfig"
import {checkProxyVersion, isValidUrlWithProtocol} from "@/utils/proxyConfigUtil"
import { useStore } from "@/store/mitmState"
import {useProxy} from "@/hook/useProxy"

type MITMStatus = "hijacking" | "hijacked" | "idle"
const {Text} = Typography

export interface MITMServerHijackingProp {
    addr: string
    host: string
    port: number
    disableCACertPage: boolean
    status: MITMStatus
    enableInitialMITMPlugin?: boolean
    defaultPlugins?: string[]
    setStatus: (status: MITMStatus) => any
    onLoading?: (loading: boolean) => any
    setVisible: (b: boolean) => void
    logs: ExecResultLog[]
    statusCards: StatusCardProps[]
    tip: string
    onSetTip: (tip: string) => void
    downstreamProxyStr: string
    setDownstreamProxyStr: (proxy: string) => void
    isHasParams: boolean
    onIsHasParams: (isHasParams: boolean) => void
    showPluginHistoryList: string[]
    setShowPluginHistoryList: (l: string[]) => void
    tempShowPluginHistory: string
    setTempShowPluginHistory: (t: string) => void
}

const {ipcRenderer} = window.require("electron")

export interface CaCertData {
    CaCerts: Uint8Array
    LocalFile: string
}

const MITMFiltersModal = React.lazy(() => import("../MITMServerStartForm/MITMFiltersModal"))
const MITMCertificateDownloadModal = React.lazy(() => import("../MITMServerStartForm/MITMCertificateDownloadModal"))

export const MITMServerHijacking: React.FC<MITMServerHijackingProp> = (props) => {
    const {
        host,
        port,
        disableCACertPage,
        addr,
        status,
        setStatus,
        setVisible,
        logs,
        statusCards,
        tip,
        onSetTip,
        downstreamProxyStr,
        setDownstreamProxyStr,
        isHasParams,
        onIsHasParams,
        showPluginHistoryList,
        setShowPluginHistoryList,
        tempShowPluginHistory,
        setTempShowPluginHistory
    } = props

    const {queryPagesDataById, removePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            removePagesDataCacheById: s.removePagesDataCacheById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.HTTPHacker,
            YakitRoute.HTTPHacker
        )
        if (currentItem && currentItem.pageParamsInfo.hTTPHackerPageInfo) {
            return currentItem.pageParamsInfo.hTTPHackerPageInfo
        }
    })
    const initV2PageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.MITMHacker,
            YakitRoute.MITMHacker
        )
        if (currentItem && currentItem.pageParamsInfo.mitmHackerPageInfo) {
            return currentItem.pageParamsInfo.mitmHackerPageInfo
        }
    })

    const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
    const [filtersVisible, setFiltersVisible] = useState<boolean>(false)
    const [filterWebsocket, setFilterWebsocket] = useState<boolean>(false)
    const [disableSystemProxy, setDisableSystemProxy] = useState<boolean>(false)
    const {t, i18n} = useI18nNamespaces(["webFuzzer",'mitm'])

    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])

    useEffect(() => {
        if (!!props.enableInitialMITMPlugin && (props?.defaultPlugins || []).length > 0) {
            enableMITMPluginMode({
                initPluginNames: props.defaultPlugins || [],
                version: mitmVersion
            }).then(() => {
                info("启动初始 MITM 插件成功")
            })
        }
    }, [props.enableInitialMITMPlugin, props.defaultPlugins])

    useDebounceEffect(
        () => {
            const info =
                mitmVersion === MITMVersion.V2
                    ? initV2PageInfo()?.immediatelyLaunchedInfo
                    : initPageInfo()?.immediatelyLaunchedInfo
            if (info && status !== "idle") {
                if (mitmVersion === MITMVersion.V2) {
                    removePagesDataCacheById(YakitRoute.MITMHacker, YakitRoute.MITMHacker)
                } else {
                    removePagesDataCacheById(YakitRoute.HTTPHacker, YakitRoute.HTTPHacker)
                }
                ipcRenderer.invoke("IsChromeLaunched").then((e) => {
                    if (e) {
                        const value: MITMHotPortRequest = {
                            host: info.host,
                            port: +info.port,
                            version: mitmVersion
                        }
                        grpcMITMHotPort(value)
                    }
                })
                    emiter.emit(
                        "onChangeAddrAndEnableInitialPlugin",
                        JSON.stringify({
                            version: mitmVersion,
                            host: info.host,
                            port: info.port,
                            enableInitialPlugin: info.enableInitialPlugin,
                        })
                    )
            }
        },
        [initPageInfo()?.immediatelyLaunchedInfo, initV2PageInfo()?.immediatelyLaunchedInfo, status, mitmVersion],
        {wait: 100}
    )
    const stopFun = useMemoizedFn(() => {
        // setLoading(true)
        return new Promise((resolve, reject) => {
            grpcMITMStopCall(mitmVersion)
                .then(() => {
                    onIsHasParams(false)
                    setShowPluginHistoryList([])
                    setTempShowPluginHistory("")
                    setStatus("idle")
                    resolve("ok")
                })
                .catch((e: any) => {
                    reject(e)
                    notification["error"]({message: `停止中间人劫持失败：${e}`})
                })
                .finally(() => {
                    // setLoading(false)
                })
        })
    })

    const {tunSessionState} = useStore()
    const stop = useMemoizedFn(() => {
        if(tunSessionState.deviceName){
            emiter.emit("onCloseTunHijackConfirmModal", "mitm")
        }else{
           stopFun()
        }
    })

    const onCloseChromeByTunHijack = useMemoizedFn(() => {
        stopFun()
    })

    useEffect(()=>{
        emiter.on("onCloseTunHijackCallback", onCloseChromeByTunHijack)
        return ()=>{
            emiter.off("onCloseTunHijackCallback", onCloseChromeByTunHijack)
        }
    },[])

    useEffect(() => {
        // 获取 ws 开关状态
        getRemoteValue(MITMConsts.MITMDefaultFilterWebsocket).then((e) => {
            const v = e === "true" ? true : false
            setFilterWebsocket(v)
        })
        // 获取禁用系统代理状态
        getRemoteValue(RemoteGV.MITMDisableSystemProxy).then((e) => {
            const v = e === "true" ? true : false
            setDisableSystemProxy(v)
        })
    }, [])

    const [downStreamAgentModalVisible, setDownStreamAgentModalVisible] = useState<boolean>(false)

    const downStreamTagClose = useMemoizedFn(() => {
        const tipStr = tip
            .split("|")
            .filter((item) => !item.startsWith("下游代理"))
            .join("|")
        onSetTip(tipStr)
        setDownstreamProxyStr("")

        const proxyValue: MITMSetDownstreamProxyRequest = {
            downstreamProxy: "",
            downstreamProxyRuleId: '',
            version: mitmVersion
        }
        grpcMITMSetDownstreamProxy(proxyValue)
    })

    return (
        <div className={style["mitm-server"]}>
            <div className={style["mitm-server-heard"]}>
                <div className={style["mitm-server-title"]}>
                    <div className={style["mitm-server-heard-name"]}>劫持 HTTP Request</div>
                    <div className={classNames(style["mitm-server-heard-addr"], "content-ellipsis")}>
                        <span style={{marginRight: 8}}>{addr}</span>
                        {tip
                            .split("|")
                            .filter((item) => item)
                            .map((item) =>
                                !item.startsWith("下游代理") ? (
                                    <YakitTag color='success' key={item}>
                                        {item}
                                    </YakitTag>
                                ) : (
                                    <YakitTag closable={true} onClose={downStreamTagClose} key={item}>
                                        {item}
                                    </YakitTag>
                                )
                            )}
                    </div>
                </div>
                <div className={style["mitm-server-extra"]}>
                    <div className={style["mitm-server-links"]}>
                        <div style={{display: "flex", alignItems: "center"}}>
                            <label>
                                过滤WebSocket：
                                <YakitSwitch
                                    size='middle'
                                    checked={filterWebsocket}
                                    onChange={(value) => {
                                        setFilterWebsocket(value)
                                        setRemoteValue(MITMConsts.MITMDefaultFilterWebsocket, `${value}`)
                                        const params: MITMFilterWebsocketRequest = {
                                            filterWebsocket: value,
                                            version: mitmVersion
                                        }
                                        grpcMITMFilterWebsocket(params)
                                    }}
                                />
                            </label>
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <YakitPopover
                            placement='bottom'
                            title={
                                <div
                                    className={style["proxy_configuration_top"]}
                                    onClick={() => setDownStreamAgentModalVisible(true)}
                                >
                                    {t("ProxyConfig.downstream_agent")}
                                </div>
                            }
                            content={
                                <div
                                    className={style["proxy_configuration_bottom"]}
                                >
                                    <span>{t("HttpQueryAdvancedConfig.disable_system_proxy")}</span>
                                    <YakitSwitch
                                        size='large'
                                        checked={disableSystemProxy}
                                        onChange={(checked) => {
                                            setDisableSystemProxy(checked)
                                            setRemoteValue(RemoteGV.MITMDisableSystemProxy, checked ? "true" : "")
                                            // 调用grpc设置禁用系统代理
                                            grpcMITMSetDisableSystemProxy({
                                                version: mitmVersion,
                                                setDisableSystemProxy: checked
                                            })
                                        }}
                                    />
                                </div>
                            }
                        >
                            <div className={style["link-item"]}>{t("AgentConfigModal.proxy_configuration")}</div>
                        </YakitPopover>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setVisible(true)}>
                            规则配置
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setFiltersVisible(true)}>
                            过滤器
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setDownloadVisible(true)}>
                            证书下载
                        </div>
                    </div>
                    {/*<YakitButton*/}
                    {/*    onClick={() => {*/}
                    {/*        showConfigSystemProxyForm(`${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`)*/}
                    {/*    }}*/}
                    {/*    type='outline2'*/}
                    {/*>*/}
                    {/*    系统代理*/}
                    {/*</YakitButton>*/}
                    <div className={style["mitm-server-chrome"]}>
                        <ChromeLauncherButton
                            isStartMITM={true}
                            host={host}
                            port={port}
                            disableCACertPage={disableCACertPage}
                        />
                    </div>
                    <div className={style["mitm-server-quit-icon"]}>
                        <QuitIcon onClick={() => stop()} />
                    </div>
                </div>
            </div>
            <DownStreamAgentModal
                downStreamAgentModalVisible={downStreamAgentModalVisible}
                onCloseModal={() => setDownStreamAgentModalVisible(false)}
                downstreamProxyStr={downstreamProxyStr}
                setDownstreamProxyStr={setDownstreamProxyStr}
                tip={tip}
                onSetTip={onSetTip}
            ></DownStreamAgentModal>
            <Divider style={{margin: "8px 0"}} />
            <div className={style["mitm-server-body"]}>
                <MITMServer
                    isHasParams={isHasParams}
                    onIsHasParams={onIsHasParams}
                    status={status}
                    setStatus={setStatus}
                    logs={logs}
                    statusCards={statusCards}
                    downstreamProxyStr={downstreamProxyStr}
                    showPluginHistoryList={showPluginHistoryList}
                    setShowPluginHistoryList={setShowPluginHistoryList}
                    tempShowPluginHistory={tempShowPluginHistory}
                    setTempShowPluginHistory={setTempShowPluginHistory}
                    setVisible={setVisible}
                    setFiltersVisible={setFiltersVisible}
                />
            </div>
            <React.Suspense fallback={<div>loading...</div>}>
                <MITMFiltersModal
                    filterType='filter'
                    visible={filtersVisible}
                    setVisible={setFiltersVisible}
                    isStartMITM={true}
                />
                <MITMCertificateDownloadModal visible={downloadVisible} setVisible={setDownloadVisible} />
            </React.Suspense>
        </div>
    )
}

interface DownStreamAgentModalProp {
    downStreamAgentModalVisible: boolean
    onCloseModal: () => void
    tip: string
    onSetTip: (tip: string) => void
    setDownstreamProxyStr: (proxy: string) => void
    downstreamProxyStr: string
}

const DownStreamAgentModal: React.FC<DownStreamAgentModalProp> = React.memo((props) => {
    const {
        downStreamAgentModalVisible,
        downstreamProxyStr = "",
        onCloseModal,
        tip,
        onSetTip,
        setDownstreamProxyStr
    } = props
    const [form] = Form.useForm()
    const mitmContent = useContext(MITMContext)
    const {t, i18n} = useI18nNamespaces(["mitm"])
    const {proxyRouteOptions, getProxyValue, checkProxyEndpoints, proxyConfig, comparePointUrl} = useProxy()

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])
    const onOKFun = useMemoizedFn(async () => {
        const tipArr = tip.split("|")

        const downstreamProxy = form.getFieldsValue().downstreamProxy || []
        if(downstreamProxy.some(item => proxyRouteOptions.find(({ value })=> value === item)?.disabled )){
            yakitNotify("warning", t('ProxyConfig.select_disabled_tip'))
        }
        //如果有新增的代理配置 则存配置项
        checkProxyEndpoints(downstreamProxy)
        const {proxyEndpoints, ProxyRuleIds} = getProxyValue(downstreamProxy)
        setRemoteValue(MITMConsts.MITMDownStreamProxy, downstreamProxy.join(','))

        const proxyValue: MITMSetDownstreamProxyRequest = {
            downstreamProxy: proxyEndpoints,
            downstreamProxyRuleId: ProxyRuleIds,
            version: mitmVersion
        }
        grpcMITMSetDownstreamProxy(proxyValue)
        if (downstreamProxy.length) {
            const downstreamProxyName = downstreamProxy.map((item) => {
                if (item.startsWith("route") || item.startsWith("ep")) {
                    const option = proxyRouteOptions.find(({value}) => value === item)
                    if (item.startsWith("ep")) {
                        return `${comparePointUrl(item)}${option?.disabled ? ` (${t("ProxyConfig.disabled")})` : ""}`
                    }
                    return proxyRouteOptions.find(({value}) => value === item)?.label
                }
                return item
            })
            if (tip.indexOf("下游代理") === -1) {
                onSetTip(
                    `下游代理：${downstreamProxyName.map((item) => maskProxyPassword(item))}` +
                        (tip.indexOf("|") === 0 ? tip : `|${tip}`)
                )
            } else {
                const tipStr = tipArr
                    .map((item) => {
                        if (item.startsWith("下游代理")) {
                            return `下游代理：${downstreamProxyName.map((item) => maskProxyPassword(item))}`
                        } else {
                            return item
                        }
                    })
                    .join("|")
                onSetTip(tipStr)
            }
            setDownstreamProxyStr(downstreamProxy.join(","))
        } else {
            const tipStr = tipArr.filter((item) => !item.startsWith("下游代理")).join("|")
            onSetTip(tipStr)
            setDownstreamProxyStr("")
        }
        onClose()
    })

    const onClose = useMemoizedFn(() => {
        onCloseModal()
    })

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)
    const downstreamProxyRef: React.MutableRefObject<YakitBaseSelectRef> = useRef<YakitBaseSelectRef>({
        onGetRemoteValues: () => {},
        onSetRemoteValues: (s: string[]) => {}
    })

    const onClickDownstreamProxy = useMemoizedFn(async () => {
        try {
            const versionValid = await checkProxyVersion()
            if (!versionValid) {
                return
            }
            setAgentConfigModalVisible(true)
        } catch (error) {
            console.error("error:", error)
        }
    })

    const echoDownstreamProxy = useMemoizedFn(() => {
        const downstreamProxy = downstreamProxyStr
            .split(",")
            .filter((i) => !!i)
            .map((val) => {
                if (!val.startsWith("route") && !val.startsWith("ep")) {
                    return proxyConfig.Endpoints.find(({Id}) => comparePointUrl(Id) === val)?.Id || val
                }
                return val
            })
        //筛除选项没有的
        const filterDownstreamProxy = downstreamProxy.filter((item) =>
            proxyRouteOptions.some(({value}) => item === value)
        )
        form.setFieldsValue({
            downstreamProxy: filterDownstreamProxy
        })
    })

    //回显代理选项
    useEffect(() => {
        downStreamAgentModalVisible && echoDownstreamProxy()
    }, [downStreamAgentModalVisible])

    return (
        <>
            <YakitModal
                visible={downStreamAgentModalVisible}
                title='下游代理'
                width={506}
                maskClosable={false}
                destroyOnClose={true}
                closable
                centered
                okText='确认'
                onCancel={onClose}
                onOk={onOKFun}
                bodyStyle={{padding: 0}}
                zIndex={999} //默认1000 会导致路由配置弹窗被盖住
            >
                <div style={{padding: 15}}>
                    <Form
                        form={form}
                        colon={false}
                        onSubmitCapture={(e) => e.preventDefault()}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 18}}
                        style={{height: "100%"}}
                    >
                        <Form.Item
                            label='下游代理'
                            name='downstreamProxy'
                            getValueFromEvent={(value) => {
                                // 只保留最后一个选中的值
                                if (Array.isArray(value) && value.length > 1) {
                                    return [value[value.length - 1]]
                                }
                                return value
                            }}
                            extra={
                                <>
                                    <div className={style["agent-down-stream-proxy"]} onClick={onClickDownstreamProxy}>
                                        {t("AgentConfigModal.proxy_configuration")}
                                    </div>
                                    <Divider type='vertical' />
                                    <ProxyTest
                                        onEchoNode={(downstreamProxy) => form.setFieldsValue({downstreamProxy})}
                                    />
                                </>
                            }
                            validateTrigger={["onChange", "onBlur"]}
                            rules={[
                                {
                                    validator: (_, value) => {
                                        if (!value || !Array.isArray(value) || value.length === 0) {
                                            return Promise.resolve()
                                        }
                                        // 获取当前options中的所有值
                                        const existingOptions = proxyRouteOptions.map(({value}) => value)
                                        // 只校验新输入的值(不在options中的值)
                                        const newValues = value.filter((v) => !existingOptions.includes(v))
                                        // 校验代理地址格式: 协议://地址:端口
                                        for (const v of newValues) {
                                            if (!isValidUrlWithProtocol(v)) {
                                                return Promise.reject(t("ProxyConfig.valid_proxy_address_tip"))
                                            }
                                        }
                                        return Promise.resolve()
                                    }
                                }
                            ]}
                        >
                            <YakitSelect
                                ref={downstreamProxyRef}
                                allowClear
                                options={proxyRouteOptions}
                                mode='tags'
                                maxTagCount={2}
                                placeholder='例如 http://127.0.0.1:7890 或者 socks5://127.0.0.1:7890'
                            />
                        </Form.Item>
                    </Form>
                </div>
            </YakitModal>
            <ProxyRulesConfig
                visible={agentConfigModalVisible}
                onClose={() => setAgentConfigModalVisible(false)}
            />
        </>
    )
})

export const enableMITMPluginMode = (params: MITMEnablePluginModeRequest) => {
    return grpcMITMEnablePluginMode(params)
}
