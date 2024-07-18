import React, {memo, useRef, useMemo, useState, useReducer, useEffect} from "react"
import {useMemoizedFn, useDebounceFn, useInViewport, useUpdateEffect} from "ahooks"
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
import cloneDeep from "lodash/cloneDeep"
import useListenWidth from "../hooks/useListenWidth"
import {HubButton} from "../hubExtraOperate/funcTemplate"
import {NoPromptHint} from "../utilsUI/UtilsTemplate"
import {RecycleOptFooterExtra, HubOuterList, HubGridList, HubGridOpt} from "./funcTemplate"
import {useStore} from "@/store"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import useGetSetState from "../hooks/useGetSetState"
import emiter from "@/utils/eventBus/eventBus"
import {PluginOperateHint} from "../defaultConstant"

import SearchResultEmpty from "@/assets/search_result_empty.png"
import styles from "./PluginHubList.module.scss"

interface HubListRecycleProps {}
/** @name 插件回收站 */
export const HubListRecycle: React.FC<HubListRecycleProps> = memo((props) => {
    const {} = props

    const divRef = useRef<HTMLDivElement>(null)
    const wrapperWidth = useListenWidth(divRef)
    const [inViewPort = true] = useInViewport(divRef)

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])
    const fetchIsLogin = useMemoizedFn(() => {
        return userinfo.isLogin
    })

    /** ---------- 列表相关变量 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    // 是否为获取列表第一页的加载状态
    const isInitLoading = useRef<boolean>(false)
    const hasMore = useRef<boolean>(true)

    // 列表无条件下的总数
    const [listTotal, setListTotal] = useState<number>(0)

    // 列表数据
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    // 全选
    const [allChecked, setAllChecked] = useState<boolean>(false)
    // 选中插件
    const [selectList, setSelectList] = useState<YakitPluginOnlineDetail[]>([])
    // 搜索条件
    const [search, setSearch, getSearch] = useGetSetState<PluginSearchParams>(cloneDeep(defaultSearch))

    const showIndex = useRef<number>(0)
    const setShowIndex = useMemoizedFn((index: number) => {
        showIndex.current = index
    })
    /** ---------- 列表相关变量 End ---------- */

    /** ---------- 列表相关方法 Start ---------- */
    // 刷新搜索条件数据和无条件列表总数
    const onRefreshFilterAndTotal = useDebounceFn(
        useMemoizedFn(() => {
            fetchInitTotal()
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        if (isLogin) {
            fetchList(true)
        }
    }, [isLogin])
    useUpdateEffect(() => {
        if (inViewPort && fetchIsLogin()) {
            onRefreshFilterAndTotal()
        }
    }, [inViewPort])

    useEffect(() => {
        const onRefreshList = () => {
            if (!fetchIsLogin()) return
            setTimeout(() => {
                fetchList(true)
            }, 200)
        }

        emiter.on("ownDeleteToRecycleList", onRefreshList)
        return () => {
            emiter.off("ownDeleteToRecycleList", onRefreshList)
        }
    }, [])

    const fetchInitTotal = useMemoizedFn(() => {
        apiFetchRecycleList({page: 1, limit: 1}, true)
            .then((res) => {
                setListTotal(Number(res.pagemeta.total) || 0)
            })
            .catch(() => {})
    })

    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            if (loading) return
            if (reset) {
                fetchInitTotal()
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

            const query: PluginsQueryProps = convertPluginsRequestParams({}, getSearch(), params)
            try {
                const res = await apiFetchRecycleList(query)
                if (!res.data) res.data = []
                const length = +res.pagemeta.page === 1 ? res.data.length : res.data.length + response.data.length
                hasMore.current = length < +res.pagemeta.total
                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })
                if (+res.pagemeta.page === 1) {
                    onCheck(false)
                }
            } catch (error) {}
            setTimeout(() => {
                isInitLoading.current = false
                setLoading(false)
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

    /** 搜索内容 */
    const onSearch = useDebounceFn(
        useMemoizedFn((val: PluginSearchParams) => {
            onCheck(false)
            setSearch(val)
            fetchList(true)
        }),
        {wait: 300, leading: true}
    ).run
    /** ---------- 列表相关方法 End ---------- */

    const listLength = useMemo(() => {
        return Number(response.pagemeta.total) || 0
    }, [response])
    const selectedNum = useMemo(() => {
        if (allChecked) return response.pagemeta.total
        else return selectList.length
    }, [allChecked, selectList, response.pagemeta.total])

    // 批量操作的信息整合
    const handleBatchRequest = useMemoizedFn(() => {
        let request: PluginsRecycleRequest = {}
        if (selectedNum > 0) {
            if (allChecked) {
                request = {
                    ...request,
                    ...convertPluginsRequestParams({}, getSearch())
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
        } else {
            if (delHintSource.current === "single") {
                setSingleDel((arr) => arr.slice(0, arr.length - 1))
            }
        }
        setDelHint(false)
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
        onBatchDelOrRestoreAfter("del")
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
                onSingleDelOrRestoreAfter(info, "del")
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSingleDel((arr) => arr.filter((item) => item.uuid !== info.uuid))
                }, 50)
            })
    })
    /** ---------- 单个和批量的删除 End ---------- */

    /** ---------- 插件还原 Start ---------- */
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
        onBatchDelOrRestoreAfter("restore")
    })
    /** ---------- 插件还原 End ---------- */

    // 单个删除和还原后对别的逻辑的影响处理
    const onSingleDelOrRestoreAfter = useMemoizedFn((info: YakitPluginOnlineDetail, type?: string) => {
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
        fetchInitTotal()
        if (type === "restore") emiter.emit("onRefreshOwnPluginList", true)
    })
    // 批量删除和还原后对别的逻辑的影响处理
    const onBatchDelOrRestoreAfter = useMemoizedFn((type?: string) => {
        onCheck(false)
        if (type === "restore") emiter.emit("onRefreshOwnPluginList", true)
        setLoading(false)
        fetchList(true)
    })

    // 单项的删除和还原
    const extraFooter = (info: YakitPluginOnlineDetail) => {
        return (
            <RecycleOptFooterExtra
                isLogin={isLogin}
                info={info}
                execDelInfo={singleDel}
                onDel={onFooterExtraDel}
                restoreCallback={(info) => onSingleDelOrRestoreAfter(info, "restore")}
            />
        )
    }

    return (
        <div ref={divRef} className={styles["plugin-hub-tab-list"]}>
            <OnlineJudgment isJudgingLogin={true}>
                <YakitSpin spinning={loading && isInitLoading.current}>
                    <HubOuterList
                        title='回收站'
                        headerExtra={
                            <div className={styles["hub-list-header-extra"]}>
                                <HubButton
                                    width={wrapperWidth}
                                    iconWidth={900}
                                    icon={<OutlineTrashIcon />}
                                    type='outline2'
                                    size='large'
                                    name={selectedNum > 0 ? "删除" : "清空"}
                                    disabled={listTotal === 0}
                                    loading={batchDelLoading}
                                    onClick={onHeaderExtraDel}
                                />
                                <HubButton
                                    width={wrapperWidth}
                                    iconWidth={900}
                                    icon={<OutlineDatabasebackupIcon />}
                                    size='large'
                                    name={"还原"}
                                    disabled={listTotal === 0}
                                    loading={batchRestoreLoading}
                                    onClick={onHeaderExtraRestore}
                                />
                            </div>
                        }
                        allChecked={allChecked}
                        setAllChecked={onCheck}
                        total={response.pagemeta.total}
                        selected={selectedNum}
                        search={search}
                        setSearch={setSearch}
                        onSearch={onSearch}
                        filters={{}}
                        setFilters={() => {}}
                    >
                        {listLength > 0 ? (
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
                                            official={!!data.official}
                                            extraFooter={extraFooter}
                                        />
                                    )
                                }}
                            />
                        ) : listTotal > 0 ? (
                            <YakitEmpty
                                image={SearchResultEmpty}
                                imageStyle={{margin: "0 auto 24px", width: 274, height: 180}}
                                title='搜索结果“空”'
                                className={styles["hub-list-empty"]}
                            />
                        ) : (
                            <div className={styles["hub-list-empty"]}>
                                <YakitEmpty title='暂无数据' />
                                <div className={styles["refresh-buttons"]}>
                                    <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefresh}>
                                        刷新
                                    </YakitButton>
                                </div>
                            </div>
                        )}
                    </HubOuterList>
                </YakitSpin>
            </OnlineJudgment>

            <NoPromptHint
                visible={delHint}
                title='是否要删除插件'
                content={PluginOperateHint["delRecycle"]}
                cacheKey={RemotePluginGV.RecyclePluginRemoveCheck}
                onCallback={delHintCallback}
            />
        </div>
    )
})
