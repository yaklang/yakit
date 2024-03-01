import React, {useEffect, useRef, useState} from "react"
import {
    GroupCount,
    PluginGroupGridItemProps,
    PluginGroupGridProps,
    YakPoCExecuteContentProps,
    YakPoCProps
} from "./yakPoCType"
import classNames from "classnames"
import styles from "./yakPoC.module.scss"
import {FuncSearch} from "@/pages/plugins/funcTemplate"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {Divider} from "antd"
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
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginExecuteProgress} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon, OutlineCogIcon} from "@/assets/icon/outline"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {FolderColorIcon} from "@/assets/icon/colors"
import {QueryYakScriptGroupResponse, apiQueryYakScriptGroup} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {PageNodeItemProps, PocPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/routes/newRoute"

export const onToManageGroup = () => {
    yakitNotify("info", "开发中...")
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
            formValue: {}
        }
    })
    const [pageInfo, setPageInfo] = useState<PocPageInfoProps>(initPageInfo())
    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(false)
    const onSetSelectGroupList = useMemoizedFn((groups) => {
        setPageInfo({...pageInfo, selectGroup: groups})
    })
    return (
        <div className={styles["yak-poc-wrapper"]}>
            <PluginGroupGrid
                hidden={hidden}
                selectGroupList={pageInfo.selectGroup || []}
                setSelectGroupList={onSetSelectGroupList}
            />
            <YakPoCExecuteContent
                hidden={hidden}
                setHidden={setHidden}
                selectGroupList={pageInfo.selectGroup || []}
                setSelectGroupList={onSetSelectGroupList}
                defaultFormValue={pageInfo.formValue}
            />
        </div>
    )
})

const PluginGroupGrid: React.FC<PluginGroupGridProps> = React.memo((props) => {
    const {hidden} = props
    const [selectGroupList, setSelectGroupList] = useControllableValue<string[]>(props, {
        defaultValue: [],
        valuePropName: "selectGroupList",
        trigger: "setSelectGroupList"
    })
    const [keywords, setKeywords] = useState<string>("")
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [response, setResponse] = useState<QueryYakScriptGroupResponse>({
        Group: []
    })
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)

    const pluginGroupGridRef = useRef<HTMLDivElement>(null)
    const initialResponseRef = useRef<QueryYakScriptGroupResponse>({
        Group: []
    }) // 用来做搜索
    const [inViewport = true] = useInViewport(pluginGroupGridRef)

    useEffect(() => {
        if (inViewport) getQueryYakScriptGroup()
    }, [inViewport])

    const getQueryYakScriptGroup = useMemoizedFn(() => {
        setLoading(true)
        apiQueryYakScriptGroup({All: false})
            .then((res) => {
                setResponse(res)
                initialResponseRef.current = res
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
            setAllCheck(newList.length === response.Group.length)
        } else {
            const newList = [...selectGroupList, val.Value]
            setSelectGroupList(newList)
            setAllCheck(newList.length === response.Group.length)
        }
    })
    const total = useCreation(() => {
        return response.Group.length
    }, [response.Group])
    const indeterminate: boolean = useCreation(() => {
        if (selectGroupList.length > 0 && selectGroupList.length !== response.Group.length) return true
        return false
    }, [selectGroupList, response.Group])
    const onClearSelect = useMemoizedFn(() => {
        setSelectGroupList([])
        setAllCheck(false)
    })
    const onSelectAll = useMemoizedFn((e) => {
        const {checked} = e.target
        if (checked) {
            setSelectGroupList(response.Group.map((ele) => ele.Value))
        } else {
            setSelectGroupList([])
        }
        setAllCheck(checked)
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const onSearch = useMemoizedFn((val) => {
        const searchData = initialResponseRef.current.Group.filter((ele) => {
            return ele.Value.includes(val)
        })
        setResponse({Group: searchData})
        setAllCheck(false)
        setSelectGroupList([])
    })
    return (
        <div
            className={classNames(styles["plugin-group-wrapper"], {
                [styles["plugin-group-wrapper-hidden"]]: hidden
            })}
            ref={pluginGroupGridRef}
        >
            <div className={styles["filter-wrapper"]}>
                <div className={styles["header-search"]}>
                    <span className={styles["header-search-text"]}>选择插件组</span>
                    <YakitInput.Search
                        placeholder='请输入组名搜索'
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        onSearch={onSearch}
                        onPressEnter={onPressEnter}
                        size='large'
                        wrapperStyle={{width: 280}}
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
            {initialResponseRef.current.Group.length === 0 ? (
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
                    data={response.Group}
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
    const {selectGroupList, setSelectGroupList, defaultFormValue} = props
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
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        setSelectGroupList([])
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
                    <span className={styles["yak-poc-executor-title-text"]}>已选插件组</span>
                    {selectGroupNum > 0 && (
                        <YakitTag closable onClose={onRemove} color='info'>
                            {selectGroupNum}
                        </YakitTag>
                    )}
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
