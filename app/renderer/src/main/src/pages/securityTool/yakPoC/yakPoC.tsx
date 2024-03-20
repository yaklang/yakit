import React, {useEffect, useRef, useState} from "react"
import {
    PluginGroupByKeyWordItemProps,
    PluginGroupByKeyWordProps,
    PluginGroupGridItemProps,
    PluginGroupGridProps,
    YakPoCExecuteContentProps,
    YakPoCProps
} from "./yakPoCType"
import classNames from "classnames"
import styles from "./yakPoC.module.scss"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Divider, Tooltip} from "antd"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    PluginBatchExecuteContent,
    PluginBatchExecuteContentRefProps
} from "@/pages/plugins/pluginBatchExecutor/pluginBatchExecutor"
import {useControllableValue, useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {
    ExpandAndRetract,
    ExpandAndRetractExcessiveState
} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {PluginExecuteProgress} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineCloseIcon,
    OutlineCogIcon,
    OutlineOpenIcon
} from "@/assets/icon/outline"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {FolderColorIcon} from "@/assets/icon/colors"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {PageNodeItemProps, PocPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/routes/newRoute"
import {GroupCount, SaveYakScriptGroupRequest} from "@/pages/invoker/schema"
import {apiFetchQueryYakScriptGroupLocal, apiFetchSaveYakScriptGroupLocal} from "@/pages/plugins/utils"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {apiFetchQueryYakScriptGroupLocalByPoc} from "./utils"

export const onToManageGroup = () => {
    emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.Plugin_Groups}))
}
/**专项漏洞检测 */
export const YakPoC: React.FC<YakPoCProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.PoC, pageId)
        if (currentItem && currentItem.pageParamsInfo.pocPageInfo) {
            return currentItem.pageParamsInfo.pocPageInfo
        }
        return {
            selectGroup: [],
            selectGroupListByKeyWord: [],
            formValue: {}
        }
    })
    const [pageInfo, setPageInfo] = useState<PocPageInfoProps>(initPageInfo())
    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(false)
    const [type, setType] = useState<"keyword" | "group">("keyword")

    const pluginGroupRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginGroupRef)

    const onSetSelectGroupList = useMemoizedFn((groups) => {
        setPageInfo({...pageInfo, selectGroup: groups})
    })
    const onSetSelectGroupListByKeyWord = useMemoizedFn((groups) => {
        setPageInfo({...pageInfo, selectGroupListByKeyWord: groups})
    })
    const onClose = useMemoizedFn(() => {
        setHidden(true)
    })
    const selectGroupListAll = useCreation(() => {
        return [...(pageInfo.selectGroup || []), ...(pageInfo.selectGroupListByKeyWord || [])]
    }, [pageInfo.selectGroup, pageInfo.selectGroupListByKeyWord])
    return (
        <div className={styles["yak-poc-wrapper"]} ref={pluginGroupRef}>
            <div
                className={classNames(styles["left-wrapper"], {
                    [styles["left-wrapper-hidden"]]: hidden
                })}
            >
                <div className={styles["left-header-search"]}>
                    <div className={styles["header-type-wrapper"]}>
                        <span className={styles["header-text"]}>选择插件组</span>
                        <YakitRadioButtons
                            value={type}
                            onChange={(e) => {
                                setType(e.target.value)
                            }}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "keyword",
                                    label: "按关键词"
                                },
                                {
                                    value: "group",
                                    label: "按组选"
                                }
                            ]}
                        />
                    </div>
                    <Tooltip title='收起' placement='top' overlayClassName='plugins-tooltip'>
                        <YakitButton
                            type='text2'
                            onClick={onClose}
                            icon={<OutlineCloseIcon className={styles["header-icon"]} />}
                        ></YakitButton>
                    </Tooltip>
                </div>
                <PluginGroupByKeyWord
                    pageId={pageId}
                    inViewport={inViewport}
                    hidden={type === "group"}
                    selectGroupListByKeyWord={pageInfo.selectGroupListByKeyWord || []}
                    setSelectGroupListByKeyWord={onSetSelectGroupListByKeyWord}
                />
                <PluginGroupGrid
                    inViewport={inViewport}
                    hidden={type === "keyword"}
                    selectGroupList={pageInfo.selectGroup || []}
                    setSelectGroupList={onSetSelectGroupList}
                />
            </div>

            <YakPoCExecuteContent
                hidden={hidden}
                setHidden={setHidden}
                selectGroupList={selectGroupListAll}
                defaultFormValue={pageInfo.formValue}
            />
        </div>
    )
})

const PluginGroupByKeyWord: React.FC<PluginGroupByKeyWordProps> = React.memo((props) => {
    const {pageId, hidden, inViewport} = props
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

    const initialResponseRef = useRef<GroupCount[]>([])

    useEffect(() => {
        if (inViewport) init()
    }, [inViewport])

    const init = useMemoizedFn(() => {
        setLoading(true)
        getQueryYakScriptGroup()
            .then((res) => {
                initialResponseRef.current = res
                if (response.length === 0) {
                    setResponse(res)
                    setIsRef(!isRef)
                }
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            )
    })
    const getQueryYakScriptGroup: () => Promise<GroupCount[]> = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            apiFetchQueryYakScriptGroupLocalByPoc({PageId: pageId}).then(resolve).catch(reject)
        })
    })
    const onSelect = useMemoizedFn((val: GroupCount) => {
        const isExist = selectGroupList.includes(val.Value)
        if (isExist) {
            const newList = selectGroupList.filter((ele) => ele !== val.Value)
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        } else {
            const newList = [...selectGroupList, val.Value]
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        }
    })
    const total = useCreation(() => {
        return response.length
    }, [response])
    const indeterminate: boolean = useCreation(() => {
        if (selectGroupList.length > 0 && selectGroupList.length !== response.length) return true
        return false
    }, [selectGroupList, response])
    const onClearSelect = useMemoizedFn(() => {
        setSelectGroupList([])
        setAllCheck(false)
    })
    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
        if (checked) {
            setSelectGroupList(response.map((ele) => ele.Value))
        } else {
            setSelectGroupList([])
        }
        setAllCheck(checked)
    })
    const onSearch = useMemoizedFn((val) => {
        if (!val) {
            setResponse(initialResponseRef.current)
            return
        }
        const isHaveData = initialResponseRef.current.filter((ele) => {
            return ele.Value.toUpperCase() === val.toUpperCase()
        })
        if (isHaveData.length > 0) {
            setResponse([...isHaveData])
            setIsRef(!isRef)
        } else {
            // 先创建临时分组再搜索
            const addParams: SaveYakScriptGroupRequest = {
                SaveGroup: [val],
                Filter: {
                    // 该参数的page，limit无效
                    Pagination: {
                        Page: 1,
                        Limit: 1,
                        Order: "",
                        OrderBy: ""
                    },
                    Keyword: val,
                    Type: "mitm,port-scan,nuclei"
                },
                RemoveGroup: [],
                PageId: pageId
            }
            setLoading(true)
            console.log("addParams", addParams)
            apiFetchSaveYakScriptGroupLocal(addParams)
                .then(getQueryYakScriptGroup)
                .then((res) => {
                    console.log("res", res)
                    const searchData = res.filter((ele) => {
                        return ele.Value.toUpperCase().includes(val.toUpperCase())
                    })
                    initialResponseRef.current = res
                    setResponse([...searchData])
                    setIsRef(!isRef)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                )
        }
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    return (
        <div
            className={classNames(styles["plugin-group-wrapper"], {
                [styles["plugin-group-wrapper-hidden"]]: hidden
            })}
        >
            <div className={styles["filter-wrapper"]}>
                <div className={styles["header-search"]}>
                    <YakitInput.Search
                        placeholder='请输入关键词搜索'
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        onSearch={onSearch}
                        onPressEnter={onPressEnter}
                        size='large'
                    />
                </div>
                <div className={styles["filter-body"]}>
                    <div className={styles["filter-body-left"]}>
                        <YakitCheckbox indeterminate={indeterminate} checked={allCheck} onChange={onSelectAll}>
                            全选
                        </YakitCheckbox>
                        <span className={styles["count-num"]}>
                            Total<span className={styles["num-style"]}>{total}</span>
                        </span>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <span className={styles["count-num"]}>
                            Selected<span className={styles["num-style"]}>{selectGroupList.length}</span>
                        </span>
                    </div>
                    <div className={styles["filter-body-right"]}>
                        <YakitButton type='text' onClick={onToManageGroup}>
                            管理分组
                        </YakitButton>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <YakitButton type='text' danger onClick={onClearSelect}>
                            清空
                        </YakitButton>
                    </div>
                </div>
            </div>
            <RollingLoadList<GroupCount>
                data={response}
                loadMoreData={() => {}}
                renderRow={(rowData: GroupCount, index: number) => {
                    const checked = selectGroupList.includes(rowData.Value)
                    return <PluginGroupByKeyWordItem item={rowData} onSelect={onSelect} selected={checked} />
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

const PluginGroupGrid: React.FC<PluginGroupGridProps> = React.memo((props) => {
    const {hidden, inViewport} = props
    const [selectGroupList, setSelectGroupList] = useControllableValue<string[]>(props, {
        defaultValue: [],
        valuePropName: "selectGroupList",
        trigger: "setSelectGroupList"
    })
    const [keywords, setKeywords] = useState<string>("")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [response, setResponse] = useState<GroupCount[]>([])
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)

    const initialResponseRef = useRef<GroupCount[]>([]) // 用来做搜索

    useEffect(() => {
        if (inViewport) getQueryYakScriptGroup()
    }, [inViewport])

    const getQueryYakScriptGroup = useMemoizedFn(() => {
        setLoading(true)
        apiFetchQueryYakScriptGroupLocal(false)
            .then((res) => {
                initialResponseRef.current = res
                const newSelectGroupList = selectGroupList.filter((item) => res.some((ele) => ele.Value === item))
                setSelectGroupList(newSelectGroupList)
                if (response.length === 0) {
                    setResponse(res)
                    setIsRef(!isRef)
                }
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            )
    })
    const onSelect = useMemoizedFn((val: GroupCount) => {
        const isExist = selectGroupList.includes(val.Value)
        if (isExist) {
            const newList = selectGroupList.filter((ele) => ele !== val.Value)
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        } else {
            const newList = [...selectGroupList, val.Value]
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.length)
        }
    })
    const total = useCreation(() => {
        return response.length
    }, [response])
    const indeterminate: boolean = useCreation(() => {
        if (selectGroupList.length > 0 && selectGroupList.length !== response.length) return true
        return false
    }, [selectGroupList, response])
    const onClearSelect = useMemoizedFn(() => {
        setSelectGroupList([])
        setAllCheck(false)
    })
    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
        if (checked) {
            setSelectGroupList(response.map((ele) => ele.Value))
        } else {
            setSelectGroupList([])
        }
        setAllCheck(checked)
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const onSearch = useMemoizedFn((val) => {
        const searchData = initialResponseRef.current.filter((ele) => {
            return ele.Value.toUpperCase().includes(val.toUpperCase())
        })
        setResponse([...searchData])
        setAllCheck(false)
        setSelectGroupList([])
        setIsRef(!isRef)
    })
    return (
        <div
            className={classNames(styles["plugin-group-wrapper"], {
                [styles["plugin-group-wrapper-hidden"]]: hidden
            })}
        >
            <div className={styles["filter-wrapper"]}>
                <div className={styles["header-search"]}>
                    <YakitInput.Search
                        placeholder='请输入组名搜索'
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        onSearch={onSearch}
                        onPressEnter={onPressEnter}
                        size='large'
                        wrapperStyle={{flex: 1}}
                    />
                </div>
                <div className={styles["filter-body"]}>
                    <div className={styles["filter-body-left"]}>
                        <YakitCheckbox indeterminate={indeterminate} checked={allCheck} onChange={onSelectAll}>
                            全选
                        </YakitCheckbox>
                        <span className={styles["count-num"]}>
                            Total<span className={styles["num-style"]}>{total}</span>
                        </span>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <span className={styles["count-num"]}>
                            Selected<span className={styles["num-style"]}>{selectGroupList.length}</span>
                        </span>
                    </div>
                    <div className={styles["filter-body-right"]}>
                        <YakitButton type='text' onClick={onToManageGroup}>
                            管理分组
                        </YakitButton>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <YakitButton type='text' danger onClick={onClearSelect}>
                            清空
                        </YakitButton>
                    </div>
                </div>
            </div>
            {initialResponseRef.current.length === 0 ? (
                <div className={styles["yak-poc-empty"]}>
                    <YakitEmpty title='暂无数据' description='可一键获取默认分组与插件,或点击管理分组手动新建' />
                    <div className={styles["yak-poc-buttons"]}>
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => setVisibleOnline(true)}
                        >
                            一键下载
                        </YakitButton>
                        <YakitButton icon={<OutlineCogIcon />} onClick={onToManageGroup}>
                            管理分组
                        </YakitButton>
                    </div>
                </div>
            ) : (
                <RollingLoadList<GroupCount>
                    data={response}
                    loadMoreData={() => {}}
                    renderRow={(rowData: GroupCount, index: number) => {
                        const checked = selectGroupList.includes(rowData.Value)
                        return <PluginGroupGridItem item={rowData} onSelect={onSelect} selected={checked} />
                    }}
                    page={1}
                    hasMore={false}
                    loading={loading}
                    defItemHeight={114}
                    isGridLayout
                    defCol={3}
                    classNameList={styles["group-list-wrapper"]}
                    rowKey='Value'
                    isRef={isRef}
                />
            )}
            <YakitGetOnlinePlugin
                visible={visibleOnline}
                setVisible={(v) => {
                    setVisibleOnline(v)
                    setTimeout(() => {
                        getQueryYakScriptGroup()
                    }, 200)
                }}
                listType='online'
            />
        </div>
    )
})

const PluginGroupByKeyWordItem: React.FC<PluginGroupByKeyWordItemProps> = React.memo((props) => {
    const {item, onSelect, selected} = props
    return (
        <div
            className={classNames(styles["group-item-wrapper"], styles["group-keyword-item-wrapper"], {
                [styles["group-item-wrapper-checked"]]: selected
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
const PluginGroupGridItem: React.FC<PluginGroupGridItemProps> = React.memo((props) => {
    const {item, onSelect, selected} = props
    return (
        <div
            className={classNames(styles["group-item-wrapper"], {
                [styles["group-item-wrapper-checked"]]: selected
            })}
            onClick={() => onSelect(item)}
        >
            <FolderColorIcon />
            <div className={styles["item-tip"]}>
                <span className={styles["item-tip-name"]}>{item.Value}</span>
                <span className={styles["item-tip-number"]}>{item.Total}个插件</span>
            </div>
        </div>
    )
})
const YakPoCExecuteContent: React.FC<YakPoCExecuteContentProps> = React.memo((props) => {
    const {selectGroupList, defaultFormValue} = props
    const pluginBatchExecuteContentRef = useRef<PluginBatchExecuteContentRefProps>(null)

    const [hidden, setHidden] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "hidden",
        trigger: "setHidden"
    })

    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    /**停止 */
    const [stopLoading, setStopLoading] = useState<boolean>(false)

    useEffect(() => {
        if (defaultFormValue) {
            const value = JSON.stringify(defaultFormValue)
            pluginBatchExecuteContentRef.current?.onInitInputValue(value)
        }
    }, [])

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onStopExecute = useMemoizedFn(() => {
        pluginBatchExecuteContentRef.current?.onStopExecute()
    })
    const onStartExecute = useMemoizedFn(() => {
        pluginBatchExecuteContentRef.current?.onStartExecute()
    })
    const selectGroupNum = useCreation(() => {
        return selectGroupList.length
    }, [selectGroupList])
    const pluginInfo = useCreation(() => {
        return {
            selectPluginName: [],
            selectPluginGroup: selectGroupList
        }
    }, [selectGroupList])
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])
    return (
        <div className={styles["yak-poc-execute-wrapper"]}>
            <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                <div className={styles["yak-poc-executor-title"]}>
                    {hidden && (
                        <Tooltip title='展开' placement='top' overlayClassName='plugins-tooltip'>
                            <YakitButton
                                type='text2'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setHidden(false)
                                }}
                                icon={<OutlineOpenIcon className={styles["header-icon"]} />}
                            ></YakitButton>
                        </Tooltip>
                    )}
                    <span className={styles["yak-poc-executor-title-text"]}>已选插件组</span>
                </div>
                <div className={styles["yak-poc-executor-btn"]}>
                    {progressList.length === 1 && (
                        <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                    )}
                    {isExecuting
                        ? !isExpand && (
                              <>
                                  <YakitButton danger onClick={onStopExecute} loading={stopLoading}>
                                      停止
                                  </YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )
                        : !isExpand && (
                              <>
                                  <YakitButton onClick={onStartExecute} disabled={selectGroupNum === 0}>
                                      执行
                                  </YakitButton>
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
            <div className={styles["yak-poc-executor-body"]}>
                <PluginBatchExecuteContent
                    ref={pluginBatchExecuteContentRef}
                    isExpand={isExpand}
                    setIsExpand={setIsExpand}
                    selectNum={selectGroupNum}
                    setProgressList={setProgressList}
                    stopLoading={stopLoading}
                    setStopLoading={setStopLoading}
                    pluginInfo={pluginInfo}
                    executeStatus={executeStatus}
                    setExecuteStatus={setExecuteStatus}
                />
            </div>
        </div>
    )
})
