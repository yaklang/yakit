import React, {ReactNode, useEffect, useRef, useState} from "react"
import styles from "./SpaceEnginePage.module.scss"
import {OutlineInformationcircleIcon, OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRouteToPageInfo} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {Form} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    GetSpaceEngineAccountStatusRequest,
    GetSpaceEngineStatusProps,
    apiCancelFetchPortAssetFromSpaceEngine,
    apiFetchPortAssetFromSpaceEngine,
    apiGetGlobalNetworkConfig,
    apiGetSpaceEngineAccountStatus,
    apiGetSpaceEngineStatus,
    apiSetGlobalNetworkConfig
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {
    GlobalNetworkConfig,
    ThirdPartyApplicationConfig,
    defaultParams
} from "@/components/configNetwork/ConfigNetworkPage"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ThirdPartyApplicationConfigForm} from "@/components/configNetwork/ThirdPartyApplicationConfig"
import {OutputFormComponentsByType} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "../plugins/pluginsType"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {SpaceEngineStartParams, SpaceEngineStatus, getDefaultSpaceEngineStartParams} from "@/models/SpaceEngine"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import classNames from "classnames"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {ZoomeyeHelp} from "./ZoomeyeHelp"
import {YakitRoute} from "@/enums/yakitRoute"

interface SpaceEnginePageProps {
    /**页面id */
    pageId: string
}
export const SpaceEnginePage: React.FC<SpaceEnginePageProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initSpaceEnginePageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Space_Engine, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return YakitRouteToPageInfo[YakitRoute.Space_Engine].label
    })
    const [form] = Form.useForm()
    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [tabName, setTabName] = useState<string>(initSpaceEnginePageInfo())
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [scanBeforeSave, setScanBeforeSave] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")

    const spaceEngineWrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(spaceEngineWrapperRef)
    const tokenRef = useRef<string>(randomString(40))

    const defaultTabs = useCreation(() => {
        if (scanBeforeSave) {
            return [
                {tabName: "扫描端口列表", type: "port"},
                {tabName: "日志", type: "log"},
                {tabName: "Console", type: "console"}
            ]
        }
        return [
            {tabName: "日志", type: "log"},
            {tabName: "Console", type: "console"}
        ]
    }, [scanBeforeSave])

    const [streamInfo, spaceEngineStreamEvent] = useHoldGRPCStream({
        tabs: defaultTabs,
        taskName: "FetchPortAssetFromSpaceEngine",
        apiKey: "FetchPortAssetFromSpaceEngine",
        token: tokenRef.current,
        onEnd: () => {
            spaceEngineStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("finished")
                setIsExecuting(false)
            }, 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    useEffect(() => {
        if (inViewport) emiter.on("secondMenuTabDataChange", onSetTabName)
        return () => {
            emiter.off("secondMenuTabDataChange", onSetTabName)
        }
    }, [inViewport])
    const onSetTabName = useMemoizedFn(() => {
        setTabName(initSpaceEnginePageInfo())
    })
    const onExpand = useMemoizedFn(() => {
        setIsExpand(!isExpand)
    })
    const onStartExecute = useMemoizedFn((value) => {
        setScanBeforeSave(!!value?.ScanBeforeSave)
        spaceEngineStreamEvent.reset()
        setExecuteStatus("process")
        setRuntimeId("")
        const params: SpaceEngineStartParams = {
            ...value,
            PageSize: 100,
            Concurrent: 20
        }
        apiFetchPortAssetFromSpaceEngine(params, tokenRef.current).then(() => {
            setIsExecuting(true)
            setIsExpand(false)
            spaceEngineStreamEvent.start()
        })
    })
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        apiCancelFetchPortAssetFromSpaceEngine(tokenRef.current).then(() => {
            spaceEngineStreamEvent.stop()
            setIsExecuting(false)
        })
    })
    /**在顶部的执行按钮 */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        form.validateFields()
            .then(onStartExecute)
            .catch(() => {
                setIsExpand(true)
            })
    })
    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    return (
        <div className={styles["space-engine-wrapper"]} ref={spaceEngineWrapperRef}>
            <ExpandAndRetract
                className={styles["space-engine-heard"]}
                onExpand={onExpand}
                isExpand={isExpand}
                status={executeStatus}
            >
                <span className={styles["space-engine-heard-tabName"]}>{tabName}</span>
                <div>
                    {isExecuting
                        ? !isExpand && (
                              <>
                                  <YakitButton danger onClick={onStopExecute}>
                                      停止
                                  </YakitButton>
                              </>
                          )
                        : !isExpand && (
                              <>
                                  <YakitButton onClick={onExecuteInTop}>执行</YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )}
                </div>
            </ExpandAndRetract>
            <div className={styles["space-engine-content"]}>
                <div
                    className={classNames(styles["space-engine-form-wrapper"], {
                        [styles["space-engine-form-wrapper-hidden"]]: !isExpand
                    })}
                >
                    <Form
                        form={form}
                        onFinish={onStartExecute}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                        validateMessages={{
                            /* eslint-disable no-template-curly-in-string */
                            required: "${label} 是必填字段"
                        }}
                        labelWrap={true}
                        initialValues={getDefaultSpaceEngineStartParams()}
                    >
                        <SpaceEngineFormContent disabled={isExecuting} inViewport={inViewport} />
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <div className={styles["space-engine-form-operate"]}>
                                {isExecuting ? (
                                    <YakitButton danger onClick={onStopExecute} size='large'>
                                        停止
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        className={styles["space-engine-form-operate-start"]}
                                        htmlType='submit'
                                        size='large'
                                    >
                                        开始执行
                                    </YakitButton>
                                )}
                            </div>
                        </Form.Item>
                    </Form>
                </div>
                {isShowResult && (
                    <PluginExecuteResult streamInfo={streamInfo} runtimeId={runtimeId} loading={isExecuting} />
                )}
            </div>
        </div>
    )
})
interface SpaceEngineFormContentProps {
    disabled: boolean
    inViewport: boolean
}
const SpaceEngineFormContent: React.FC<SpaceEngineFormContentProps> = React.memo((props) => {
    const {disabled, inViewport} = props
    const [globalNetworkConfig, setGlobalNetworkConfig] = useState<GlobalNetworkConfig>(defaultParams)
    const [engineStatus, setEngineStatus] = useState<SpaceEngineStatus>()
    useEffect(() => {
        onGetGlobalNetworkConfig()
    }, [inViewport])
    const onSelectType = useMemoizedFn((key) => {
        const param: GetSpaceEngineStatusProps = {
            Type: key
        }
        apiGetSpaceEngineStatus(param).then((value) => {
            switch (value.Status) {
                case "normal":
                    break
                default:
                    yakitNotify("error", "空间引擎校验失败" + value.Info || value.Status)
                    onSetGlobalNetworkConfig(key)
                    break
            }
            setEngineStatus(value)
        })
    })
    /**获取全局网络配置 */
    const onGetGlobalNetworkConfig = useMemoizedFn(() => {
        apiGetGlobalNetworkConfig().then(setGlobalNetworkConfig)
    })
    /**设置第三方应用配置 */
    const onSetGlobalNetworkConfig = useMemoizedFn((type) => {
        const initData: ThirdPartyApplicationConfig = globalNetworkConfig.AppConfigs.find(
            (ele) => ele.Type === type
        ) || {
            APIKey: "",
            Domain: "",
            Namespace: "",
            Type: type,
            UserIdentifier: "",
            UserSecret: "",
            WebhookURL: ""
        }
        let m = showYakitModal({
            title: "添加第三方应用",
            width: 600,
            closable: true,
            maskClosable: false,
            footer: null,
            content: (
                <div style={{margin: 24}}>
                    <ThirdPartyApplicationConfigForm
                        data={initData}
                        onAdd={(e) => {
                            let existed = false
                            const existedResult = (globalNetworkConfig.AppConfigs || []).map((i) => {
                                if (i.Type === e.Type) {
                                    existed = true
                                    return {...i, ...e}
                                }
                                return {...i}
                            })
                            if (!existed) {
                                existedResult.push(e)
                            }
                            const editItem = existedResult.find((ele) => ele.Type === e.Type)
                            if (editItem) {
                                const checkParams: GetSpaceEngineAccountStatusRequest = {
                                    Type: editItem.Type,
                                    Key: editItem.APIKey,
                                    Account: editItem.UserIdentifier
                                }
                                apiGetSpaceEngineAccountStatus(checkParams).then((value) => {
                                    switch (value.Status) {
                                        case "normal":
                                            const params = {...globalNetworkConfig, AppConfigs: existedResult}
                                            apiSetGlobalNetworkConfig(params).then(() => {
                                                onGetGlobalNetworkConfig()
                                                m.destroy()
                                            })
                                            break
                                        default:
                                            yakitNotify("error", "设置引擎失败:" + value.Info || value.Status)
                                            break
                                    }
                                })
                            }
                        }}
                        onCancel={() => m.destroy()}
                        isCanInput={false}
                    />
                </div>
            )
        })
    })
    const codecItem: YakParamProps = useCreation(() => {
        return {
            Field: "Filter",
            FieldVerbose: "搜索条件",
            Required: true,
            TypeVerbose: "yak",
            DefaultValue: "",
            Help: ""
        }
    }, [])
    const engineExtra: ReactNode = useCreation(() => {
        if (!engineStatus) return null
        return (
            <span className={styles["engine-help"]}>
                {engineStatus.Info ? `${engineStatus.Info}，` : ""}
                剩余额度：{Number(engineStatus.Remain) === -1 ? "无限制" : engineStatus.Remain}
                {engineStatus.Type === "zoomeye" && (
                    <span className={styles["engine-help-zoomeye"]} onClick={() => onOpenHelpModal()}>
                        <span>ZoomEye 基础语法</span> <OutlineQuestionmarkcircleIcon />
                    </span>
                )}
            </span>
        )
    }, [engineStatus])
    const onOpenHelpModal = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "ZoomEye 基础语法",
            type: "white",
            width: "60vw",
            cancelButtonProps: {style: {display: "none"}},
            onOkText: "我知道了",
            onOk: () => m.destroy(),
            bodyStyle: {padding: "8px 24px"},
            content: <ZoomeyeHelp />
        })
    })
    return (
        <>
            <Form.Item name='Type' label='引擎' rules={[{required: true}]} extra={engineExtra}>
                <YakitSelect
                    options={[
                        {label: "ZoomEye", value: "zoomeye"},
                        {label: "Fofa", value: "fofa"},
                        {label: "Hunter", value: "hunter"},
                        {label: "Shodan", value: "shodan"},
                        {label: "Quake", value: "quake"}
                    ]}
                    onSelect={onSelectType}
                    disabled={disabled}
                />
            </Form.Item>
            <OutputFormComponentsByType item={codecItem} codeType='plaintext' disabled={disabled} />
            <Form.Item name='MaxPage' label='最大页数' rules={[{required: true}]}>
                <YakitInputNumber min={1} type='horizontal' disabled={disabled} />
            </Form.Item>
            <Form.Item name='MaxRecord' label='最大记录数' rules={[{required: true}]}>
                <YakitInputNumber min={1} type='horizontal' disabled={disabled} />
            </Form.Item>
            <Form.Item
                name='ScanBeforeSave'
                label='扫描验证'
                rules={[{required: true}]}
                valuePropName='checked'
                tooltip={{
                    icon: <OutlineInformationcircleIcon />,
                    title: "开启扫描后会用Yakit的端口扫描进行验证"
                }}
            >
                <YakitSwitch size='large' disabled={disabled} />
            </Form.Item>
        </>
    )
})
