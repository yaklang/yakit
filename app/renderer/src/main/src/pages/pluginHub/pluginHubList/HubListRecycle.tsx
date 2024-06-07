import React, {memo, useRef, useMemo, useState, useReducer, useEffect} from "react"
import {useMemoizedFn, useDebounceFn} from "ahooks"
import {OutlineTrashIcon, OutlineDatabasebackupIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {RemotePluginGV} from "@/enums/plugin"
import {PluginSearchParams, PluginListPageMeta} from "@/pages/plugins/baseTemplateType"
import {defaultSearch} from "@/pages/plugins/builtInData"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {pluginOnlineReducer, initialOnlineState} from "@/pages/plugins/pluginReducer"
import {
    PluginsQueryProps,
    convertPluginsRequestParams,
    apiFetchRecycleList,
    PluginsRecycleRequest,
    apiRemoveRecyclePlugin,
    apiReductionRecyclePlugin
} from "@/pages/plugins/utils"
import {getRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"
import {cloneDeep} from "bizcharts/lib/utils"
import useListenWidth from "../hooks/useListenWidth"
import {HubButton} from "../hubExtraOperate/funcTemplate"
import {NoPromptHint} from "../utilsUI/UtilsTemplate"
import {RecycleOptFooterExtra, HubOuterList, HubGridList, HubGridOpt} from "./funcTemplate"
import {useStore} from "@/store"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import classNames from "classnames"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import styles from "./PluginHubList.module.scss"

interface HubListRecycleProps {}
/** @name 插件回收站 */
export const HubListRecycle: React.FC<HubListRecycleProps> = memo((props) => {
    const {} = props

    const divRef = useRef<HTMLDivElement>(null)
    const wrapperWidth = useListenWidth(divRef)

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

    /** ---------- 列表相关变量 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    // 是否为获取列表第一页的加载状态
    const isInitLoading = useRef<boolean>(false)
    const hasMore = useRef<boolean>(true)

    // 列表数据
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    // 全选
    const [allChecked, setAllChecked] = useState<boolean>(false)
    // 选中插件
    const [selectList, setSelectList] = useState<YakitPluginOnlineDetail[]>([])
    // 搜索条件
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))

    const showIndex = useRef<number>(0)
    const setShowIndex = useMemoizedFn((index: number) => {
        showIndex.current = index
    })
    /** ---------- 列表相关变量 End ---------- */

    /** ---------- 列表相关方法 Start ---------- */
    useEffect(() => {
        if (isLogin) {
            fetchList(true)
        }
    }, [isLogin])

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            if (loading) return
            if (reset) {
                isInitLoading.current = true
                setShowIndex(0)
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }

            const query: PluginsQueryProps = convertPluginsRequestParams({}, search, params)
            try {
                const res = await apiFetchRecycleList(query)
                const length = +res.pagemeta.page === 1 ? res.data.length : res.data.length + response.data.length
                hasMore.current = length < +res.pagemeta.total
                if (!res.data) res.data = []
                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })
                if (+res.pagemeta.page === 1) {
                    setAllChecked(false)
                    setSelectList([])
                }
            } catch (error) {}
            setTimeout(() => {
                setLoading(false)
                isInitLoading.current = false
            }, 300)
        }),
        {wait: 200, leading: true}
    ).run
    /** 滚动更多加载 */
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })
    /** 刷新 */
    const onRefresh = useMemoizedFn(() => {
        fetchList(true)
    })

    /** 单项勾选 */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allChecked) {
            setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
            setAllChecked(false)
            return
        }
        // 单项勾选回调
        if (value) {
            setSelectList([...selectList, data])
        } else {
            const newSelectList = selectList.filter((item) => item.uuid !== data.uuid)
            setSelectList(newSelectList)
        }
    })
    /** 全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllChecked(value)
    })
    /** ---------- 列表相关方法 End ---------- */

    const listLength = useMemo(() => {
        return Number(response.pagemeta.total) || 0
    }, [response])
    const isSearch = useMemo(() => {
        if (search.type === "keyword") return !!search.keyword
        if (search.type === "userName") return !!search.userName
        return false
    }, [search])
    const selectedNum = useMemo(() => selectList.length, [selectList])
    const disabledBatchBtn = useMemo(() => {
        return !Number(response.pagemeta.total)
    }, [response.pagemeta.total])

    // 批量操作的信息整合
    const handleBatchRequest = useMemoizedFn(() => {
        let request: PluginsRecycleRequest = {}
        if (!allChecked && selectedNum === 0) {
        } else {
            if (allChecked) {
                request = {
                    ...request,
                    ...convertPluginsRequestParams({}, search)
                }
            } else {
                request = {
                    ...request,
                    uuid: selectList.map((item) => item.uuid)
                }
            }
        }
        return request
    })

    /** ---------- 单个和批量的删除 Start ---------- */
    useEffect(() => {
        // 删除插件的二次确认弹框
        getRemoteValue(RemotePluginGV.RecyclePluginRemoveCheck)
            .then((res) => {
                delHintCache.current = res === "true"
            })
            .catch((err) => {})
    }, [])

    // 是否出现二次确认框
    const delHintCache = useRef<boolean>(false)
    // 出发二次确认框的操作源
    const delHintSource = useRef<"batch" | "single">("single")
    const [delHint, setDelHint] = useState<boolean>(false)
    const onOpenDelHint = useMemoizedFn((source: "batch" | "single") => {
        if (delHint) return
        delHintSource.current = source
        setDelHint(true)
    })
    const delHintCallback = useMemoizedFn((isOK: boolean, cache: boolean) => {
        if (isOK) {
            delHintCache.current = cache
            if (delHintSource.current === "batch") {
                handleBatchDel()
            }
            if (delHintSource.current === "single") {
                const info = singleDel[singleDel.length - 1]
                if (info) handleSingeDel(info)
            }
        }
    })

    const [batchDelLoading, setBatchDelLoading] = useState<boolean>(false)
    const onHeaderExtraDel = useMemoizedFn(() => {
        if (delHintCache.current) {
            handleBatchDel()
        } else {
            onOpenDelHint("batch")
        }
    })
    // 批量删除
    const handleBatchDel = useMemoizedFn(async () => {
        if (batchDelLoading) return
        setBatchDelLoading(true)

        try {
            let request: PluginsRecycleRequest = handleBatchRequest()
            await apiRemoveRecyclePlugin(request)
        } catch (error) {}
        setTimeout(() => {
            setBatchDelLoading(false)
        }, 200)
        onBatchDelOrRestoreAfter()
    })

    // 单个删除的插件信息队列
    const [singleDel, setSingleDel] = useState<YakitPluginOnlineDetail[]>([])
    const onFooterExtraDel = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        const findIndex = singleDel.findIndex((item) => item.uuid === info.uuid)
        if (findIndex > -1) {
            yakitNotify("error", "该插件正在执行删除操作,请稍后再试")
            return
        }
        setSingleDel((arr) => {
            arr.push(info)
            return [...arr]
        })
        if (delHintCache.current) {
            handleSingeDel(info)
        } else {
            onOpenDelHint("single")
        }
    })
    // 单个删除
    const handleSingeDel = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        let request: PluginsRecycleRequest = {
            uuid: [info.uuid]
        }
        apiRemoveRecyclePlugin(request)
            .then(() => {
                onSingleDelOrRestoreAfter(info)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSingleDel((arr) => arr.filter((item) => item.uuid !== info.uuid))
                }, 50)
            })
    })
    /** ---------- 单个和批量的删除 End ---------- */

    /** ---------- 单个和批量的还原 Start ---------- */
    const [batchRestoreLoading, setBatchRestoreLoading] = useState<boolean>(false)
    const onHeaderExtraRestore = useMemoizedFn(() => {
        handleBatchRestore()
    })
    // 批量还原
    const handleBatchRestore = useMemoizedFn(async () => {
        if (batchRestoreLoading) return
        setBatchRestoreLoading(true)

        try {
            let request: PluginsRecycleRequest = handleBatchRequest()
            await apiReductionRecyclePlugin(request)
        } catch (error) {}
        setTimeout(() => {
            setBatchRestoreLoading(false)
        }, 200)
        onBatchDelOrRestoreAfter()
    })

    // 单个还原的插件信息队列
    const [singleRestore, setSingleRestore] = useState<YakitPluginOnlineDetail[]>([])
    const onFooterExtraRestore = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        const findIndex = singleRestore.findIndex((item) => item.uuid === info.uuid)
        if (findIndex > -1) {
            yakitNotify("error", "该插件正在执行还原操作,请稍后再试")
            return
        }
        setSingleRestore((arr) => {
            arr.push(info)
            return [...arr]
        })
        handleSingeRestore(info)
    })
    // 单个还原
    const handleSingeRestore = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        let request: PluginsRecycleRequest = {
            uuid: [info.uuid]
        }
        apiReductionRecyclePlugin(request)
            .then(() => {
                onSingleDelOrRestoreAfter(info)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSingleRestore((arr) => arr.filter((item) => item.uuid !== info.uuid))
                }, 50)
            })
    })
    /** ---------- 单个和批量的还原 End ---------- */

    // 单个删除和还原后对别的逻辑的影响处理
    const onSingleDelOrRestoreAfter = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        dispatch({
            type: "remove",
            payload: {
                itemList: [info]
            }
        })
        const index = selectList.findIndex((ele) => ele.uuid === info.uuid)
        if (index !== -1) {
            optCheck(info, false)
        }
    })
    // 批量删除和还原后对别的逻辑的影响处理
    const onBatchDelOrRestoreAfter = useMemoizedFn(() => {
        setSelectList([])
        setAllChecked(false)
        fetchList(true)
    })

    // 批量的删除和还原
    const headerExtra = useMemo(() => {
        return (
            <div className={styles["hub-list-recycle-header-extra"]}>
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<OutlineTrashIcon />}
                    type='outline2'
                    size='large'
                    name={selectedNum > 0 ? "删除" : "清空"}
                    disabled={disabledBatchBtn}
                    loading={batchDelLoading}
                    onClick={onHeaderExtraDel}
                />
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<OutlineDatabasebackupIcon />}
                    size='large'
                    name={"还原"}
                    disabled={disabledBatchBtn}
                    loading={batchRestoreLoading}
                    onClick={onHeaderExtraRestore}
                />
            </div>
        )
    }, [wrapperWidth, selectedNum, disabledBatchBtn, batchDelLoading, batchRestoreLoading])
    // 单项的删除和还原
    const extraFooter = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        return (
            <RecycleOptFooterExtra
                isLogin={isLogin}
                info={info}
                execDelInfo={singleDel}
                execRestoreInfo={singleRestore}
                onDel={onFooterExtraDel}
                onRestore={onFooterExtraRestore}
            />
        )
    })

    return (
        <div className={styles["plugin-hub-tab-list"]}>
            <OnlineJudgment isJudgingLogin={true}>
                <YakitSpin spinning={loading && isInitLoading.current}>
                    {listLength > 0 ? (
                        <HubOuterList
                            title='回收站'
                            headerExtra={headerExtra}
                            allChecked={allChecked}
                            setAllChecked={onCheck}
                            total={response.pagemeta.total}
                            selected={selectedNum}
                            search={search}
                            setSearch={setSearch}
                            filters={{}}
                            setFilters={() => {}}
                        >
                            <HubGridList
                                data={response.data}
                                keyName='uuid'
                                loading={loading}
                                hasMore={hasMore.current}
                                updateList={onUpdateList}
                                showIndex={showIndex.current}
                                setShowIndex={setShowIndex}
                                gridNode={(info) => {
                                    const {index, data} = info
                                    const check =
                                        allChecked || selectList.findIndex((ele) => ele.uuid === data.uuid) !== -1
                                    return (
                                        <HubGridOpt
                                            order={index}
                                            info={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            title={data.script_name}
                                            type={data.type}
                                            tags={data.tags}
                                            help={data.help || ""}
                                            img={data.head_img || ""}
                                            user={data.authors || ""}
                                            prImgs={(data.collaborator || []).map((ele) => ele.head_img)}
                                            time={data.updated_at}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={!!data.isCorePlugin}
                                            extraFooter={extraFooter}
                                        />
                                    )
                                }}
                            />
                        </HubOuterList>
                    ) : isSearch ? (
                        <YakitEmpty
                            image={SearchResultEmpty}
                            imageStyle={{width: 274, height: 180, marginBottom: 24}}
                            title='搜索结果“空”'
                            style={{paddingTop: "10%"}}
                            className={styles["hub-list-recycle-empty"]}
                        />
                    ) : (
                        <div className={styles["hub-list-recycle-empty"]}>
                            <YakitEmpty title='暂无数据' />
                            <div className={styles["refresh-buttons"]}>
                                <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefresh}>
                                    刷新
                                </YakitButton>
                            </div>
                        </div>
                    )}
                </YakitSpin>
            </OnlineJudgment>

            <NoPromptHint
                visible={delHint}
                title='是否要删除插件'
                content='确认后插件将彻底删除，无法找回'
                cacheKey={RemotePluginGV.RecyclePluginRemoveCheck}
                onCallback={delHintCallback}
            />
        </div>
    )
})
