import React, {useContext, useEffect, useRef, useState} from "react"
import {Divider, Form, notification, Typography} from "antd"
import emiter from "@/utils/eventBus/eventBus"
import ChromeLauncherButton from "@/pages/mitm/MITMChromeLauncher"
import {failed, info, yakitNotify} from "@/utils/notification"
import {useCreation, useDebounceEffect, useMemoizedFn} from "ahooks"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import {MITMServer, TipPart} from "@/pages/mitm/MITMPage"
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
import {
    MITMEnablePluginModeRequest,
    MITMFilterWebsocketRequest,
    MITMHotPortRequest,
    MITMSetDownstreamProxyRequest,
    grpcMITMEnablePluginMode,
    grpcMITMFilterWebsocket,
    grpcMITMHotPort,
    grpcMITMSetDownstreamProxy,
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
    tipParts?: TipPart[]
    setTipParts?: (parts: TipPart[]) => void
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
        tipParts,
        setTipParts,
        downstreamProxyStr,
        setDownstreamProxyStr,
        isHasParams,
        onIsHasParams,
        showPluginHistoryList,
        setShowPluginHistoryList,
        tempShowPluginHistory,
        setTempShowPluginHistory
    } = props
    const {t, i18n} = useI18nNamespaces(["mitm"])

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
    const {proxyRouteOptions, comparePointUrl} = useProxy()

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
                info(t("MITMServerHijacking.startInitialMitmPluginSuccess"))
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
                onGetRemoteValuesBase(MITMConsts.MITMDefaultDownstreamProxyHistory).then((res) => {
                    emiter.emit(
                        "onChangeAddrAndEnableInitialPlugin",
                        JSON.stringify({
                            version: mitmVersion,
                            host: info.host,
                            port: info.port,
                            enableInitialPlugin: info.enableInitialPlugin,
                            downstreamProxy: res.defaultValue
                        })
                    )
                })
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
                    notification["error"]({message: `${t("MITMServerHijacking.stopMitmFailed")}${e}`})
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
    }, [])

    const [downStreamAgentModalVisible, setDownStreamAgentModalVisible] = useState<boolean>(false)

    const downStreamTagClose = useMemoizedFn(() => {
        const newParts = (tipParts || []).filter((p) => p.key !== "downstreamProxy")
        setTipParts && setTipParts(newParts)
        setDownstreamProxyStr("")
        onGetRemoteValuesBase(MITMConsts.MITMDefaultDownstreamProxyHistory).then((res) => {
            const cacheData = {
                options: res.options || [],
                defaultValue: ""
            }
            setRemoteValue(MITMConsts.MITMDefaultDownstreamProxyHistory, JSON.stringify(cacheData))
        })
        const proxyValue: MITMSetDownstreamProxyRequest = {
            downstreamProxy: "",
            downstreamProxyRuleId: '',
            version: mitmVersion
        }
        grpcMITMSetDownstreamProxy(proxyValue)
    })

    const mapProxyValue = (value: string) => {
        if (value.includes("规则组")) {
            return value.replace("规则组", t("ProxyConfig.rule_group"))
        }
        if (value.includes("代理节点")) {
            return value.replace("代理节点", t("ProxyConfig.Points"))
        }
        return value
    }

    return (
        <div className={style["mitm-server"]}>
            <div className={style["mitm-server-heard"]}>
                <div className={style["mitm-server-title"]}>
                    <div className={style["mitm-server-heard-name"]}>{t("MITMServerHijacking.hijackHttpRequest")}</div>
                    <div className={classNames(style["mitm-server-heard-addr"], "content-ellipsis")}>
                        <span style={{marginRight: 8}}>{addr}</span>
                        {(tipParts || [])
                            .map((p, idx) => {
                                if (p.key === "downstreamProxy") {
                                    return (
                                        <YakitTag closable={true} onClose={downStreamTagClose} key={`tip-${idx}`}>
                                            {`${t("DownStreamAgentModal.downstreamProxy")}: ${mapProxyValue(p.value as string)}`}
                                        </YakitTag>
                                    )
                                }
                                if (p.key === "onlyEnableGMTLS") {
                                    return (
                                        <YakitTag color='success' key={`tip-${idx}`}>
                                            {t("MITMServerHijacking.gmTLSOnly")}
                                        </YakitTag>
                                    )
                                }
                                if (p.key === "enableProxyAuth") {
                                    return (
                                        <YakitTag color='success' key={`tip-${idx}`}>
                                            {t("MITMServerHijacking.enableProxyAuth")}
                                        </YakitTag>
                                    )
                                }
                                return null
                            })
                            .filter(Boolean)}
                    </div>
                </div>
                <div className={style["mitm-server-extra"]}>
                    <div className={style["mitm-server-links"]}>
                        <div style={{display: "flex", alignItems: "center"}}>
                            <label>
                                {t("MITMServerHijacking.filterWebSocket")}
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
                        <div className={style["link-item"]} onClick={() => setDownStreamAgentModalVisible(true)}>
                            {t("MITMServerHijacking.downstreamProxy")}
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setVisible(true)}>
                            {t("MITMServerHijacking.ruleConfig")}
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setFiltersVisible(true)}>
                            {t("MITMServerHijacking.filter")}
                        </div>
                        <Divider type='vertical' style={{margin: "0 4px", top: 1}} />
                        <div className={style["link-item"]} onClick={() => setDownloadVisible(true)}>
                            {t("MITMServerHijacking.certificateDownload")}
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
                onCloseModal={() => {
                    setDownStreamAgentModalVisible(false)
                    //如果代理被禁用了 这里要清除代理
                    if (downstreamProxyStr) {
                        const isProxyValid = downstreamProxyStr.startsWith('ep') || downstreamProxyStr.startsWith('route')
                            ? proxyRouteOptions.some(({value}) => value === downstreamProxyStr)
                            : proxyRouteOptions.some(({value}) => comparePointUrl(value) === downstreamProxyStr)
                        
                        !isProxyValid && downStreamTagClose()
                    }
                }}
                downstreamProxyStr={downstreamProxyStr}
                setDownstreamProxyStr={setDownstreamProxyStr}
                tipParts={tipParts}
                setTipParts={setTipParts}
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
    tipParts?: TipPart[]
    setTipParts?: (parts: TipPart[]) => void
    setDownstreamProxyStr: (proxy: string) => void
    downstreamProxyStr: string
}

const DownStreamAgentModal: React.FC<DownStreamAgentModalProp> = React.memo((props) => {
    const {downStreamAgentModalVisible, downstreamProxyStr = "", onCloseModal, tipParts, setTipParts, setDownstreamProxyStr} = props
    const {t, i18n} = useI18nNamespaces(["mitm", "yakitUi"])
    const [form] = Form.useForm()
    const mitmContent = useContext(MITMContext)
    const {proxyRouteOptions, getProxyValue, checkProxyEndpoints, proxyConfig, comparePointUrl} = useProxy()    

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])
    const onOKFun = useMemoizedFn(async () => {
        try {
            const existingParts = Array.isArray(tipParts) ? [...tipParts] : []
            let downstreamProxy = form.getFieldsValue().downstreamProxy || []
            // 保证 downstreamProxy 为数组
            if (!Array.isArray(downstreamProxy)) {
                downstreamProxy = downstreamProxy
                    ? String(downstreamProxy)
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                    : []
            }

            // 如果有新增的代理配置 则存配置项
            checkProxyEndpoints(downstreamProxy)
            const { proxyEndpoints, ProxyRuleIds } = getProxyValue(downstreamProxy)

            const proxyValue: MITMSetDownstreamProxyRequest = {
                downstreamProxy: proxyEndpoints,
                downstreamProxyRuleId: ProxyRuleIds,
                version: mitmVersion
            }
            grpcMITMSetDownstreamProxy(proxyValue)

            if (downstreamProxy.length) {
                // 更新或新增 downstreamProxy 条目
                const others = existingParts.filter((p) => p.key !== "downstreamProxy")
                others.push({key: "downstreamProxy", value: downstreamProxy.map((i) => maskProxyPassword(i)).join(",")})
                setTipParts && setTipParts(others)
                setDownstreamProxyStr(downstreamProxy.join(","))
            } else {
                // 删除 downstreamProxy 条目
                const others = existingParts.filter((p) => p.key !== "downstreamProxy")
                setTipParts && setTipParts(others)
                setDownstreamProxyStr("")
            }

            onClose()
        } catch (e) {
            // 避免异常冒泡导致视觉/重载问题
            console.error("DownStreamAgentModal onOKFun error:", e)
        }
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
                title={t("DownStreamAgentModal.downstreamProxy")}
                width={506}
                maskClosable={false}
                destroyOnClose={true}
                closable
                centered
                okText={t("YakitButton.confirm")}
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
                            label={t("DownStreamAgentModal.downstreamProxy")}
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
                                placeholder={t("DownStreamAgentModal.proxyAddressExample")}
                            />
                        </Form.Item>
                    </Form>
                </div>
            </YakitModal>
            <ProxyRulesConfig
                visible={agentConfigModalVisible}
                onClose={() => {
                    setAgentConfigModalVisible(false)
                    const proxy = form.getFieldValue("downstreamProxy") || []
                    const filterProxy = proxy.filter((item) => proxyRouteOptions.some(({value}) => value === item))
                    form.setFieldsValue({downstreamProxy: filterProxy})
                }}
            />
        </>
    )
})

export const enableMITMPluginMode = (params: MITMEnablePluginModeRequest) => {
    return grpcMITMEnablePluginMode(params)
}
