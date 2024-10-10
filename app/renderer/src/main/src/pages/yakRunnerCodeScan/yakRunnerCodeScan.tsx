import React, {useEffect, useRef, useState} from "react"
import {
    CodeScaMainExecuteContentProps,
    CodeScanByGroupProps,
    CodeScanExecuteContentProps,
    CodeScanExecuteLogProps,
    CodeScanGroupByKeyWordItemProps,
    CodeScanGroupByKeyWordProps,
    YakRunnerCodeScanProps
} from "./YakRunnerCodeScanType"
import {Divider, Form, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useControllableValue, useCreation, useGetState, useInViewport, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./YakRunnerCodeScan.module.scss"
import {failed, success, warn, info, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlinCompileIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineCloseIcon,
    OutlineOpenIcon
} from "@/assets/icon/outline"
import {defYakitAutoCompleteRef, YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {RemoteGV} from "@/yakitGV"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {GroupCount} from "../invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ExpandAndRetract} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {PluginExecuteProgress} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import useHoldBatchGRPCStream from "@/hook/useHoldBatchGRPCStream/useHoldBatchGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {CodeScanExecuteResult} from "./CodeScanExecuteResult/CodeScanExecuteResult"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {grpcFetchAuditTree} from "../YakRunnerAuditCode/utils"
import { YakitEmpty } from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import { addToTab } from "../MainTabs"
const {ipcRenderer} = window.require("electron")

const CodeScanGroupByKeyWord: React.FC<CodeScanGroupByKeyWordProps> = React.memo((props) => {
    const {inViewport} = props
    const [selectGroupList, setSelectGroupList] = useControllableValue<string[]>(props, {
        defaultValue: [],
        valuePropName: "selectGroupListByKeyWord",
        trigger: "setSelectGroupListByKeyWord"
    })
    const [keywords, setKeywords] = useState<string>("")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [response, setResponse] = useState<GroupCount[]>([])
    const [isRef, setIsRef] = useState<boolean>(false)
    const codeScanKeywordsRef = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })

    useEffect(() => {
        if (inViewport) init()
    }, [inViewport])

    const init = useMemoizedFn(() => {
        setLoading(true)
        // getQueryYakScriptGroup()
        //     .then((res) => {
        //         initialResponseRef.current = res
        //         setResponseToSelect(res)
        //         if (response.length === 0) {
        //             setResponse(res)
        //         }
        //     })
        //     .finally(() =>
        //         setTimeout(() => {
        //             setLoading(false)
        //         }, 200)
        //     )
    })

    const indeterminate: boolean = useCreation(() => {
        return false
    }, [])

    const checked: boolean = useCreation(() => {
        return allCheck
    }, [])

    const onSearch = useMemoizedFn((val) => {
        if (!val) {
        }
    })
    const onPressEnter = useMemoizedFn((e) => {
        console.log("e.target.value", e.target.value)
    })
    const onSelectKeywords = useMemoizedFn((value) => {
        console.log("value", value)
    })
    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
    })

    const onClearSelect = useMemoizedFn(() => {
        setSelectGroupList([])
        setAllCheck(false)
    })

    const onSelect = useMemoizedFn((val: GroupCount) => {})
    return (
        <div className={classNames(styles["code-scan-group-wrapper"])}>
            <div className={styles["filter-wrapper"]}>
                <div className={styles["header-search"]}>
                    <YakitAutoComplete
                        ref={codeScanKeywordsRef}
                        isCacheDefaultValue={false}
                        cacheHistoryDataKey={RemoteGV.CodeScanKeywords}
                        onSelect={onSelectKeywords}
                        value={keywords}
                        style={{flex: 1}}
                    >
                        <YakitInput.Search
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder='请输入关键词搜索'
                            onSearch={onSearch}
                            onPressEnter={onPressEnter}
                            size='large'
                        />
                    </YakitAutoComplete>
                </div>
                <div className={styles["filter-body"]}>
                    <div className={styles["filter-body-left"]}>
                        <YakitCheckbox indeterminate={indeterminate} checked={checked} onChange={onSelectAll}>
                            全选
                        </YakitCheckbox>
                        <span className={styles["count-num"]}>
                            Total<span className={styles["num-style"]}>{20}</span>
                        </span>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <span className={styles["count-num"]}>
                            Selected<span className={styles["num-style"]}>{3}</span>
                        </span>
                    </div>
                    <div className={styles["filter-body-right"]}>
                        <YakitButton type='text' danger onClick={onClearSelect}>
                            清空
                        </YakitButton>
                    </div>
                </div>
            </div>

            <RollingLoadList<GroupCount>
                data={[]}
                loadMoreData={() => {}}
                renderRow={(rowData: GroupCount, index: number) => {
                    const checked = selectGroupList.includes(rowData.Value)
                    return <CodeScanGroupByKeyWordItem item={rowData} onSelect={onSelect} selected={checked} />
                }}
                page={1}
                hasMore={false}
                loading={loading}
                defItemHeight={70}
                isGridLayout
                defCol={3}
                classNameList={styles["group-list-wrapper"]}
                rowKey='Value'
                isRef={isRef}
            />
        </div>
    )
})

export const YakRunnerCodeScan: React.FC<YakRunnerCodeScanProps> = (props) => {
    const [pageInfo, setPageInfo] = useState<any>()
    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    // 如若没有已编译项目则需跳转至审计编译
    const [isShowAuditCode, setShowAuditCode] = useState<boolean>(false)

    const pluginGroupRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginGroupRef)

    const onClose = useMemoizedFn(() => {
        setHidden(true)
    })

    const onSetSelectGroupList = useMemoizedFn((groups) => {
        setPageInfo((v) => ({...v, selectGroup: groups}))
    })

    const onClearAll = useMemoizedFn(() => {
        setPageInfo((v) => ({...v, selectGroup: [], selectGroupListByKeyWord: []}))
        setHidden(false)
    })

    const selectGroupListAll = useCreation(() => {
        return []
    }, [])

    const getAduitList = useMemoizedFn(async () => {
        try {
            setLoading(true)
            const {res} = await grpcFetchAuditTree("/")
            if (res.Resources.length === 0) {
                setShowAuditCode(true)
            }
            setLoading(false)
        } catch (error) {
            setLoading(false)
        }
    })

    useEffect(() => {
        getAduitList()
    }, [])
    return (
        <>
            <YakitSpin spinning={loading}>
                {isShowAuditCode ? (
                    <div className={styles["no-audit"]}>
                        <YakitEmpty
                            title='暂无数据'
                            description='请先进行审计'
                            children={
                                <div className={styles["footer"]}>
                                    <YakitButton
                                        icon={<OutlinCompileIcon />}
                                        onClick={() => {
                                            addToTab("**yak-runner-audit-code")
                                        }}
                                    >
                                        代码审计
                                    </YakitButton>
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <div className={styles["yakrunner-codec-scan"]}>
                        <div
                            className={classNames(styles["left-wrapper"], {
                                [styles["left-wrapper-hidden"]]: hidden
                            })}
                        >
                            <div className={styles["left-header-search"]}>
                                <div className={styles["header-type-wrapper"]}>
                                    <span className={styles["header-text"]}>扫描规则</span>
                                </div>
                                <Tooltip title='收起' placement='top' overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        type='text2'
                                        onClick={onClose}
                                        icon={<OutlineCloseIcon className={styles["header-icon"]} />}
                                    ></YakitButton>
                                </Tooltip>
                            </div>
                            <CodeScanGroupByKeyWord inViewport={inViewport} />
                        </div>
                        <CodeScanExecuteContent
                            hidden={hidden}
                            setHidden={setHidden}
                            selectGroupList={selectGroupListAll}
                            onClearAll={onClearAll}
                        />
                    </div>
                )}
            </YakitSpin>
        </>
    )
}

const CodeScanByGroup: React.FC<CodeScanByGroupProps> = React.memo((props) => {
    const {hidden} = props
    const isLoadingRef = useRef<boolean>(true)
    const [response, setResponse] = useState<any>()
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)

    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        // fetchList()
    })
    return (
        <div
            className={classNames(styles["code-scan-by-group-wrapper"], {
                [styles["code-scan-by-group-wrapper-hidden"]]: hidden
            })}
        >
            <RollingLoadList<any>
                data={[]}
                loadMoreData={onUpdateList}
                renderRow={(info: any, i: number) => {
                    return <div className={styles[""]}></div>
                }}
                page={1}
                hasMore={hasMore}
                loading={loading}
                defItemHeight={46}
                rowKey='ScriptName'
                isRef={loading && isLoadingRef.current}
                classNameRow='code-scan-details-opt-wrapper'
                classNameList={styles["code-scan-by-group-list-wrapper"]}
            />
        </div>
    )
})

const CodeScanGroupByKeyWordItem: React.FC<CodeScanGroupByKeyWordItemProps> = React.memo((props) => {
    const {item, onSelect, selected} = props
    return (
        <div
            className={classNames(styles["codec-scan-item-wrapper"], styles["codec-scan-keyword-item-wrapper"], {
                [styles["codec-scan-item-wrapper-checked"]]: selected
            })}
            onClick={() => onSelect(item)}
        >
            <div className={styles["item-tip"]}>
                <span className={styles["item-tip-name"]}>{item.Value}</span>
                <span className={styles["item-tip-number"]}>{item.Total}个插件</span>
            </div>
        </div>
    )
})

const CodeScanExecuteContent: React.FC<CodeScanExecuteContentProps> = React.memo((props) => {
    const {onClearAll, selectGroupList} = props
    const [hidden, setHidden] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "hidden",
        trigger: "setHidden"
    })

    const [executeStatus, setExecuteStatus] = useControllableValue<any>(props, {
        defaultValue: "default",
        valuePropName: "executeStatus",
        trigger: "setExecuteStatus"
    })

    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [total, setTotal] = useState<number>(0)
    const [showType, setShowType] = useState<"rule" | "log">("rule")

    /**暂停 */
    const [pauseLoading, setPauseLoading] = useState<boolean>(false)
    /**继续 */
    const [continueLoading, setContinueLoading] = useState<boolean>(false)
    // 任务列表抽屉
    const [visibleRaskList, setVisibleRaskList] = useState<boolean>(false)

    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus])

    const pluginLogDisabled = useCreation(() => {
        return !isExecuting
    }, [isExecuting])

    const selectGroupNum = useCreation(() => {
        return selectGroupList.length
    }, [selectGroupList])

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })

    const onStartExecute = useMemoizedFn(() => {})

    const onStopExecute = useMemoizedFn(() => {})

    const onPause = useMemoizedFn((e) => {})

    const onContinue = useMemoizedFn((e) => {})

    return (
        <>
            <div className={styles["midden-wrapper"]}>
                <div className={styles["midden-heard"]}>
                    {hidden && (
                        <Tooltip title='展开' placement='top' overlayClassName='plugins-tooltip'>
                            <YakitButton
                                type='text2'
                                onClick={() => setHidden(false)}
                                icon={<OutlineOpenIcon className={styles["header-icon"]} />}
                            ></YakitButton>
                        </Tooltip>
                    )}
                    <YakitRadioButtons
                        size='small'
                        value={showType}
                        onChange={(e) => {
                            setShowType(e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "rule",
                                label: "已选规则"
                            },
                            {
                                value: "log",
                                label: "插件日志",
                                disabled: pluginLogDisabled
                            }
                        ]}
                    />
                    {showType === "rule" && (
                        <div className={styles["heard-right"]}>
                            <span className={styles["heard-tip"]}>
                                Total<span className={styles["heard-number"]}>{total}</span>
                            </span>
                            <YakitButton type='text' danger onClick={onClearAll}>
                                清空
                            </YakitButton>
                        </div>
                    )}
                </div>
                <CodeScanByGroup hidden={showType !== "rule"} setTotal={setTotal} />
                <CodeScanExecuteLog hidden={showType !== "log"} />
            </div>
            <div className={styles["code-scan-execute-wrapper"]}>
                <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                    <div className={styles["code-scan-executor-title"]}>
                        <span className={styles["code-scan-executor-title-text"]}>规则执行</span>
                    </div>
                    <div className={styles["code-scan-executor-btn"]}>
                        {true && <PluginExecuteProgress percent={1} name={"ttt"} />}
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                setVisibleRaskList(true)
                            }}
                            style={{padding: 0}}
                        >
                            任务列表
                        </YakitButton>
                        {isExecuting
                            ? !isExpand && (
                                  <>
                                      {executeStatus === "paused" && !pauseLoading && (
                                          <YakitButton onClick={onContinue} loading={continueLoading}>
                                              继续
                                          </YakitButton>
                                      )}
                                      {(executeStatus === "process" || pauseLoading) && (
                                          <YakitButton onClick={onPause} loading={pauseLoading}>
                                              暂停
                                          </YakitButton>
                                      )}
                                      <YakitButton
                                          danger
                                          onClick={onStopExecute}
                                          disabled={pauseLoading || continueLoading}
                                      >
                                          停止
                                      </YakitButton>
                                      <div className={styles["divider-style"]}></div>
                                  </>
                              )
                            : !isExpand && (
                                  <>
                                      <YakitButton onClick={onStartExecute}>执行</YakitButton>
                                      <div className={styles["divider-style"]}></div>
                                  </>
                              )}
                        <YakitButton
                            type='text2'
                            icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                            onClick={(e) => {
                                e.stopPropagation()
                                setHidden(!hidden)
                            }}
                        />
                    </div>
                </ExpandAndRetract>
                <div className={styles["code-scan-executor-body"]}>
                    <CodeScanMainExecuteContent
                        isExpand={isExpand}
                        executeStatus={executeStatus}
                        selectNum={selectGroupNum}
                    />
                </div>
            </div>
            <React.Suspense fallback={<>loading...</>}>
                {visibleRaskList && (
                    <>
                        {/* <HybridScanTaskListDrawer
                        visible={visibleRaskList}
                        setVisible={setVisibleRaskList}
                        hybridScanTaskSource='yakPoc'
                    /> */}
                    </>
                )}
            </React.Suspense>
        </>
    )
})

export const CodeScanExecuteLog: React.FC<CodeScanExecuteLogProps> = React.memo((props) => {
    const {hidden} = props
    const [recalculation, setRecalculation] = useState<boolean>(false)
    return (
        <div
            className={classNames(styles["code-scan-execute-log-wrapper"], {
                [styles["code-scan-execute-log-wrapper-hidden"]]: hidden
            })}
        >
            <YakitSpin spinning={true} size='small' style={{alignItems: "center", height: 20}} />
            <RollingLoadList<any>
                data={[]}
                loadMoreData={() => {}}
                renderRow={(i: any, index: number) => {
                    const {value, type} = i.timeConsuming
                    return (
                        <>
                            <span className={styles["name"]}>
                                {i.Index}: [{i.PluginName}]
                            </span>
                            <span className='content-ellipsis'>执行目标: {i.Url}</span>
                            <span
                                className={classNames(styles["time"], {
                                    [styles["time-danger"]]: type === "danger"
                                })}
                            >
                                {type === "danger" ? value : `耗时: ${value}`}
                            </span>
                        </>
                    )
                }}
                page={1}
                hasMore={false}
                defItemHeight={108}
                rowKey='Index'
                recalculation={recalculation}
                loading={false}
                classNameList={styles["code-scan-log-list"]}
                classNameRow={styles["code-scan-log-item"]}
            />
        </div>
    )
})

export const CodeScanMainExecuteContent: React.FC<CodeScaMainExecuteContentProps> = React.memo((props) => {
    const {isExpand, selectNum} = props
    const [form] = Form.useForm()

    const [runtimeId, setRuntimeId] = useState<string>("")

    const [pauseLoading, setPauseLoading] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "pauseLoading",
        trigger: "setPauseLoading"
    })
    const [continueLoading, setContinueLoading] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "continueLoading",
        trigger: "setContinueLoading"
    })
    /**执行状态 */
    const [executeStatus, setExecuteStatus] = useControllableValue<any>(props, {
        defaultValue: "default",
        valuePropName: "executeStatus",
        trigger: "setExecuteStatus"
    })
    const tokenRef = useRef<string>(randomString(40))
    const [streamInfo, hybridScanStreamEvent] = useHoldBatchGRPCStream({
        taskName: "hybrid-scan",
        apiKey: "HybridScan",
        token: tokenRef.current,
        onEnd: () => {
            hybridScanStreamEvent.stop()
            setTimeout(() => {
                setPauseLoading(false)
                setContinueLoading(false)
            }, 200)
        },
        onError: (error) => {
            hybridScanStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("error")
                setPauseLoading(false)
                setContinueLoading(false)
            }, 200)
            yakitNotify("error", `[Mod] hybrid-scan error: ${error}`)
        },
        setRuntimeId: (rId) => {
            setRuntimeId(rId)
            if (runtimeId !== rId) {
                onUpdateExecutorPageInfo(rId)
            }
        },
        setTaskStatus: (val) => {
            switch (val) {
                case "default":
                    setExecuteStatus("default")
                    break
                case "done":
                    setExecuteStatus("finished")
                    break
                case "error":
                    setExecuteStatus("error")
                    break
                case "executing":
                    setPauseLoading(false)
                    setContinueLoading(false)
                    setExecuteStatus("process")
                    break
                case "paused":
                    setExecuteStatus("paused")
                    break
                default:
                    break
            }
        },
        onGetInputValue: (v) => onInitInputValue(v)
    })

    /**更新该页面最新的runtimeId */
    const onUpdateExecutorPageInfo = useMemoizedFn((runtimeId: string) => {})

    /**设置输入模块的初始值 */
    const onInitInputValue = useMemoizedFn((value: any) => {})

    const isExecuting = useCreation(() => {
        // if (executeStatus === "process") return true
        // if (executeStatus === "paused") return true
        return false
    }, [])

    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])

    /**开始执行 */
    const onStartExecute = useMemoizedFn(async (value) => {})

    /**取消执行 */
    const onStopExecute = useMemoizedFn(() => {})

    /**暂停 */
    const onPause = useMemoizedFn(() => {})

    /**继续 */
    const onContinue = useMemoizedFn(() => {})

    const [auditCodeList,setAuditCodeList] = useState<{label:string,value:string}[]>([])

    const getAduitList = useMemoizedFn(async () => {
        try {
            const {res} = await grpcFetchAuditTree("/")
            if (res.Resources.length > 0) {
                const list = res.Resources.map((item)=>({label:item.ResourceName,value:item.Path}))
                setAuditCodeList(list)
            }
        } catch (error) {
        }
    })

    useEffect(() => {
        getAduitList()
    }, [])
    return (
        <>
            <div
                className={classNames(styles["code-scan-execute-form-wrapper"], {
                    [styles["code-scan-execute-form-wrapper-hidden"]]: !isExpand
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
                >
                    <Form.Item label='项目名称' name='project'>
                        <YakitSelect showSearch placeholder='请选择项目名称' options={auditCodeList}></YakitSelect>
                    </Form.Item>
                    <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                        <div className={styles["code-scan-execute-form-operate"]}>
                            {isExecuting ? (
                                <>
                                    {executeStatus === "paused" && !pauseLoading && (
                                        <YakitButton size='large' onClick={onContinue} loading={continueLoading}>
                                            继续
                                        </YakitButton>
                                    )}
                                    {(executeStatus === "process" || pauseLoading) && (
                                        <YakitButton size='large' onClick={onPause} loading={pauseLoading}>
                                            暂停
                                        </YakitButton>
                                    )}
                                    <YakitButton
                                        danger
                                        onClick={onStopExecute}
                                        size='large'
                                        disabled={pauseLoading || continueLoading}
                                    >
                                        停止
                                    </YakitButton>
                                </>
                            ) : (
                                <>
                                    <YakitButton htmlType='submit' size='large' disabled={selectNum === 0}>
                                        开始执行
                                    </YakitButton>
                                </>
                            )}
                        </div>
                    </Form.Item>
                </Form>
            </div>
            {isShowResult && (
                <CodeScanExecuteResult
                    streamInfo={streamInfo}
                    runtimeId={runtimeId}
                    loading={isExecuting}
                    defaultActiveKey={undefined}
                />
            )}
        </>
    )
})
