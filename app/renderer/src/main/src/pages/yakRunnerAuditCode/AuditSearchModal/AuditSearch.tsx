import React, {useEffect, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useDebounceFn, useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
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
import {AuditDetailItemProps, AuditYakUrlProps} from "../AuditCode/AuditCodeType"
import {getNameByPath, loadAuditFromYakURLRaw} from "../utils"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakURLResource} from "@/pages/webShell/yakURLTree/data"
import {AuditNodeSearchItem} from "../AuditCode/AuditCode"
import {AuditResultCollapse, YakRiskCodemirror} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {CodeRangeProps} from "../RightAuditDetail/RightAuditDetail"
import {AuditEmiterYakUrlProps, OpenFileByPathProps} from "../YakRunnerAuditCodeType"
import {Selection} from "../RunnerTabs/RunnerTabsType"
import {JumpToAuditEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
export const AuditSearchModal: React.FC<AuditSearchProps> = (props) => {
    const {visible, projectName, onClose} = props
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
        setRuntimeId: (rId) => {},
        isShowEnd: false
    })
    const [auditDetail, setAuditDetail] = useState<AuditDetailItemProps[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [activeInfo, setActivbeInfo] = useState<AuditDetailItemProps>()
    // 当前页数
    const [cureentPage, setCureentPage] = useState<number>(1)
    const resultIdRef = useRef<number>()

    const getData = useMemoizedFn(async (page: number, pageSize: number = 10) => {
        if (!resultIdRef.current) return
        setLoading(true)
        const params: AuditYakUrlProps = {
            Schema: "syntaxflow",
            Location: projectName,
            Path: `/${activeKey}`,
            Query: [{Key: "result_id", Value: resultIdRef.current}]
        }
        const result = await loadAuditFromYakURLRaw(params, undefined, page, pageSize)

        if (result) {
            const initAuditDetail = result.Resources.filter((item) => item.VerboseType !== "result_id").map(
                (item, index) => {
                    const {ResourceType, VerboseType, ResourceName, Size, Extra} = item
                    let value: string = `${index}`
                    const arr = Extra.filter((item) => item.Key === "index")
                    if (arr.length > 0) {
                        value = arr[0].Value
                    }
                    const newId = `/${value}`
                    return {
                        id: newId,
                        name: ResourceName,
                        ResourceType,
                        VerboseType,
                        Size,
                        Extra
                    }
                }
            )
            let isEnd: boolean = !!result.Resources.find((item) => item.VerboseType === "result_id")
            const newAuditDetail = page === 1 ? initAuditDetail : auditDetail.concat(initAuditDetail)
            if (isEnd) {
                setHasMore(false)
            }

            page === 1 && setIsRefresh(!isRefresh)
            setAuditDetail(newAuditDetail)
            setCureentPage(page)
        }
        setLoading(false)
    })

    useUpdateEffect(() => {
        const startLog = streamInfo.logState.find((item) => item.level === "json")
        if (startLog && startLog.data) {
            resultIdRef.current = startLog.data
            setHasMore(true)
            getData(1)
        }
    }, [streamInfo])

    useDebounceEffect(
        () => {
            rightContextRef.current?.destroy()
            onSearch()
        },
        [activeKey],
        {wait: 500}
    )

    const onSearch = useMemoizedFn(() => {
        if (keywords.length === 0) {
            setActivbeInfo(undefined)
            setAuditDetail([])
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
                    Value: projectName || ""
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

        apiDebugPlugin({params: requestParams, token: tokenRef.current, isShowStartInfo: false})
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
            setActivbeInfo(undefined)
            setAuditDetail([])
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

    const yakURLData = useMemo(() => {
        try {
            const Index = activeInfo?.Extra.find((item) => item.Key === "index")?.Value
            const CodeRange = activeInfo?.Extra.find((item) => item.Key === "code_range")?.Value
            const CodeFragment = activeInfo?.Extra.find((item) => item.Key === "source")?.Value
            if (Index && CodeRange && CodeFragment) {
                const code_range: CodeRangeProps = JSON.parse(CodeRange)
                return {
                    index: Index,
                    code_range,
                    source: CodeFragment,
                    ResourceName: activeInfo.name
                }
            }
        } catch (error) {}
    }, [activeInfo])

    const onJump = useMemoizedFn(async (data: AuditDetailItemProps) => {
        try {
            const arr = data.Extra.filter((item) => item.Key === "code_range")
            if (arr.length > 0) {
                const item: CodeRangeProps = JSON.parse(arr[0].Value)
                const {url, start_line, start_column, end_line, end_column} = item
                const name = await getNameByPath(url)
                // console.log("monaca跳转", item, name)
                const highLightRange: Selection = {
                    startLineNumber: start_line,
                    startColumn: start_column,
                    endLineNumber: end_line,
                    endColumn: end_column
                }
                const OpenFileByPathParams: OpenFileByPathProps = {
                    params: {
                        path: url,
                        name,
                        highLightRange
                    }
                }
                emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify(OpenFileByPathParams))
                // 纯跳转行号
                setTimeout(() => {
                    const obj: JumpToAuditEditorProps = {
                        selections: highLightRange,
                        path: url,
                        isSelect: false
                    }
                    emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
                }, 100)
                onClose && onClose()
            }
        } catch (error) {}
    })

    const rightContextRef = useRef<any>()
    const onContextMenu = useMemoizedFn((info) => {
        rightContextRef.current = showByRightContext({
            width: 180,
            data: [
                {
                    label: "跳转",
                    key: "jump"
                }
            ],
            onClick: ({key, keyPath}) => {
                switch (key) {
                    case "jump":
                        onJump(info)
                        break
                    default:
                        break
                }
            }
        })
    })

    return (
        <YakitHintWhite
            isDrag={true}
            visible={visible}
            onClose={() => onClose && onClose()}
            containerClassName={styles["hint-white-container"]}
            isResize={true}
            resizeMinWHeight={500}
            children={
                <div
                    className={styles["audit-search-box"]}
                    tabIndex={-1}
                    ref={keyDownRef}
                    onClick={() => {
                        // 此处 showByRightContext 不会正常关闭 因此需特殊处理
                        rightContextRef.current?.destroy()
                    }}
                >
                    <div className={styles["title"]}>搜索</div>
                    <div className={styles["header"]}>
                        <div className={styles["filter-box"]}>
                            <YakitInput.Search
                                ref={inputRef}
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                placeholder='请输入关键词搜索'
                                onSearch={onSearch}
                                allowClear={false}
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

                    <div className={styles["progress-opt"]}>
                        <Progress
                            size='small'
                            strokeColor='#F28B44'
                            trailColor='#F0F2F5'
                            percent={Math.floor((streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100)}
                        />

                        {/* <div className={styles["extra"]}>
                            <YakitButton danger onClick={onStopExecute} size='small'>
                                停止
                            </YakitButton>
                        </div> */}
                    </div>

                    {extraSettingData.length > 0 && (
                        <div className={styles["tabs-box"]}>
                            <YakitTabs
                                activeKey={activeKey}
                                onChange={(v) => {
                                    setActivbeInfo(undefined)
                                    setAuditDetail([])
                                    setActiveKey(v)
                                }}
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

                    <div
                        className={styles["search-list"]}
                        style={{
                            flex:1,
                            overflow:"hidden"
                        }}
                    >
                        <RollingLoadList<AuditDetailItemProps>
                            isRef={isRefresh}
                            data={auditDetail}
                            page={cureentPage} // response.Pagination.Page
                            hasMore={hasMore}
                            loadMoreData={() => {
                                // 请求下一页数据
                                getData(cureentPage + 1)
                            }}
                            loading={loading}
                            rowKey='name'
                            defItemHeight={23}
                            renderRow={(record, index: number) => (
                                <AuditNodeSearchItem
                                    info={record}
                                    foucsedKey={activeInfo?.id || ""}
                                    activeInfo={activeInfo}
                                    setActivbeInfo={setActivbeInfo}
                                    onJump={onJump}
                                    onContextMenu={onContextMenu}
                                />
                            )}
                        />
                    </div>

                    {yakURLData && (
                        <div className={styles["content"]}>
                            <YakRiskCodemirror info={yakURLData} />
                        </div>
                    )}
                </div>
            }
        />
    )
}
