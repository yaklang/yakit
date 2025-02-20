import React, {useEffect, useMemo, useRef, useState} from "react"
import {useDebounceFn, useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./AuditSearchModal.module.scss"
import {failed, success, warn, info, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {AuditSearchProps, ExtraSettingDataProps, ExtraSettingProps} from "./AuditSearchModalType"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {defYakitAutoCompleteRef, YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {RemoteGV} from "@/yakitGV"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {YakScript} from "@/pages/invoker/schema"
import {YakitHintWhite} from "@/components/yakitUI/YakitHint/YakitHint"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import emiter from "@/utils/eventBus/eventBus"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {Progress} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AuditYakUrlProps} from "../AuditCode/AuditCodeType"
import {loadAuditFromYakURLRaw} from "../utils"
export const AuditSearchModal: React.FC<AuditSearchProps> = (props) => {
    const {visible, programName, onClose} = props
    const [checked, setChecked] = useState<boolean>(true)
    const [keywords, setKeywords] = useState<string>("")
    const [extraSettingData, setExtraSettingData] = useState<ExtraSettingDataProps[]>([])
    const [activeKey, setActiveKey] = useState<string>("all")
    const [executing, setExecuting] = useState<boolean>(false)
    const tokenRef = useRef<string>(randomString(40))
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setExecuting(false)
        },
        onError: () => {},
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
        }
    })

    console.log("streamInfo---", streamInfo)

    const getData = useMemoizedFn(async (result_id: number) => {
        const params: AuditYakUrlProps = {
            Schema: "syntaxflow",
            Location: programName,
            Path: `/${activeKey}`,
            Query: [{Key: "result_id", Value: result_id}]
        }
        const result = await loadAuditFromYakURLRaw(params)
        console.log("result---", result)
    })

    useUpdateEffect(() => {
        const startLog = streamInfo.logState.find((item) => item.level === "json")
        if (startLog && startLog.data) {
            getData(startLog.data)
        }
    }, [streamInfo,activeKey])

    const onSearch = useMemoizedFn(() => {
        if (keywords.length === 0) {
            warn("请输入关键词")
            return
        }
        if (executing) {
            warn("搜索进行中")
            return
        }
        const requestParams: DebugPluginRequest = {
            Code: "",
            PluginType: "yak",
            Input: "",
            HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
            ExecParams: [
                {
                    Key: "progName",
                    Value: programName || ""
                },
                {
                    Key: "rule",
                    Value: keywords
                },
                {
                    Key: "kind",
                    Value: activeKey
                },
                {
                    Key: "fuzz",
                    Value: `${checked}`
                }
            ],
            PluginName: "SyntaxFlow Searcher"
        }
        console.log("requestParams---", requestParams)

        apiDebugPlugin({params: requestParams, token: tokenRef.current})
            .then(() => {
                debugPluginStreamEvent.start()
                setExecuting(true)
            })
            .catch(() => {})
    })

    const onPressEnter = useMemoizedFn((e) => {
        onSearch()
    })

    // 获取参数
    const handleFetchParams = useDebounceFn(
        useMemoizedFn(async () => {
            const newPlugin = await grpcFetchLocalPluginDetail({Name: "SyntaxFlow Searcher"}, true)
            const ExtraSetting = newPlugin?.Params.find((item) => item.Field === "kind")?.ExtraSetting || ""
            let obj = JSON.parse(ExtraSetting) as ExtraSettingProps
            console.log("ooioo", obj, newPlugin)
            setExtraSettingData(obj.data)
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        handleFetchParams()
    }, [])

    const onNextSearchTabFun = useMemoizedFn(() => {
        if (visible && extraSettingData.length > 0) {
            const currentIndex = extraSettingData.findIndex((item) => item.value === activeKey)
            const nextIndex = currentIndex === extraSettingData.length - 1 ? 0 : currentIndex + 1
            setActiveKey(extraSettingData[nextIndex].value)
        }
    })

    const handleKeyPress = (event) => {
        const {key} = event
        if (key === "Tab") {
            onNextSearchTabFun()
            event.preventDefault()
        }
    }
    const keyDownRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (keyDownRef.current) {
            keyDownRef.current.addEventListener("keydown", handleKeyPress)
        }
        return () => {
            // 在组件卸载时移除事件监听器
            if (keyDownRef.current) {
                keyDownRef.current.removeEventListener("keydown", handleKeyPress)
            }
        }
    }, [])

    const onStopExecute = useMemoizedFn(() => {
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
    })

    const inputRef = useRef<any>(null)
    useEffect(() => {
        visible && inputRef.current?.focus()
    }, [visible])

    return (
        <YakitHintWhite
            isDrag={true}
            visible={visible}
            onClose={() => onClose && onClose()}
            containerClassName={styles["hint-white-container"]}
            children={
                <div className={styles["audit-search-box"]} tabIndex={-1} ref={keyDownRef}>
                    <div className={styles["title"]}>搜索</div>
                    <div className={styles["header"]}>
                        <div className={styles["filter-box"]}>
                            <YakitInput.Search
                                ref={inputRef}
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                placeholder='请输入关键词搜索'
                                onSearch={onSearch}
                                onPressEnter={onPressEnter}
                            />
                        </div>
                        <div className={styles["extra"]}>
                            <YakitCheckbox
                                checked={checked}
                                onChange={(e) => {
                                    setChecked(e.target.checked)
                                }}
                                className={styles["checked-box"]}
                            >
                                模糊搜索
                            </YakitCheckbox>
                        </div>
                    </div>
                    {executing && (
                        <div className={styles["progress-opt"]}>
                            <Progress
                                strokeColor='#F28B44'
                                trailColor='#F0F2F5'
                                percent={Math.floor(
                                    (streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100
                                )}
                            />

                            <div className={styles["extra"]}>
                                <YakitButton danger onClick={onStopExecute} size='small'>
                                    停止
                                </YakitButton>
                            </div>
                        </div>
                    )}
                    {extraSettingData.length > 0 && (
                        <div className={styles["tabs-box"]}>
                            <YakitTabs
                                activeKey={activeKey}
                                onChange={(v) => setActiveKey(v)}
                                tabBarStyle={{marginBottom: 5}}
                                className='scan-port-tabs no-theme-tabs'
                            >
                                {extraSettingData.map((item) => {
                                    return (
                                        <YakitTabs.YakitTabPane
                                            tab={item.label}
                                            key={item.value}
                                        ></YakitTabs.YakitTabPane>
                                    )
                                })}
                            </YakitTabs>
                        </div>
                    )}
                </div>
            }
        />
    )
}
