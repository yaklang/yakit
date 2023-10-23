import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {yakitNotify} from "@/utils/notification"
import React, {useState, useReducer, useEffect, useMemo, forwardRef, useImperativeHandle} from "react"
import {PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginsList, ListShowContainer, GridLayoutOpt, ListLayoutOpt, OnlineRecycleExtraOperate} from "../funcTemplate"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {pluginOnlineReducer, initialOnlineState} from "../pluginReducer"
import {apiFetchRecycleList, PluginsQueryProps, convertPluginsRequestParams, apiDumpPlugin} from "../utils"
import {PluginRecycleListProps} from "./PluginUserType"
import {useMemoizedFn, useLockFn, useControllableValue} from "ahooks"

import "../plugins.scss"
import {API} from "@/services/swagger/resposeType"

export const PluginRecycleList: React.FC<PluginRecycleListProps> = React.memo(
    forwardRef((props, ref) => {
        const {refresh, inViewport, isLogin, setIsSelectRecycleNum} = props
        /** 是否为加载更多 */
        const [loading, setLoading] = useState<boolean>(false)
        const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
        const [selectList, setSelectList] = useState<string[]>([])
        const [isList, setIsList] = useState<boolean>(true)
        const [hasMore, setHasMore] = useState<boolean>(true)
        const [search, setSearch] = useControllableValue<PluginSearchParams>(props, {
            defaultValuePropName: "searchValue",
            valuePropName: "searchValue",
            trigger: "setSearchValue"
        })
        const [allCheck, setAllCheck] = useState<boolean>(false)

        const [initTotal, setInitTotal] = useState<number>(0)
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
            getInitTotal()
        }, [inViewport, refresh])
        // 页面初始化的首次列表请求
        useEffect(() => {
            fetchList(true)
        }, [isLogin, refresh])
        useEffect(() => {
            setIsSelectRecycleNum(selectList.length > 0)
        }, [selectList.length])

        const getInitTotal = useMemoizedFn(() => {
            apiFetchRecycleList({
                page: 1,
                limit: 1
            }).then((res) => {
                setInitTotal(+res.pagemeta.total)
            })
        })

        const fetchList = useLockFn(
            useMemoizedFn(async (reset?: boolean) => {
                if (loading) return

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
                    const length = res.data.length + response.data.length
                    setHasMore(length < +res.pagemeta.total)
                    if (!res.data) res.data = []
                    dispatch({
                        type: "add",
                        payload: {
                            response: {...res}
                        }
                    })
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                } catch (error) {
                    yakitNotify("error", "请求数据失败:" + error)
                }
            })
        )
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
            if (value) setSelectList([])
            setAllCheck(value)
            setIsSelectRecycleNum(value)
        })
        /** 单项点击回调 */
        const optClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {})
        // 选中插件的数量
        const selectNum = useMemo(() => {
            if (allCheck) return response.pagemeta.total
            else return selectList.length
        }, [allCheck, selectList])
        const onSetVisible = useMemoizedFn(() => {})
        /** 单项额外操作组件 */
        const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            return (
                <OnlineRecycleExtraOperate
                    isLogin={isLogin}
                    data={data}
                    onRemoveClick={onRemoveClick}
                    onReductionClick={onReductionClick}
                />
            )
        })
        /** 批量删除插件之前操作 */
        const onRemovePluginBatchBefore = useMemoizedFn(() => {
            onRemovePluginBatch()
        })
        /** 批量还原插件之前操作 */
        const onReductionPluginBatchBefore = useMemoizedFn(() => {
            onReductionPluginBatch()
        })
        /**批量删除 */
        const onRemovePluginBatch = useMemoizedFn(() => {
            // console.log("pluginRemoveCheck", pluginRemoveCheck)
            if (!allCheck && selectList.length === 0) {
                // 删除全部，清空
                console.log("全部清空")
                // apiDumpPlugin().then(() => {
                //     fetchList(true)
                //     getInitTotal()
                // })
            } else {
                // 批量删除
                let deleteParams: API.PluginsWhereDeleteRequest = {}

                if (allCheck) {
                    deleteParams = {
                        ...convertPluginsRequestParams({}, search)
                    }
                } else {
                    deleteParams = {
                        uuid: selectList
                    }
                }
                console.log("批量删除", deleteParams)
                // apiDumpPlugin(deleteParams).then(() => {
                //     setSelectList([])
                //     if (allCheck) {
                //         setAllCheck(false)
                //         setIsSelectRecycleNum(false)
                //     }
                //     getInitTotal()
                //     fetchList(true)
                // })
            }
        })
        /**批量删除 */
        const onReductionPluginBatch = useMemoizedFn(() => {
            // console.log("pluginRemoveCheck", pluginRemoveCheck)
            if (!allCheck && selectList.length === 0) {
                // 全部还原
                console.log("全部还原")
                // apiDumpPlugin().then(() => {
                //     fetchList(true)
                //     getInitTotal()
                // })
            } else {
                // 批量还原
                let deleteParams: API.PluginsWhereDeleteRequest = {}

                if (allCheck) {
                    deleteParams = {
                        ...convertPluginsRequestParams({}, search)
                    }
                } else {
                    deleteParams = {
                        uuid: selectList
                    }
                }
                console.log("批量还原", deleteParams)
                // apiDumpPlugin(deleteParams).then(() => {
                //     setSelectList([])
                //     if (allCheck) {
                //         setAllCheck(false)
                //         setIsSelectRecycleNum(false)
                //     }
                //     getInitTotal()
                //     fetchList(true)
                // })
            }
        })
        /**单个删除 */
        const onRemoveClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            let deleteParams: API.PluginsWhereDeleteRequest = {
                uuid: [data.uuid]
            }
            console.log("单个删除", deleteParams)
            // apiDumpPlugin(deleteParams).then(() => {
            //     dispatch({
            //         type: "remove",
            //         payload: {
            //             itemList: [data]
            //         }
            //     })
            //     const index = selectList.findIndex((ele) => ele === data.uuid)
            //     if (index !== -1) {
            //         optCheck(data, false)
            //     }
            //     getInitTotal()
            // })
        })
        /**单个还原 */
        const onReductionClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
            let deleteParams: API.PluginsWhereDeleteRequest = {
                uuid: [data.uuid]
            }
            console.log("单个还原", deleteParams)
            // apiDumpPlugin(deleteParams).then(() => {
            //     dispatch({
            //         type: "remove",
            //         payload: {
            //             itemList: [data]
            //         }
            //     })
            //     const index = selectList.findIndex((ele) => ele === data.uuid)
            //     if (index !== -1) {
            //         optCheck(data, false)
            //     }
            //     getInitTotal()
            // })
        })
        const onSetFilters = useMemoizedFn(() => {})
        return (
            <>
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
                                const {data} = info
                                const check = allCheck || selectList.includes(data.uuid)
                                return (
                                    <GridLayoutOpt
                                        data={data}
                                        checked={check}
                                        onCheck={optCheck}
                                        title={data.script_name}
                                        type={data.type}
                                        tags={data.tags}
                                        help={data.help || ""}
                                        img={data.head_img || ""}
                                        user={data.authors || ""}
                                        // prImgs={data.prs}
                                        time={data.updated_at}
                                        extraFooter={optExtraNode}
                                        onClick={optClick}
                                    />
                                )
                            }}
                            gridHeight={210}
                            listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                const {data} = info
                                const check = allCheck || selectList.includes(data.uuid)
                                return (
                                    <ListLayoutOpt
                                        data={data}
                                        checked={check}
                                        onCheck={optCheck}
                                        img={data.head_img}
                                        title={data.script_name}
                                        help={data.help || ""}
                                        time={data.updated_at}
                                        extraNode={optExtraNode}
                                        onClick={optClick}
                                    />
                                )
                            }}
                            listHeight={73}
                            loading={loading}
                            hasMore={hasMore}
                            updateList={onUpdateList}
                        />
                    ) : (
                        <YakitEmpty title='暂无数据' style={{marginTop: 80}} />
                    )}
                </PluginsList>
            </>
        )
    })
)
