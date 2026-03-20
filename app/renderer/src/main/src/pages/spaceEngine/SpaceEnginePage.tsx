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
    GetSpaceEngineStatusProps,
    apiCancelFetchPortAssetFromSpaceEngine,
    apiFetchPortAssetFromSpaceEngine,
    apiGetGlobalNetworkConfig,
    apiGetSpaceEngineAccountStatus,
    apiGetSpaceEngineStatus,
    apiSetGlobalNetworkConfig,
    handleAIConfig
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {
    GlobalNetworkConfig,
    ThirdPartyApplicationConfig,
    defaultParams
} from "@/components/configNetwork/ConfigNetworkPage"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
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
import NewThirdPartyApplicationConfig from "@/components/configNetwork/NewThirdPartyApplicationConfig"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

interface SpaceEnginePageProps {
    /**页面id */
    pageId: string
}

export const SpaceEnginePage: React.FC<SpaceEnginePageProps> = React.memo((props) => {
    const {t, i18n} = useI18nNamespaces(["spaceEngine", "yakitUi"])
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
                {tabName: t("SpaceEnginePage.scanPortList"), type: "port"},
                {tabName: t("SpaceEnginePage.logs"), type: "log"},
                {tabName: "Console", type: "console"}
            ]
        }
        return [
            {tabName: t("SpaceEnginePage.logs"), type: "log"},
            {tabName: "Console", type: "console"}
        ]
    }, [scanBeforeSave, i18n.language])

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
            yakitNotify("info", t("SpaceEnginePage.taskStartSuccess", {id: rId}))
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
            Concurrent: 20,
            RandomDelay: value?.RandomDelay ?? 0,
            RetryTimes: value?.RetryTimes ?? 3
        }
        console.log("SpaceEngine 执行参数:", params)
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
                                      {t("YakitButton.stop")}
                                  </YakitButton>
                              </>
                          )
                        : !isExpand && (
                              <>
                                  <YakitButton onClick={onExecuteInTop}>{t("YakitButton.execute")}</YakitButton>
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
                            required: t("YakitForm.requiredField")
                        }}
                        labelWrap={true}
                        initialValues={getDefaultSpaceEngineStartParams()}
                    >
                        <SpaceEngineFormContent disabled={isExecuting} inViewport={inViewport} />
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <div className={styles["space-engine-form-operate"]}>
                                {isExecuting ? (
                                    <YakitButton danger onClick={onStopExecute} size='large'>
                                        {t("YakitButton.stop")}
                                    </YakitButton>
                                ) : (
                                    <YakitButton
                                        className={styles["space-engine-form-operate-start"]}
                                        htmlType='submit'
                                        size='large'
                                    >
                                        {t("YakitButton.start_execution")}
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
    const {t, i18n} = useI18nNamespaces(["spaceEngine"])
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
                    yakitNotify(
                        "error",
                        t("SpaceEngineFormContent.spaceEngineVerifyFailed") + value.Info || value.Status
                    )
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
            Type: type
        }

        const extraParamsArr = initData.ExtraParams || []
        const extraParams = {}
        extraParamsArr.forEach((item) => {
            extraParams[item.Key] = item.Value
        })

        let m = showYakitModal({
            title: t("SpaceEngineFormContent.addThirdPartyApp"),
            width: 600,
            closable: true,
            maskClosable: false,
            footer: null,
            content: (
                <>
                    <div className={styles["ai-describe"]}>{t("SpaceEngineFormContent.pleaseConfigureApiKey")}</div>

                    <NewThirdPartyApplicationConfig
                        formValues={{
                            Type: initData.Type,
                            ...extraParams
                        }}
                        disabledType={true}
                        onAdd={(e) => {
                            // 不影响ai优先级
                            const updatedValue = handleAIConfig(
                                {
                                    AppConfigs: globalNetworkConfig.AppConfigs,
                                    AiApiPriority: globalNetworkConfig.AiApiPriority
                                },
                                e
                            )
                            if (!updatedValue) return
                            const editItem = updatedValue?.AppConfigs.find((ele) => ele.Type === e.Type)
                            if (editItem) {
                                apiGetSpaceEngineAccountStatus(editItem).then((value) => {
                                    switch (value.Status) {
                                        case "normal":
                                            const params = {
                                                ...globalNetworkConfig,
                                                AppConfigs: updatedValue?.AppConfigs,
                                                AiApiPriority: updatedValue?.AiApiPriority
                                            }
                                            apiSetGlobalNetworkConfig(params).then(() => {
                                                onGetGlobalNetworkConfig()
                                                m.destroy()
                                            })
                                            break
                                        default:
                                            yakitNotify(
                                                "error",
                                                t("SpaceEngineFormContent.setEngineFailed") + value.Info || value.Status
                                            )
                                            break
                                    }
                                })
                            }
                        }}
                        onCancel={() => m.destroy()}
                    />
                </>
            )
        })
    })
    const codecItem: YakParamProps = useCreation(() => {
        return {
            Field: "Filter",
            FieldVerbose: t("SpaceEngineFormContent.searchCondition"),
            Required: true,
            TypeVerbose: "yak",
            DefaultValue: "",
            Help: ""
        }
    }, [i18n.language])
    const engineExtra: ReactNode = useCreation(() => {
        if (!engineStatus) return null
        return (
            <span className={styles["engine-help"]}>
                {engineStatus.Info ? `${engineStatus.Info}，` : ""}
                {t("SpaceEngineFormContent.remainingQuota")}
                {Number(engineStatus.Remain) === -1 ? t("SpaceEngineFormContent.unlimited") : engineStatus.Remain}
                {engineStatus.Type === "zoomeye" && (
                    <span className={styles["engine-help-zoomeye"]} onClick={() => onOpenHelpModal()}>
                        <span>{t("SpaceEngineFormContent.zoomeyeBasicSyntax")}</span> <OutlineQuestionmarkcircleIcon />
                    </span>
                )}
            </span>
        )
    }, [engineStatus])
    const onOpenHelpModal = useMemoizedFn(() => {
        const m = showYakitModal({
            title: t("SpaceEngineFormContent.zoomeyeBasicSyntax"),
            type: "white",
            width: "60vw",
            cancelButtonProps: {style: {display: "none"}},
            okText: t("SpaceEngineFormContent.gotIt"),
            onOk: () => m.destroy(),
            bodyStyle: {padding: "8px 24px"},
            content: <ZoomeyeHelp />
        })
    })
    return (
        <>
            <Form.Item
                name='Type'
                label={t("SpaceEngineFormContent.engine")}
                rules={[{required: true}]}
                extra={engineExtra}
            >
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
            <Form.Item name='MaxPage' label={t("SpaceEngineFormContent.maxPage")} rules={[{required: true}]}>
                <YakitInputNumber min={1} type='horizontal' disabled={disabled} />
            </Form.Item>
            <Form.Item name='MaxRecord' label={t("SpaceEngineFormContent.maxRecord")} rules={[{required: true}]}>
                <YakitInputNumber min={1} type='horizontal' disabled={disabled} />
            </Form.Item>
            <Form.Item
                name='RandomDelay'
                label={t("SpaceEngineFormContent.randomDelay")}
                rules={[{required: true}]}
                tooltip={{
                    icon: <OutlineInformationcircleIcon />,
                    title: t("SpaceEngineFormContent.randomDelayHelp")
                }}
            >
                <YakitInputNumber min={0} type='horizontal' disabled={disabled} />
            </Form.Item>
            <Form.Item name='RetryTimes' label={t("SpaceEngineFormContent.retryTimes")} rules={[{required: true}]}>
                <YakitInputNumber min={0} type='horizontal' disabled={disabled} />
            </Form.Item>
            <Form.Item
                name='ScanBeforeSave'
                label={t("SpaceEngineFormContent.scanVerification")}
                rules={[{required: true}]}
                valuePropName='checked'
                tooltip={{
                    icon: <OutlineInformationcircleIcon />,
                    title: t("SpaceEngineFormContent.scanVerificationHelp")
                }}
            >
                <YakitSwitch size='large' disabled={disabled} />
            </Form.Item>
        </>
    )
})
