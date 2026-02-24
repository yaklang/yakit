import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useInViewport,
    useMemoizedFn,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
import styles from "./AuditSearchModal.module.scss"
import {failed, success, warn, info, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {AuditSearchProps, ExtraSettingDataProps, ExtraSettingProps} from "./AuditSearchModalType"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {RemoteGV} from "@/yakitGV"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {YakitHintWhite} from "@/components/yakitUI/YakitHint/YakitHint"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import emiter from "@/utils/eventBus/eventBus"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {Progress} from "antd"
import {AuditDetailItemProps, AuditYakUrlProps} from "../AuditCode/AuditCodeType"
import {loadAuditFromYakURLRaw, onJumpByCodeRange} from "../utils"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {AuditNodeSearchItem} from "../AuditCode/AuditCode"
import {YakRiskCodemirror} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {CodeRangeProps} from "../RightAuditDetail/RightAuditDetail"
import {OpenFileByPathProps} from "../YakRunnerAuditCodeType"
import {Selection} from "../RunnerTabs/RunnerTabsType"
import {JumpToAuditEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"
import {KVPair} from "@/models/kv"
import { JSONParseLog } from "@/utils/tool"

let selectedSearchVal: string = ""
export const onSetSelectedSearchVal = (v: string = "") => {
    selectedSearchVal = v
}

export const AuditSearchModal: React.FC<AuditSearchProps> = memo((props) => {
    const {visible, projectName, onClose} = props
    const [checked, setChecked] = useState<boolean>(true)
    const [keywords, setKeywords] = useState<string>("")
    const [extraSettingData, setExtraSettingData] = useState<ExtraSettingDataProps[]>([])
    const [activeKey, setActiveKey] = useState<string>("all")
    const [executing, setExecuting, getExecuting] = useGetState<boolean>(false)
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
    const [activeInfo, setActiveInfo, getActiveInfo] = useGetState<AuditDetailItemProps>()
    // 当前页数
    const [cureentPage, setCureentPage] = useState<number>(1)
    const resultIdRef = useRef<number>()
    const [scrollToNumber, setScrollToNumber] = useState<number>()

    useEffect(() => {
        setActiveInfo(undefined)
        setAuditDetail([])
        setActiveKey("all")
        setKeywords("")
        onStopExecute()
    }, [projectName])

    const getData = useMemoizedFn(async (page: number, pageSize: number = 10) => {
        try {
            if (!resultIdRef.current) return
            setLoading(true)
            const params: AuditYakUrlProps = {
                Schema: "syntaxflow",
                Location: projectName,
                Path: `/${activeKey}`,
                Query: [
                    {Key: "result_id", Value: resultIdRef.current},
                    {Key: "have_range", Value: "true"}
                ]
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
                if (page === 1) {
                    setIsRefresh(!isRefresh)
                    if (newAuditDetail.length > 0) {
                        setActiveInfo(newAuditDetail[0])
                    }
                }
                setAuditDetail(newAuditDetail)
                setCureentPage(page)
            }
            setLoading(false)
        } catch (error) {}
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

    const onSearch = useMemoizedFn((newKeywords: string = "") => {
        setActiveInfo(undefined)
        setAuditDetail([])
        if (newKeywords.length === 0 && keywords.length === 0) {
            return
        }
        if (executing) {
            warn("请等待上一次搜索结束")
            return
        }
        let requestParamsExecParams: KVPair[] = [
            {
                Key: "progName",
                Value: projectName || ""
            },
            {
                Key: "rule",
                Value: newKeywords || keywords
            },
            {
                Key: "kind",
                Value: activeKey
            }
        ]
        if (checked) {
            requestParamsExecParams.push({
                Key: "fuzz",
                Value: `${checked}`
            })
        }
        const requestParams: DebugPluginRequest = {
            Code: "",
            PluginType: "yak",
            Input: "",
            HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
            ExecParams: requestParamsExecParams,
            PluginName: "SyntaxFlow Searcher"
        }
        debugPluginStreamEvent.reset()
        apiDebugPlugin({params: requestParams, token: tokenRef.current, isShowStartInfo: false})
            .then(() => {
                debugPluginStreamEvent.start()
                setExecuting(true)
            })
            .catch(() => {})
    })

    // 获取参数
    const handleFetchParams = useDebounceFn(
        useMemoizedFn(async () => {
            try {
                const newPlugin = await grpcFetchLocalPluginDetail({Name: "SyntaxFlow Searcher"}, true)
                const ExtraSetting = newPlugin?.Params.find((item) => item.Field === "kind")?.ExtraSetting || ""
                let obj = JSONParseLog(ExtraSetting, {page: "AuditSearch", fun: "handleFetchParams"}) as ExtraSettingProps
                setExtraSettingData(obj.data)
            } catch (error) {}
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
            setActiveInfo(undefined)
            setAuditDetail([])
            setActiveKey(extraSettingData[nextIndex].value)
        }
    })

    const onPreviousSearchTabFun = useMemoizedFn(() => {
        if (visible && extraSettingData.length > 0) {
            const currentIndex = extraSettingData.findIndex((item) => item.value === activeKey)
            const nextIndex = currentIndex === 0 ? extraSettingData.length - 1 : currentIndex - 1
            setActiveInfo(undefined)
            setAuditDetail([])
            setActiveKey(extraSettingData[nextIndex].value)
        }
    })

    const onSetActiveInfo = useMemoizedFn((type: "next" | "last") => {
        if (activeInfo) {
            const cureentIndex = auditDetail.findIndex((item) => item.id === activeInfo.id)
            if (type === "next") {
                let nextIndex = cureentIndex + 1 > auditDetail.length - 1 ? cureentIndex : cureentIndex + 1
                setActiveInfo(auditDetail[nextIndex])
                setScrollToNumber(nextIndex)
            }
            if (type === "last") {
                let lastIndex = cureentIndex - 1 < 0 ? cureentIndex : cureentIndex - 1
                setActiveInfo(auditDetail[lastIndex])
                setScrollToNumber(lastIndex)
            }
        } else {
            if (auditDetail.length > 0) {
                setActiveInfo(auditDetail[0])
                setScrollToNumber(0)
            }
        }
    })

    const keyDownRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(keyDownRef)

    useShortcutKeyTrigger("searchTab*aduit", () => {
        if (inViewport) {
            if (getExecuting()) {
                warn("当前已有搜索，请等待完毕后切换")
            } else {
                onNextSearchTabFun()
            }
        }
    })

    useShortcutKeyTrigger("searchArrowUp*aduit", () => {
        if (inViewport) {
            onSetActiveInfo("last")
        }
    })

    useShortcutKeyTrigger("searchArrowDown*aduit", () => {
        if (inViewport) {
            onSetActiveInfo("next")
        }
    })

    useShortcutKeyTrigger("searchEscape*aduit", () => {
        if (inViewport) {
            onClose && onClose()
        }
    })

    useShortcutKeyTrigger("searchEnter*aduit", () => {
        if (inViewport) {
            activeInfo && onJump(activeInfo)
        }
    })

    const onStopExecute = useMemoizedFn(() => {
        keyDownRef.current?.focus()
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
    })

    const inputRef = useRef<any>(null)
    useEffect(() => {
        visible && inputRef.current?.focus()
        if (visible && selectedSearchVal !== keywords && selectedSearchVal.length !== 0) {
            onSelectKeywords(selectedSearchVal)
        }
    }, [visible])

    const yakURLData = useMemo(() => {
        try {
            const Index = activeInfo?.Extra.find((item) => item.Key === "index")?.Value
            const CodeRange = activeInfo?.Extra.find((item) => item.Key === "code_range")?.Value
            const CodeFragment = activeInfo?.Extra.find((item) => item.Key === "source")?.Value
            if (Index && CodeRange && CodeFragment) {
                const code_range: CodeRangeProps = JSONParseLog(CodeRange, {page: "AuditSearch", fun: "yakURLData"})
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
        onJumpByCodeRange(data).then(() => {
            onClose && onClose()
        })
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

    const onSelectKeywords = useMemoizedFn((value) => {
        inputRef.current?.focus()
        setKeywords(value)
        onSearch(value)
    })

    const onDebounceSearch = useDebounceFn(
        (value) => {
            onSearch(value)
        },
        {wait: 500}
    ).run

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
                                onChange={(e) => {
                                    setKeywords(e.target.value)
                                    onDebounceSearch(e.target.value)
                                }}
                                placeholder='请输入关键词搜索'
                                allowClear={false}
                                onSearch={() => {
                                    onSearch()
                                }}
                                onPressEnter={(e) => e.preventDefault()}
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

                    {extraSettingData.length > 0 && (
                        <div className={styles["tabs-box"]}>
                            <YakitTabs
                                activeKey={activeKey}
                                onChange={(v) => {
                                    if (executing) {
                                        warn("当前已有搜索，请等待完毕后切换")
                                        return
                                    }
                                    setActiveInfo(undefined)
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
                    <>
                        {executing ? (
                            <div className={styles["progress-opt"]}>
                                <Progress
                                    size='small'
                                    strokeColor='var(--Colors-Use-Main-Primary)'
                                    trailColor='var(--Colors-Use-Neutral-Bg-Hover)'
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
                        ) : (
                            <>
                                <div
                                    className={styles["search-list"]}
                                    style={{
                                        flex: 1,
                                        overflow: "hidden"
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
                                        rowKey='id'
                                        defItemHeight={23}
                                        numberRoll={scrollToNumber}
                                        renderRow={(record, index: number) => (
                                            <AuditNodeSearchItem
                                                info={record}
                                                foucsedKey={activeInfo?.id || ""}
                                                activeInfo={activeInfo}
                                                setActiveInfo={setActiveInfo}
                                                onJump={onJump}
                                                onContextMenu={onContextMenu}
                                            />
                                        )}
                                    />
                                </div>

                                {yakURLData && (
                                    <div className={styles["content"]}>
                                        <YakRiskCodemirror
                                            info={yakURLData}
                                            editorDidMount={(editor) => {
                                                editor.on("dblclick", (cm, event) => {
                                                    // cm 是 CodeMirror 实例
                                                    // event 是原生的双击事件对象
                                                    const newActiveInfo = getActiveInfo()
                                                    newActiveInfo && onJump(newActiveInfo)

                                                    // 获取光标位置
                                                    // const cursor = cm.getCursor();
                                                    // console.log("光标位置:", cursor);

                                                    // 获取选中的文本
                                                    // const selectedText = cm.getSelection();
                                                    // console.log("选中的文本:", selectedText);
                                                })
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </>
                </div>
            }
        />
    )
})
