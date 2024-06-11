import React, {memo, useRef, useMemo, useState, useReducer, useEffect} from "react"
import {useMemoizedFn, useDebounceFn} from "ahooks"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {PluginSearchParams, PluginListPageMeta, PluginFilterParams} from "@/pages/plugins/baseTemplateType"
import {defaultFilter, defaultSearch} from "@/pages/plugins/builtInData"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {pluginLocalReducer, initialLocalState} from "@/pages/plugins/pluginReducer"
import {
    apiFetchGroupStatisticsLocal,
    convertLocalPluginsRequestParams,
    apiQueryYakScript,
    DeleteYakScriptRequestByIdsProps,
    apiDeleteYakScriptByIds,
    DeleteLocalPluginsByWhereRequestProps,
    convertDeleteLocalPluginsByWhereRequestParams,
    apiDeleteLocalPluginsByWhere
} from "@/pages/plugins/utils"
import {yakitNotify} from "@/utils/notification"
import {cloneDeep} from "bizcharts/lib/utils"
import useListenWidth from "../hooks/useListenWidth"
import {HubButton} from "../hubExtraOperate/funcTemplate"
import {HubOuterList, HubGridList, HubGridOpt, HubListFilter, LocalOptFooterExtra} from "./funcTemplate"
import {useStore} from "@/store"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {HubListBaseProps} from "../type"
import {API} from "@/services/swagger/resposeType"
import {SolidChevrondownIcon, SolidPluscircleIcon} from "@/assets/icon/solid"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import {ExportParamsProps, PluginGroupList} from "@/pages/plugins/local/PluginsLocalType"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {getRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {NoPromptHint} from "../utilsUI/UtilsTemplate"
import {RemotePluginGV} from "@/enums/plugin"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import {randomString} from "@/utils/randomUtil"
import usePluginUploadHooks, {SaveYakScriptToOnlineRequest} from "@/pages/plugins/pluginUploadHooks"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {PluginLocalUpload, PluginLocalUploadSingle} from "@/pages/plugins/local/PluginLocalUpload"
import {PluginLocalExport} from "@/pages/plugins/local/PluginLocalExportProps"
import {DefaultExportRequest} from "../defaultConstant"

import classNames from "classnames"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import styles from "./PluginHubList.module.scss"

const {ipcRenderer} = window.require("electron")

interface HubListLocalProps extends HubListBaseProps {}
/** @name 本地插件 */
export const HubListLocal: React.FC<HubListLocalProps> = memo((props) => {
    const {hiddenFilter, isDetailList, onPluginDetail} = props

    const divRef = useRef<HTMLDivElement>(null)
    const wrapperWidth = useListenWidth(divRef)

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

    // 私有域
    const privateDomain = useRef<string>("")
    const fetchPrivateDomain = useMemoizedFn((callback?: () => void) => {
        getRemoteValue(RemoteGV.HttpSetting)
            .then((res) => {
                if (res) {
                    try {
                        const value = JSON.parse(res)
                        privateDomain.current = value.BaseUrl
                        if (callback) callback()
                    } catch (error) {}
                }
            })
            .catch(() => {})
    })

    /** ---------- 列表相关变量 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    // 是否为获取列表第一页的加载状态
    const isInitLoading = useRef<boolean>(false)
    const hasMore = useRef<boolean>(true)

    const [filterGroup, setFilterGroup] = useState<PluginGroupList[]>([])

    // 列表数据
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    // 全选
    const [allChecked, setAllChecked] = useState<boolean>(false)
    // 选中插件
    const [selectList, setSelectList] = useState<YakScript[]>([])
    // 搜索条件
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))

    const showIndex = useRef<number>(0)
    const setShowIndex = useMemoizedFn((index: number) => {
        showIndex.current = index
    })
    /** ---------- 列表相关变量 End ---------- */

    /** ---------- 列表相关方法 Start ---------- */
    useEffect(() => {
        fetchPrivateDomain()
        fetchFilterGroup()
        fetchList(true)
    }, [])

    useEffect(() => {
        const refreshPrivateDomain = () => {
            fetchPrivateDomain()
        }

        emiter.on("onSwitchPrivateDomain", refreshPrivateDomain)

        return () => {
            emiter.off("onSwitchPrivateDomain", refreshPrivateDomain)
        }
    }, [])

    // 搜搜条件分组数据
    const fetchFilterGroup = useMemoizedFn(() => {
        apiFetchGroupStatisticsLocal()
            .then((res: API.PluginsSearchResponse) => {
                setFilterGroup(res.data)
            })
            .catch(() => {})
    })

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
                      page: +response.Pagination.Page + 1 || 1,
                      limit: +response.Pagination.Limit || 20
                  }

            const queryFilter = filters
            const queryFearch = search
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams({
                    filter: queryFilter,
                    search: queryFearch,
                    pageParams: params
                })
            }
            if (queryFilter.plugin_group?.length) query.ExcludeTypes = ["yak", "codec"]

            try {
                const res = await apiQueryYakScript(query)
                if (!res.Data) res.Data = []

                const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
                hasMore.current = length < +res.Total
                const newData = res.Data.filter((ele) => ele.ScriptName !== "").map((ele) => ({
                    ...ele,
                    isLocalPlugin: privateDomain.current !== ele.OnlineBaseUrl
                }))

                dispatch({
                    type: "add",
                    payload: {
                        response: {
                            ...res,
                            Data: newData
                        }
                    }
                })
                if (+res.Pagination.Page === 1) {
                    setAllChecked(false)
                    setSelectList([])
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
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        // 全选情况时的取消勾选
        if (allChecked) {
            setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
            setAllChecked(false)
            return
        }
        // 单项勾选回调
        if (value) {
            setSelectList([...selectList, data])
        } else {
            const newSelectList = selectList.filter((item) => item.ScriptName !== data.ScriptName)
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
        return Number(response.Total) || 0
    }, [response])
    const isSearch = useMemo(() => {
        if (search.type === "keyword") return !!search.keyword
        if (search.type === "userName") return !!search.userName
        return false
    }, [search])
    const selectedNum = useMemo(() => selectList.length, [selectList])
    const disabledBatchBtn = useMemo(() => {
        return !Number(response.Total)
    }, [response.Total])

    /** ---------- 删除插件 Start ---------- */
    useEffect(() => {
        // 删除插件的二次确认弹框
        getRemoteValue(RemotePluginGV.LocalPluginRemoveCheck)
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
            if (allChecked) {
                let request: DeleteLocalPluginsByWhereRequestProps = convertDeleteLocalPluginsByWhereRequestParams(
                    filters,
                    search
                )
                await apiDeleteLocalPluginsByWhere(request)
            }
            if (!allChecked && selectedNum > 0) {
                let request: DeleteYakScriptRequestByIdsProps = {Ids: selectList.map((item) => item.Id)}
                await apiDeleteYakScriptByIds(request)
            }
        } catch (error) {}
        onCheck(false)
        fetchFilterGroup()
        fetchList(true)
        setTimeout(() => {
            setBatchDelLoading(false)
        }, 200)
    })

    // 单个删除的插件信息队列
    const [singleDel, setSingleDel] = useState<YakScript[]>([])
    const onFooterExtraDel = useMemoizedFn((info: YakScript) => {
        const findIndex = singleDel.findIndex((item) => item.ScriptName === info.ScriptName)
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
    const handleSingeDel = useMemoizedFn((info: YakScript) => {
        let request: DeleteYakScriptRequestByIdsProps = {
            Ids: [info.Id]
        }
        apiDeleteYakScriptByIds(request)
            .then(() => {
                const index = selectList.findIndex((ele) => ele.ScriptName === info.ScriptName)
                if (index !== -1) {
                    optCheck(info, false)
                }
                fetchFilterGroup()
                dispatch({
                    type: "remove",
                    payload: {
                        itemList: [info]
                    }
                })
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSingleDel((arr) => arr.filter((item) => item.ScriptName !== info.ScriptName))
                }, 50)
            })
    })
    /** ---------- 删除插件 End ---------- */

    /** ---------- 上传插件 Start ---------- */
    const taskTokenRef = useRef(randomString(40))
    const {onStart: onStartUploadPlugin} = usePluginUploadHooks({
        isSingle: true,
        taskToken: taskTokenRef.current,
        onUploadData: () => {},
        onUploadSuccess: () => {},
        onUploadEnd: () => {},
        onUploadError: () => {
            yakitNotify("error", "上传失败")
        }
    })

    const [batchUploadLoading, setBatchUploadLoading] = useState<boolean>(false)
    const onHeaderExtraUpload = useMemoizedFn(() => {
        if (!isLogin) {
            yakitNotify("error", "请登录后再上传插件")
            return
        }
        if (!allChecked && selectedNum === 0) return
        handleBatchUpload()
    })
    // 批量上传
    const handleBatchUpload = useMemoizedFn(async () => {
        if (batchDelLoading) return
        setBatchDelLoading(true)

        const list = selectList.map((item) => item.ScriptName) || []
        const m = showYakitModal({
            type: "white",
            title: "批量上传插件",
            content: (
                <PluginLocalUpload
                    pluginNames={list}
                    onClose={() => {
                        setBatchDelLoading(false)
                        m.destroy()
                        setTimeout(() => {
                            fetchList(true)
                        }, 200)
                    }}
                />
            ),
            footer: null,
            modalAfterClose: () => {
                setBatchDelLoading(false)
                onCheck(false)
            }
        })
    })

    // 单个上传的插件信息队列
    const [singleUpload, setSingleUpload] = useState<YakScript[]>([])
    const onFooterExtraUpload = useMemoizedFn((info: YakScript) => {
        const findIndex = singleUpload.findIndex((item) => item.ScriptName === info.ScriptName)
        if (findIndex > -1) {
            yakitNotify("error", "该插件正在执行上传操作,请稍后再试")
            return
        }
        setSingleUpload((arr) => {
            return [...arr, info]
        })
        handleSingeUpload(info)
    })
    // 单个上传
    const handleSingeUpload = useMemoizedFn((info: YakScript) => {
        // 也可以用info里的isLocalPlugin判断
        if (info.OnlineBaseUrl === privateDomain.current) {
            const request: SaveYakScriptToOnlineRequest = {
                ScriptNames: [info.ScriptName],
                IsPrivate: !!info.OnlineIsPrivate
            }
            onStartUploadPlugin(request)
        } else {
            const m = showYakitModal({
                type: "white",
                title: "上传插件",
                content: (
                    <PluginLocalUploadSingle
                        plugin={info}
                        onUploadSuccess={() => handleSingleUploadAfter(info)}
                        onClose={() => {
                            setSingleUpload((arr) => arr.filter((item) => item.ScriptName !== info.ScriptName))
                            m.destroy()
                        }}
                    />
                ),
                footer: null
            })
        }
    })
    // 单个上传成功后
    const handleSingleUploadAfter = useMemoizedFn((info: YakScript) => {
        ipcRenderer
            .invoke("GetYakScriptByName", {Name: info.ScriptName})
            .then((i: YakScript) => {
                const newItem = {...i, isLocalPlugin: privateDomain.current !== i.OnlineBaseUrl}
                dispatch({
                    type: "update",
                    payload: {
                        item: {...newItem}
                    }
                })
            })
            .catch(() => {
                fetchList(true)
                yakitNotify("error", "查询最新的本地数据失败,自动刷新列表")
            })
    })
    /** ---------- 上传插件 End ---------- */

    /** ---------- 导出插件 Start ---------- */
    // 导出插件的选择位置框是否展示
    const isShowExportDialog = useRef<boolean>(false)
    // 导出本地插件
    const [exportModal, setExportModal] = useState<boolean>(false)
    const exportParams = useRef<ExportParamsProps>({...DefaultExportRequest})
    const exportSource = useRef<string>("")
    const onHeaderExtraExport = useMemoizedFn(() => {
        exportSource.current = "batch"
        const Ids: number[] = selectList.map((ele) => Number(ele.Id)).filter((item) => !!item)
        openExportModal(Ids)
    })
    // 单个导出
    const onFooterExtraExport = useMemoizedFn((info: YakScript) => {
        if (isShowExportDialog.current) {
            yakitNotify("error", "正在选择导出地址中...")
            return
        }
        const ids = Number(info.Id) ? [Number(info.Id)] : []
        if (ids.length > 0) {
            exportSource.current = "single"
            openExportModal(ids)
        }
    })
    const openExportModal = useMemoizedFn(async (ids: number[]) => {
        if (exportModal) return
        try {
            isShowExportDialog.current = true
            const showSaveDialogRes = await ipcRenderer.invoke("openDialog", {properties: ["openDirectory"]})
            isShowExportDialog.current = false
            if (showSaveDialogRes.canceled) return
            const page: PluginListPageMeta = {
                page: +response.Pagination.Page,
                limit: +response.Pagination.Limit || 20
            }
            const queryFilters = filters
            const querySearch = search
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams({filter: queryFilters, search: querySearch, pageParams: page})
            }
            const params: ExportParamsProps = {
                OutputDir: showSaveDialogRes.filePaths[0],
                YakScriptIds: ids,
                Keywords: query.Keyword || "",
                Type: query.Type || "",
                UserName: query.UserName || "",
                Tags: query.Tag + ""
            }
            exportParams.current = params
            setExportModal(true)
        } catch (error) {
            yakitNotify("error", error + "")
        }
    })
    const closeExportModal = useMemoizedFn(() => {
        exportParams.current = {...DefaultExportRequest}
        if (exportSource.current === "batch") {
            onCheck(false)
        }
        exportSource.current = ""
        setExportModal(false)
    })
    /** ---------- 导出插件 End ---------- */

    // 新建插件
    const onNewPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Store}})
        )
    })

    // 进入插件详情
    const onOptClick = useMemoizedFn((info: YakitPluginOnlineDetail, index: number) => {
        if (!info.script_name && !info.uuid) {
            yakitNotify("error", "未获取到插件信息，请刷新列表重试")
            return
        }
        onPluginDetail({type: "own", name: info.script_name, uuid: info.uuid})
    })

    // 批量操作
    const headerExtra = useMemo(() => {
        return (
            <div className={styles["hub-list-header-extra"]}>
                <FuncFilterPopover
                    maxWidth={1200}
                    icon={<SolidChevrondownIcon />}
                    name='批量操作'
                    disabled={selectedNum === 0 && !allChecked}
                    button={{
                        type: "outline2",
                        size: "large"
                    }}
                    menu={{
                        type: "primary",
                        data: [
                            {key: "export", label: "导出"},
                            {key: "upload", label: "上传", disabled: allChecked || batchUploadLoading},
                            {key: "remove", label: "删除", disabled: batchDelLoading}
                        ],
                        onClick: ({key}) => {
                            switch (key) {
                                case "export":
                                    onHeaderExtraExport()
                                    break
                                case "upload":
                                    const pluginNames = selectList.map((ele) => ele.ScriptName) || []
                                    onHeaderExtraUpload()
                                    break
                                case "remove":
                                    onHeaderExtraDel()
                                    break
                                default:
                                    return
                            }
                        }
                    }}
                    placement='bottomRight'
                />
                <HubButton
                    width={wrapperWidth}
                    iconWidth={900}
                    icon={<SolidPluscircleIcon />}
                    size='large'
                    name='新建插件'
                    onClick={onNewPlugin}
                />
            </div>
        )
    }, [wrapperWidth, selectedNum, disabledBatchBtn])
    // 单项副标题
    const optSubTitle = useMemoizedFn((data: YakScript) => {
        if (data.isLocalPlugin) return null
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon />
        } else {
            return <SolidCloudpluginIcon />
        }
    })
    // 单项操作
    const extraFooter = useMemoizedFn((info: YakScript) => {
        return (
            <LocalOptFooterExtra
                isLogin={isLogin}
                info={info}
                execUploadInfo={singleUpload}
                onUpload={onFooterExtraUpload}
                onExport={onFooterExtraExport}
                execDelInfo={singleDel}
                onDel={onFooterExtraDel}
            />
        )
    })

    return (
        <div className={styles["plugin-hub-tab-list"]}>
            <YakitSpin spinning={loading && isInitLoading.current}>
                <div className={classNames(styles["outer-list"], {[styles["hidden-view"]]: isDetailList})}>
                    <div className={classNames(styles["list-filter"], {[styles["hidden-view"]]: hiddenFilter})}>
                        <HubListFilter
                            groupList={filterGroup}
                            selecteds={filters as Record<string, API.PluginsSearchData[]>}
                            onSelect={setFilters}
                        />
                    </div>

                    <div className={styles["list-body"]}>
                        {listLength > 0 ? (
                            <HubOuterList
                                title='本地插件'
                                headerExtra={headerExtra}
                                allChecked={allChecked}
                                setAllChecked={onCheck}
                                total={response.Total}
                                selected={selectedNum}
                                search={search}
                                setSearch={setSearch}
                                filters={{}}
                                setFilters={() => {}}
                            >
                                <HubGridList
                                    data={response.Data}
                                    keyName='ScriptName'
                                    loading={loading}
                                    hasMore={hasMore.current}
                                    updateList={onUpdateList}
                                    showIndex={showIndex.current}
                                    setShowIndex={setShowIndex}
                                    gridNode={(info) => {
                                        const {index, data} = info
                                        const check =
                                            allChecked ||
                                            selectList.findIndex((ele) => ele.ScriptName === data.ScriptName) !== -1
                                        return (
                                            <HubGridOpt
                                                order={index}
                                                info={data}
                                                checked={check}
                                                onCheck={optCheck}
                                                title={data.ScriptName}
                                                type={data.Type}
                                                tags={data.Tags}
                                                help={data.Help || ""}
                                                img={data.HeadImg || ""}
                                                user={data.Author || ""}
                                                prImgs={(data.CollaboratorInfo || []).map((ele) => ele.HeadImg)}
                                                time={data.UpdatedAt || 0}
                                                isCorePlugin={!!data.IsCorePlugin}
                                                official={!!data.OnlineOfficial}
                                                extraFooter={extraFooter}
                                                subTitle={optSubTitle}
                                                onClick={onOptClick}
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
                    </div>
                </div>

                {isDetailList && <div className={styles["inner-list"]}></div>}
            </YakitSpin>

            <NoPromptHint
                visible={delHint}
                title='是否要删除插件'
                content='确认删除插件后，插件将会放在回收站'
                cacheKey={RemotePluginGV.LocalPluginRemoveCheck}
                onCallback={delHintCallback}
            />

            <PluginLocalExport
                visible={exportModal}
                getContainer={document.body}
                exportLocalParams={exportParams.current}
                onClose={closeExportModal}
            />
        </div>
    )
})
