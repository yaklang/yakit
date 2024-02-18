import React, {useEffect, useRef, useState} from "react"
import styles from "./SpaceEnginePage.module.scss"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {ExpandAndRetract} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute, YakitRouteToPageInfo} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {Form} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    GetSpaceEngineStatusProps,
    apiCancelFetchPortAssetFromSpaceEngine,
    apiFetchPortAssetFromSpaceEngine,
    apiGetGlobalNetworkConfig,
    apiGetSpaceEngineStatus,
    apiSetGlobalNetworkConfig
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {GlobalNetworkConfig, defaultParams} from "@/components/configNetwork/ConfigNetworkPage"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ThirdPartyApplicationConfigForm} from "@/components/configNetwork/ThirdPartyApplicationConfig"
import {OutputFormComponentsByType} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "../plugins/pluginsType"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {getDefaultSpaceEngineStartParams} from "@/models/SpaceEngine"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import classNames from "classnames"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"

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
    const [scanBeforeSave, setScanBeforeSave] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")

    const spaceEngineWrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(spaceEngineWrapperRef)
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
            setTimeout(() => setIsExecuting(false), 300)
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
        apiFetchPortAssetFromSpaceEngine(value, tokenRef.current).then(() => {
            setIsExecuting(true)
            onExpand()
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
    const onClearExecuteResult = useMemoizedFn((e) => {
        e.stopPropagation()
        spaceEngineStreamEvent.reset()
        setRuntimeId("")
        onExpand()
        yakitNotify("success", "执行结果清除成功")
    })
    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    return (
        <div className={styles["space-engine-wrapper"]} ref={spaceEngineWrapperRef}>
            <ExpandAndRetract className={styles["space-engine-heard"]} onExpand={onExpand} isExpand={isExpand}>
                <span className={styles["space-engine-heard-tabName"]}>{tabName}</span>
                <div>
                    {runtimeId && (
                        <YakitButton type='text' danger onClick={onClearExecuteResult}>
                            清除执行结果
                        </YakitButton>
                    )}
                    {isExecuting ? (
                        <>
                            <YakitButton danger onClick={onStopExecute}>
                                停止
                            </YakitButton>
                        </>
                    ) : (
                        <></>
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
                        disabled={isExecuting}
                    >
                        <SpaceEngineFormContent disabled={isExecuting} />
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
                    <PluginExecuteResult
                        streamInfo={streamInfo}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        pluginType={""}
                    />
                )}
            </div>
        </div>
    )
})
interface SpaceEngineFormContentProps {
    disabled: boolean
}
const SpaceEngineFormContent: React.FC<SpaceEngineFormContentProps> = React.memo((props) => {
    const {disabled} = props
    const [globalNetworkConfig, setGlobalNetworkConfig] = useState<GlobalNetworkConfig>(defaultParams)
    useEffect(() => {
        onGetGlobalNetworkConfig()
    }, [])
    const onSelectType = useMemoizedFn((key) => {
        const param: GetSpaceEngineStatusProps = {
            Type: key
        }
        apiGetSpaceEngineStatus(param).then((value) => {
            if (value.Status === "empty_key") {
                onSetGlobalNetworkConfig(key)
            }
        })
    })
    /**获取全局网络配置 */
    const onGetGlobalNetworkConfig = useMemoizedFn(() => {
        apiGetGlobalNetworkConfig().then(setGlobalNetworkConfig)
    })
    /**设置第三方应用配置 */
    const onSetGlobalNetworkConfig = useMemoizedFn((type) => {
        let m = showYakitModal({
            title: "添加第三方应用",
            width: 600,
            okButtonProps: {hidden: true},
            closable: true,
            maskClosable: false,
            content: (
                <div style={{margin: 24}}>
                    <ThirdPartyApplicationConfigForm
                        data={{
                            APIKey: "",
                            Domain: "",
                            Namespace: "",
                            Type: type,
                            UserIdentifier: "",
                            UserSecret: "",
                            WebhookURL: ""
                        }}
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
                            const params = {...globalNetworkConfig, AppConfigs: existedResult}
                            apiSetGlobalNetworkConfig(params).then(() => {
                                onGetGlobalNetworkConfig()
                                m.destroy()
                            })
                        }}
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
    return (
        <>
            <Form.Item name='Type' label='引擎' rules={[{required: true}]}>
                <YakitSelect
                    options={[
                        {label: "ZoomEye", value: "zoomeye"},
                        {label: "Fofa", value: "fofa"},
                        {label: "Hunter", value: "hunter"},
                        {label: "Shodan", value: "shodan"},
                        {label: "Quake", value: "quake"}
                    ]}
                    onSelect={onSelectType}
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
                <YakitSwitch size='large' />
            </Form.Item>
        </>
    )
})
