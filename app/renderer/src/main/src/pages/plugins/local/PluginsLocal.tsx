import React, {useState, useRef, useMemo, useEffect, useReducer} from "react"
import {
    LocalExtraOperateProps,
    PluginLocalBackProps,
    PluginLocalDetailBackProps,
    PluginsLocalProps
} from "./PluginsLocalType"
import {SolidChevrondownIcon, SolidPluscircleIcon} from "@/assets/icon/solid"
import {useMemoizedFn, useInViewport, useDebounceFn, useLatest} from "ahooks"
import {cloneDeep} from "bizcharts/lib/utils"
import {defaultSearch, PluginsLayout, PluginsContainer, pluginTypeList} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {
    TypeSelect,
    FuncSearch,
    FuncBtn,
    PluginsList,
    FuncFilterPopover,
    ListShowContainer,
    GridLayoutOpt,
    ListLayoutOpt
} from "../funcTemplate"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {OutlineClouduploadIcon, OutlineExportIcon, OutlinePlusIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useStore} from "@/store"
import {PluginsLocalDetail} from "./PluginsLocalDetail"
import {initialLocalState, pluginLocalReducer} from "../pluginReducer"
import {yakitNotify} from "@/utils/notification"
import {TypeSelectOpt} from "../funcTemplateType"
import {API} from "@/services/swagger/resposeType"
import {Tooltip} from "antd"

import "../plugins.scss"
import styles from "./PluginsLocal.module.scss"
import {
    DeleteLocalPluginsByWhereRequestProps,
    DeleteYakScriptRequestProps,
    PluginGV,
    apiDeleteLocalPluginsByWhere,
    apiDeleteYakScript,
    apiFetchGroupStatisticsLocal,
    apiQueryYakScript,
    apiQueryYakScriptTotal,
    convertDeleteLocalPluginsByWhereRequestParams,
    convertLocalPluginsRequestParams
} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {AddLocalPluginGroup} from "@/pages/mitm/MITMPage"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {OutputPluginForm} from "@/pages/yakitStore/PluginOperator"
import emiter from "@/utils/eventBus/eventBus"
import {PluginLocalUpload} from "./PluginLocalUpload"

export const PluginsLocal: React.FC<PluginsLocalProps> = React.memo((props) => {
    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<YakScript>()
    const [filters, setFilters] = useState<PluginFilterParams>({plugin_type: [], tags: []})
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    const [initTotal, setInitTotal] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)

    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<YakScript[]>([])

    const [pluginGroupList, setPluginGroupList] = useState<API.PluginsSearch[]>([])
    const [addGroupVisible, setAddGroupVisible] = useState<boolean>(false)

    const [pluginRemoveCheck, setPluginRemoveCheck] = useState<boolean>(false)
    const [removeCheckVisible, setRemoveCheckVisible] = useState<boolean>(false)

    /** 是否为初次加载 */
    const isLoadingRef = useRef<boolean>(true)
    const pluginsLocalRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsLocalRef)
    const removePluginRef = useRef<YakScript>()
    const removePluginDetailRef = useRef<YakScript>()
    const latestLoadingRef = useLatest(loading)

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList, response.Total])

    const userInfo = useStore((s) => s.userInfo)
    useEffect(() => {
        emiter.on("onRefLocalPluginList", onRefLocalPluginList)
        return () => {
            emiter.off("onRefLocalPluginList", onRefLocalPluginList)
        }
    }, [])
    useEffect(() => {
        getInitTotal()
        getPluginRemoveCheck()
    }, [userInfo.isLogin, inViewport])
    useEffect(() => {
        getPluginGroupListLocal()
    }, [userInfo.isLogin, inViewport])
    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [userInfo.isLogin, filters])

    const onRefLocalPluginList = useMemoizedFn(() => {
        fetchList(true)
    })

    /**获取插件删除的提醒记录状态 */
    const getPluginRemoveCheck = useMemoizedFn(() => {
        getRemoteValue(PluginGV.LocalPluginRemoveCheck).then((data) => {
            setPluginRemoveCheck(data === "true" ? true : false)
        })
    })

    const getInitTotal = useMemoizedFn(() => {
        apiQueryYakScriptTotal().then((res) => {
            setInitTotal(+res.Total)
        })
    })

    /**获取分组统计列表 */
    const getPluginGroupListLocal = useMemoizedFn(() => {
        apiFetchGroupStatisticsLocal().then((res: API.PluginsSearchResponse) => {
            setPluginGroupList(res.data)
        })
    })
    const filtersDetailRef = useRef<PluginFilterParams>() // 详情中的filter条件
    const searchDetailRef = useRef<PluginSearchParams>() // 详情中的search条件
    const fetchList = useDebounceFn(
        useMemoizedFn(async (reset?: boolean) => {
            // if (latestLoadingRef.current) return //先注释，会影响详情的更多加载
            if (reset) {
                isLoadingRef.current = true
            }
            setLoading(true)

            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: +response.Pagination.Page + 1,
                      limit: +response.Pagination.Limit || 20
                  }
            const queryFilters = filtersDetailRef.current ? filtersDetailRef.current : filters
            const querySearch = searchDetailRef.current ? searchDetailRef.current : search
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams(queryFilters, querySearch, params)
            }
            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []
                const length = res.Data.length + response.Data.length
                setHasMore(length < +res.Total)
                dispatch({
                    type: "add",
                    payload: {
                        response: res
                    }
                })
                if (+res.Pagination.Page === 1) {
                    setAllCheck(false)
                    setSelectList([])
                }
            } catch (error) {}
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 200)
        }),
        {wait: 200, leading: true}
    ).run

    // 滚动更多加载
    const onUpdateList = useMemoizedFn(() => {
        fetchList()
    })
    const onSetActive = useMemoizedFn((type: TypeSelectOpt[]) => {
        const newType: API.PluginsSearchData[] = type.map((ele) => ({
            value: ele.key,
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, plugin_type: newType})
    })
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllCheck(value)
    })

    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
            setAllCheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...selectList, data])
        else setSelectList(selectList.filter((item) => item.ScriptName !== data.ScriptName))
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakScript) => {
        return (
            <LocalExtraOperate
                isOwn={userInfo.user_id === data.UserId}
                onRemovePlugin={() => onRemovePluginBefore(data)}
                onExportPlugin={() => onExportPlugin(data)}
                onEditPlugin={() => onEditPlugin(data)}
                onUploadPlugin={() => onUploadPlugin(data)}
            />
        )
    })
    /** 上传 */
    const onUploadPlugin = useMemoizedFn((data: YakScript) => {
        yakitNotify("success", "上传~~~")
    })
    /**编辑 */
    const onEditPlugin = useMemoizedFn((data: YakScript) => {
        yakitNotify("success", "编辑~~~")
    })
    /**导出 */
    const onExportPlugin = useMemoizedFn((data: YakScript) => {
        onExport([data.Id])
    })
    /**单个删除插件之前操作  */
    const onRemovePluginBefore = useMemoizedFn((data: YakScript) => {
        removePluginRef.current = data
        if (pluginRemoveCheck) {
            onRemovePluginSingle(data)
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: YakScript) => {
        setPlugin({...data})
    })
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {})
    const onBack = useMemoizedFn((backValues: PluginLocalBackProps) => {
        searchDetailRef.current = undefined
        filtersDetailRef.current = undefined
        setPlugin(undefined)
        setSearch(backValues.search)
        setFilters(backValues.filter)
        setAllCheck(backValues.allCheck)
        setSelectList(backValues.selectList)
    })
    const onSearch = useMemoizedFn(() => {
        fetchList(true)
    })
    const pluginTypeSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.plugin_type?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.plugin_type])
    /**打开添加至分组的弹窗 */
    const onAddToGroup = useMemoizedFn(() => {
        setAddGroupVisible(true)
    })
    /**批量删除插件之前操作  */
    const onRemovePluginBatchBefore = useMemoizedFn(() => {
        if (pluginRemoveCheck) {
            onRemovePluginBatch()
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /**批量删除 */
    const onRemovePluginBatch = useMemoizedFn(async () => {
        setLoading(true)
        try {
            if (allCheck) {
                //带条件删除全部
                const deleteAllParams: DeleteLocalPluginsByWhereRequestProps = {
                    ...convertDeleteLocalPluginsByWhereRequestParams(filters, search)
                }
                await apiDeleteLocalPluginsByWhere(deleteAllParams)
            } else {
                // 批量删除
                let deleteBatchParams: DeleteYakScriptRequestProps = {
                    Ids: (selectList || []).map((ele) => ele.Id)
                }
                await apiDeleteYakScript(deleteBatchParams)
            }
        } catch (error) {}
        setRemoveCheckVisible(false)
        setSelectList([])
        if (allCheck) {
            setAllCheck(false)
        }
        getInitTotal()
        getPluginGroupListLocal()
        setRemoteValue(PluginGV.LocalPluginRemoveCheck, `${pluginRemoveCheck}`)
        setLoading(false)
        fetchList(true)
    })
    /**删除提示弹窗 */
    const onPluginRemoveCheckOk = useMemoizedFn(() => {
        if (removePluginRef.current) {
            onRemovePluginSingle(removePluginRef.current)
        } else {
            onRemovePluginBatch()
        }
    })
    /**列表单个删除 */
    const onRemovePluginSingle = useMemoizedFn((data: YakScript) => {
        onRemovePluginSingleBase(data).then(() => {
            dispatch({
                type: "remove",
                payload: {
                    itemList: [data]
                }
            })
        })
    })
    /**单个删除基础 */
    const onRemovePluginSingleBase = useMemoizedFn((data: YakScript) => {
        let deleteParams: DeleteYakScriptRequestProps = {
            Ids: [data.Id]
        }
        return new Promise<void>((resolve, reject) => {
            apiDeleteYakScript(deleteParams)
                .then(() => {
                    const index = selectList.findIndex((ele) => ele.ScriptName === data.ScriptName)
                    if (index !== -1) {
                        optCheck(data, false)
                    }
                    removePluginRef.current = undefined
                    removePluginDetailRef.current = undefined
                    setRemoveCheckVisible(false)
                    getInitTotal()
                    getPluginGroupListLocal()
                    setRemoteValue(PluginGV.LocalPluginRemoveCheck, `${pluginRemoveCheck}`)
                    resolve()
                })
                .catch(reject)
        })
    })
    /**导出插件 */
    const onExport = useMemoizedFn((Ids: number[]) => {
        showYakitModal({
            title: "导出插件配置",
            width: "40%",
            footer: null,
            content: (
                <div style={{padding: 24}}>
                    <OutputPluginForm YakScriptIds={Ids} isSelectAll={allCheck} />
                </div>
            )
        })
    })
    const checkList = useMemo(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])
    const onRemovePluginDetailSingleBefore = useMemoizedFn((data: YakScript) => {
        removePluginDetailRef.current = data
        if (pluginRemoveCheck) {
            onRemovePluginDetailSingle(data)
        } else {
            setRemoveCheckVisible(true)
        }
    })
    /**详情中调用删除操作 */
    const onRemovePluginDetailSingle = useMemoizedFn((data) => {
        onRemovePluginSingleBase(data).then(() => {
            if (response.Data.length === 1) {
                // 如果删除是最后一个，就回到列表中得空页面
                setPlugin(undefined)
            } else {
                const index = response.Data.findIndex((ele) => ele.ScriptName === data.ScriptName)
                if (index === -1) return
                if (index === Number(response.Total) - 1) {
                    // 选中得item为最后一个，删除后选中倒数第二个
                    setPlugin({
                        ...response.Data[index - 1]
                    })
                } else {
                    //选择下一个
                    setPlugin({
                        ...response.Data[index + 1]
                    })
                }
            }
            dispatch({
                type: "remove",
                payload: {
                    itemList: [data]
                }
            })
        })
    })
    /** 详情搜索事件 */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        searchDetailRef.current = detailSearch
        filtersDetailRef.current = detailFilter
        fetchList(true)
    })
    const onDetailsBatchRemove = useMemoizedFn((newParams: PluginLocalDetailBackProps) => {
        setAllCheck(newParams.allCheck)
        setFilters(newParams.filter)
        setSearch(newParams.search)
        setSelectList(newParams.selectList)
        setTimeout(() => {
            onRemovePluginBatchBefore()
        }, 200)
    })
    const onBatchUpload = useMemoizedFn(() => {
        if (selectList.length === 0) return
        const pluginNames = selectList.map((ele) => ele.ScriptName) || []
        const m = showYakitModal({
            type: "white",
            title: "批量上传插件",
            content: <PluginLocalUpload pluginNames={pluginNames} onClose={() => m.destroy()} />,
            footer: null
        })
    })
    return (
        <>
            {!!plugin && (
                <PluginsLocalDetail
                    info={plugin}
                    defaultAllCheck={allCheck}
                    loading={loading}
                    defaultSelectList={selectList}
                    response={response}
                    onBack={onBack}
                    loadMoreData={onUpdateList}
                    defaultSearchValue={search}
                    defaultFilter={filters}
                    dispatch={dispatch}
                    onRemovePluginDetailSingleBefore={onRemovePluginDetailSingleBefore}
                    onDetailExport={onExport}
                    onDetailSearch={onDetailSearch}
                    spinLoading={loading && isLoadingRef.current}
                    onDetailsBatchRemove={onDetailsBatchRemove}
                />
            )}
            <PluginsLayout
                title='本地插件'
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginTypeSelect} list={pluginTypeList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper' ref={pluginsLocalRef}>
                        <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            <FuncFilterPopover
                                maxWidth={1200}
                                icon={<SolidChevrondownIcon />}
                                name='批量操作'
                                disabled={selectNum === 0}
                                button={{
                                    type: "outline2",
                                    size: "large"
                                }}
                                menu={{
                                    type: "primary",
                                    data: [
                                        {key: "export", label: "导出"},
                                        {key: "upload", label: "上传",disabled: allCheck},
                                        {key: "remove", label: "删除"}
                                        // {key: "addToGroup", label: "添加至分组", disabled: allCheck} //第二版放出来
                                    ],
                                    onClick: ({key}) => {
                                        switch (key) {
                                            case "export":
                                                const Ids: number[] = selectList.map((ele) => Number(ele.Id))
                                                onExport(Ids)
                                                break
                                            case "upload":
                                                onBatchUpload()
                                                break
                                            case "remove":
                                                onRemovePluginBatchBefore()
                                                break
                                            case "addToGroup":
                                                onAddToGroup()
                                                break
                                            default:
                                                return
                                        }
                                    }
                                }}
                                placement='bottomRight'
                            />
                            <FuncBtn
                                maxWidth={1050}
                                icon={<SolidPluscircleIcon />}
                                size='large'
                                name='新建插件'
                                onClick={onNewAddPlugin}
                            />
                        </div>
                    </div>
                }
            >
                <PluginsContainer
                    loading={loading && isLoadingRef.current}
                    visible={showFilter}
                    setVisible={setShowFilter}
                    selecteds={filters as Record<string, API.PluginsSearchData[]>}
                    onSelect={setFilters}
                    groupList={pluginGroupList}
                >
                    <PluginsList
                        checked={allCheck}
                        onCheck={onCheck}
                        isList={isList}
                        setIsList={setIsList}
                        total={response.Total}
                        selected={selectNum}
                        filters={filters}
                        setFilters={setFilters}
                        visible={showFilter}
                        setVisible={setShowFilter}
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakScript>
                                id='local'
                                isList={isList}
                                data={response.Data || []}
                                gridNode={(info: {index: number; data: YakScript}) => {
                                    const {data} = info
                                    const check = allCheck || checkList.includes(data.ScriptName)
                                    return (
                                        <GridLayoutOpt
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            title={data.ScriptName}
                                            type={data.Type}
                                            tags={data.Tags}
                                            help={data.Help || ""}
                                            img={data.HeadImg || ""}
                                            user={data.Author || ""}
                                            isCorePlugin={!!data.IsCorePlugin}
                                            official={!!data.OnlineOfficial}
                                            // prImgs={data.prs}
                                            time={data.UpdatedAt || 0}
                                            extraFooter={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={210}
                                listNode={(info: {index: number; data: YakScript}) => {
                                    const {data} = info
                                    const check = allCheck || checkList.includes(data.ScriptName)
                                    return (
                                        <ListLayoutOpt
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.HeadImg || ""}
                                            title={data.ScriptName}
                                            help={data.Help || ""}
                                            time={data.UpdatedAt || 0}
                                            type={data.Type}
                                            isCorePlugin={!!data.IsCorePlugin}
                                            official={!!data.OnlineOfficial}
                                            extraNode={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                listHeight={73}
                                loading={loading}
                                hasMore={hasMore}
                                updateList={onUpdateList}
                                isShowSearchResultEmpty={+response.Total === 0}
                            />
                        ) : (
                            <div className={styles["plugin-local-empty"]}>
                                <YakitEmpty
                                    title='暂无数据'
                                    description='可新建插件同步至云端，创建属于自己的插件'
                                    style={{marginTop: 80}}
                                />
                                <div className={styles["plugin-local-buttons"]}>
                                    <YakitButton type='outline1' icon={<OutlinePlusIcon />} onClick={onNewAddPlugin}>
                                        新建插件
                                    </YakitButton>
                                </div>
                            </div>
                        )}
                    </PluginsList>
                </PluginsContainer>
            </PluginsLayout>
            <AddLocalPluginGroup visible={addGroupVisible} setVisible={setAddGroupVisible} checkList={checkList} />
            <YakitHint
                visible={removeCheckVisible}
                title='是否要删除插件'
                content='确认删除插件后，插件将会放在回收站'
                onOk={onPluginRemoveCheckOk}
                onCancel={() => setRemoveCheckVisible(false)}
                footerExtra={
                    <YakitCheckbox checked={pluginRemoveCheck} onChange={(e) => setPluginRemoveCheck(e.target.checked)}>
                        下次不再提醒
                    </YakitCheckbox>
                }
            />
        </>
    )
})

export const LocalExtraOperate: React.FC<LocalExtraOperateProps> = React.memo((props) => {
    const {isOwn, onRemovePlugin, onExportPlugin, onEditPlugin, onUploadPlugin} = props
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        onRemovePlugin()
    })
    const onExport = useMemoizedFn((e) => {
        e.stopPropagation()
        onExportPlugin()
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        onEditPlugin()
    })
    const onUpload = useMemoizedFn((e) => {
        e.stopPropagation()
        onUploadPlugin()
    })
    return (
        <div className={styles["local-extra-operate-wrapper"]}>
            <Tooltip title='删除' destroyTooltipOnHide={true}>
                <YakitButton type='text2' icon={<OutlineTrashIcon onClick={onRemove} />} />
            </Tooltip>
            <div className='divider-style' />
            <Tooltip title='导出' destroyTooltipOnHide={true}>
                <YakitButton type='text2' icon={<OutlineExportIcon onClick={onExport} />} />
            </Tooltip>
            <div className='divider-style' />
            <Tooltip title='编辑' destroyTooltipOnHide={true}>
                <YakitButton type='text2' icon={<OutlinePencilaltIcon onClick={onEdit} />} />
            </Tooltip>
            {isOwn && (
                <>
                    <div className='divider-style' />
                    <YakitButton
                        icon={<OutlineClouduploadIcon />}
                        onClick={onUpload}
                        className={styles["cloud-upload-icon"]}
                    >
                        上传
                    </YakitButton>
                </>
            )}
        </div>
    )
})
