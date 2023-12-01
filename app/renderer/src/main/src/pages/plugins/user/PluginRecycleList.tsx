import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {yakitNotify} from "@/utils/notification"
import React, {useState, useReducer, useEffect, useMemo, forwardRef, useImperativeHandle, useRef} from "react"
import {PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginsList, ListShowContainer, GridLayoutOpt, ListLayoutOpt, OnlineRecycleExtraOperate} from "../funcTemplate"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {pluginOnlineReducer, initialOnlineState} from "../pluginReducer"
import {
    apiFetchRecycleList,
    PluginsQueryProps,
    convertPluginsRequestParams,
    apiRemoveRecyclePlugin,
    apiReductionRecyclePlugin,
    PluginsRecycleRequest
} from "../utils"
import {PluginRecycleListProps} from "./PluginUserType"
import {useMemoizedFn, useLockFn, useControllableValue, useLatest, useDebounceFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {PluginGV} from "../builtInData"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineRefreshIcon} from "@/assets/icon/outline"

import "../plugins.scss"
import styles from "./PluginRecycleList.module.scss"

export const PluginRecycleList: React.FC<PluginRecycleListProps> = React.memo(
    forwardRef((props, ref) => {
        const {refresh, inViewport, isLogin, setIsSelectRecycleNum, onRefreshUserList, setInitTotalRecycle} = props
        /** 是否为加载更多 */
        const [loading, setLoading] = useState<boolean>(false)
        const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
        const [selectList, setSelectList] = useState<string[]>([])
        const [isList, setIsList] = useState<boolean>(false)
        const [hasMore, setHasMore] = useState<boolean>(true)
        const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
            defaultValuePropName: "searchValue",
            valuePropName: "searchValue",
            trigger: "setSearchValue"
        })
        const [allCheck, setAllCheck] = useState<boolean>(false)
        const [pluginRemoveCheck, setPluginRemoveCheck] = useState<boolean>(false)
        const [removeCheckVisible, setRemoveCheckVisible] = useState<boolean>(false)

        const [initTotal, setInitTotal] = useState<number>(0)

        const operatePluginRef = useRef<YakitPluginOnlineDetail>() //记录删除或者还原的操作插件
        /** 是否为初次加载 */
        const isLoadingRef = useRef<boolean>(true)
        const latestLoadingRef = useLatest(loading)

        useImperativeHandle(
            ref,
            () => ({
                allCheck,
                selectList,
                onRemovePluginBatchBefore,
                onReductionPluginBatchBefore
            }),
            [allCheck, selectList]
        )
        useEffect(() => {
            if (isLogin) {
                getInitTotal()
                getPluginRemoveCheck()
            }
        }, [isLogin, inViewport])
        // 页面初始化的首次列表请求
        useEffect(() => {
            if (isLogin) {
                fetchList(true)
            }
        }, [isLogin, refresh])
        useEffect(() => {
            setIsSelectRecycleNum(selectList.length > 0)
        }, [selectList.length])

        /**获取插件删除的提醒记录状态 */
        const getPluginRemoveCheck = useMemoizedFn(() => {
            getRemoteValue(PluginGV.RecyclePluginRemoveCheck).then((data) => {
                setPluginRemoveCheck(data === "true" ? true : false)
            })
        })

        const getInitTotal = useMemoizedFn(() => {
            apiFetchRecycleList({
                page: 1,
                limit: 1
            }).then((res) => {
                setInitTotal(+res.pagemeta.total)
                setInitTotalRecycle(+res.pagemeta.total)
            })
        })

        const fetchList = useDebounceFn(
            useMemoizedFn(async (reset?: boolean) => {
                if (latestLoadingRef.current) return
                if (reset) {
                    isLoadingRef.current = true
                    setShowPluginIndex(0)
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
                    setHasMore(length < +res.pagemeta.total)
                    if (!res.data) res.data = []
                    dispatch({
                        type: "add",
                        payload: {
                            response: {...res}
                        }
                    })
                    if (+res.pagemeta.page === 1) {
                        setAllCheck(false)
                        setSelectList([])
                    }
                } catch (error) {}
                setTimeout(() => {
                    setLoading(false)
                    isLoadingRef.current = false
                }, 300)
            }),
            {wait: 200, leading: true}
        ).run
        /** 单项勾选|取消勾选 */
        const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
            // 全选情况时的取消勾选
            if (allCheck) {
                setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
                setAllCheck(false)
                return
            }
            // 单项勾选回调
            if (value) {
                setSelectList([...selectList, data.uuid])
            } else {
                const newSelectList = selectList.filter((item) => item !== data.uuid)
                setSelectList(newSelectList)
            }
        })
        // 滚动更多加载
        const onUpdateList = useMemoizedFn((reset?: boolean) => {
            fetchList()
        })
        /**全选 */
        const onCheck = useMemoizedFn((value: boolean) => {
            setSelectList([])
            setAllCheck(value)
            setIsSelectRecycleNum(value)
        })

        // 当前展示的插件序列
        const showPluginIndex = useRef<number>(0)
        const setShowPluginIndex = useMemoizedFn((index: number) => {
            showPluginIndex.current = index
        })

        /** 单项点击回调 */
        const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
            setShowPluginIndex(index)
        })
        // 选中插件的数量
        const selectNum = useMemo(() => {
            if (allCheck) return response.pagemeta.total
            else return selectList.length
        }, [allCheck, selectList, response.pagemeta.total])
        const onSetVisible = useMemoizedFn(() => {})
        /** 单项额外操作组件 */
        const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            return (
                <OnlineRecycleExtraOperate
                    isLogin={isLogin}
                    pluginRemoveCheck={pluginRemoveCheck}
                    data={data}
                    onRemoveClick={onRemoveClick}
                    onReductionClick={onReductionClick}
                    onRemoveOrReductionBefore={onRemoveOrReductionBefore}
                />
            )
        })
        /** 批量删除插件之前操作 */
        const onRemovePluginBatchBefore = useMemoizedFn(() => {
            if (pluginRemoveCheck) {
                onRemoveOrReductionPluginBatch("true")
            } else {
                setRemoveCheckVisible(true)
            }
        })
        /** 批量还原插件之前操作 */
        const onReductionPluginBatchBefore = useMemoizedFn(() => {
            onRemoveOrReductionPluginBatch("false")
        })
        /**批量删除和还原 */
        const onRemoveOrReductionPluginBatch = useMemoizedFn(async (dumpType: "true" | "false") => {
            // true 彻底删除, false还原
            setLoading(true)
            try {
                if (!allCheck && selectList.length === 0) {
                    // 删除全部，清空
                    if (dumpType === "true") {
                        await apiRemoveRecyclePlugin()
                    } else {
                        await apiReductionRecyclePlugin()
                    }
                } else {
                    // 批量删除
                    let deleteParams: PluginsRecycleRequest = {}

                    if (allCheck) {
                        deleteParams = {
                            ...deleteParams,
                            ...convertPluginsRequestParams({}, search)
                        }
                    } else {
                        deleteParams = {
                            ...deleteParams,
                            uuid: selectList
                        }
                    }
                    if (dumpType === "true") {
                        await apiRemoveRecyclePlugin(deleteParams)
                    } else {
                        await apiReductionRecyclePlugin(deleteParams)
                    }
                }
            } catch (error) {}

            onBatchRemoveOrReductionPluginAfter()
        })
        /**当pluginRemoveCheck为true，需要提示的时候，把当前操作的插件记录下来 */
        const onRemoveOrReductionBefore = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            operatePluginRef.current = data
            setRemoveCheckVisible(true)
        })
        /**单个删除 */
        const onRemoveClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            let deleteParams: PluginsRecycleRequest = {
                uuid: [data.uuid]
            }
            apiRemoveRecyclePlugin(deleteParams).then(() => {
                onSingleRemoveOrReductionPluginAfter(data)
            })
        })
        /**单个还原 */
        const onReductionClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            let deleteParams: PluginsRecycleRequest = {
                uuid: [data.uuid]
            }
            apiReductionRecyclePlugin(deleteParams).then(() => {
                onSingleRemoveOrReductionPluginAfter(data)
            })
        })
        /**单个 彻底删除和还原接口调用后的事件 */
        const onSingleRemoveOrReductionPluginAfter = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            dispatch({
                type: "remove",
                payload: {
                    itemList: [data]
                }
            })
            const index = selectList.findIndex((ele) => ele === data.uuid)
            if (index !== -1) {
                optCheck(data, false)
            }
            operatePluginRef.current = undefined
            getInitTotal()
            setRemoveCheckVisible(false)
            onRefreshUserList() // 刷新我的插件列表
            setRemoteValue(PluginGV.RecyclePluginRemoveCheck, `${pluginRemoveCheck}`)
        })
        /**批量 彻底删除和还原接口调用后的事件 */
        const onBatchRemoveOrReductionPluginAfter = useMemoizedFn(() => {
            setSelectList([])
            if (allCheck) {
                setAllCheck(false)
                setIsSelectRecycleNum(false)
            }
            operatePluginRef.current = undefined
            getInitTotal()
            setRemoveCheckVisible(false)
            onRefreshUserList() // 刷新我的插件列表
            setRemoteValue(PluginGV.RecyclePluginRemoveCheck, `${pluginRemoveCheck}`)
            setLoading(false)
            fetchList(true)
        })
        const onSetFilters = useMemoizedFn(() => {})
        const onPluginRemoveCheckOk = useLockFn(
            useMemoizedFn(async () => {
                try {
                    if (operatePluginRef.current) {
                        await onRemoveClick(operatePluginRef.current)
                    } else {
                        await onRemoveOrReductionPluginBatch("true")
                    }
                } catch (error) {}
            })
        )
        /**初始数据为空的时候,刷新按钮,刷新列表和初始total */
        const onRefListAndTotalAndGroup = useMemoizedFn(() => {
            getInitTotal()
            fetchList(true)
        })
        return (
            <YakitSpin spinning={loading && isLoadingRef.current}>
                <div className={styles["plugins-list-wrapper"]}>
                    <PluginsList
                        checked={allCheck}
                        onCheck={onCheck}
                        isList={isList}
                        setIsList={setIsList}
                        total={response.pagemeta.total}
                        selected={selectNum}
                        filters={{}}
                        setFilters={onSetFilters}
                        visible={true}
                        setVisible={onSetVisible}
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakitPluginOnlineDetail>
                                isList={isList}
                                data={response.data}
                                gridNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectList.includes(data.uuid)
                                    return (
                                        <GridLayoutOpt
                                            order={index}
                                            data={data}
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
                                            extraFooter={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={226}
                                listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectList.includes(data.uuid)
                                    return (
                                        <ListLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.head_img}
                                            title={data.script_name}
                                            help={data.help || ""}
                                            time={data.updated_at}
                                            type={data.type}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={!!data.official}
                                            extraNode={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                listHeight={73}
                                loading={loading}
                                hasMore={hasMore}
                                updateList={onUpdateList}
                                showIndex={showPluginIndex.current}
                                setShowIndex={setShowPluginIndex}
                                isShowSearchResultEmpty={+response.pagemeta.total === 0}
                            />
                        ) : (
                            <div className={styles["plugin-recycle-empty"]}>
                                <YakitEmpty title='暂无数据' />
                                <div className={styles["plugin-recycle-buttons"]}>
                                    <YakitButton
                                        type='outline1'
                                        icon={<OutlineRefreshIcon />}
                                        onClick={onRefListAndTotalAndGroup}
                                    >
                                        刷新
                                    </YakitButton>
                                </div>
                            </div>
                        )}
                    </PluginsList>
                </div>
                <YakitHint
                    visible={removeCheckVisible}
                    title='是否要删除插件'
                    content='确认后插件将彻底删除，无法找回'
                    onOk={onPluginRemoveCheckOk}
                    onCancel={() => setRemoveCheckVisible(false)}
                    footerExtra={
                        <YakitCheckbox
                            checked={pluginRemoveCheck}
                            onChange={(e) => setPluginRemoveCheck(e.target.checked)}
                        >
                            下次不再提醒
                        </YakitCheckbox>
                    }
                />
            </YakitSpin>
        )
    })
)
