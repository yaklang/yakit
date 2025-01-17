import React, {memo, useRef, useMemo, useState, useReducer, useEffect} from "react"
import {useMemoizedFn, useDebounceFn, useUpdateEffect, useInViewport, useDebounceEffect} from "ahooks"
import {
    OutlineClouduploadIcon,
    OutlinePluscircleIcon,
    OutlinePlusIcon,
    OutlineRefreshIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {PluginSearchParams, PluginListPageMeta, PluginFilterParams} from "@/pages/plugins/baseTemplateType"
import {defaultFilter, defaultSearch} from "@/pages/plugins/builtInData"
import {pluginLocalReducer, initialLocalState} from "@/pages/plugins/pluginReducer"
import {
    apiFetchGroupStatisticsLocal,
    convertLocalPluginsRequestParams,
    apiQueryYakScript,
    DeleteYakScriptRequestByIdsProps,
    apiDeleteYakScriptByIds,
    DeleteLocalPluginsByWhereRequestProps,
    convertDeleteLocalPluginsByWhereRequestParams,
    apiDeleteLocalPluginsByWhere,
    apiQueryYakScriptTotal,
    excludeNoExistfilter,
    apiFetchGetYakScriptGroupLocal,
    apiFetchSaveYakScriptGroupLocal
} from "@/pages/plugins/utils"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import useListenWidth from "../hooks/useListenWidth"
import {HubButton} from "../hubExtraOperate/funcTemplate"
import {
    HubOuterList,
    HubGridList,
    HubGridOpt,
    HubListFilter,
    LocalOptFooterExtra,
    HubDetailList,
    HubDetailListOpt
} from "./funcTemplate"
import {useStore} from "@/store"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {HubListBaseProps} from "../type"
import {API} from "@/services/swagger/resposeType"
import {SolidChevrondownIcon, SolidPluscircleIcon} from "@/assets/icon/solid"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {FilterPopoverBtn, FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import {ExportYakScriptStreamRequest, PluginGroupList} from "@/pages/plugins/local/PluginsLocalType"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {NoPromptHint} from "../utilsUI/UtilsTemplate"
import {RemotePluginGV} from "@/enums/plugin"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon, SolidYakOfficialPluginColorIcon} from "@/assets/icon/colors"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {PluginLocalUpload} from "@/pages/plugins/local/PluginLocalUpload"
import {PluginLocalExport, PluginLocalExportForm} from "@/pages/plugins/local/PluginLocalExportProps"
import {DefaultExportRequest, DefaultLocalPlugin, PluginOperateHint} from "../defaultConstant"
import useGetSetState from "../hooks/useGetSetState"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {Tooltip} from "antd"
import {ModifyYakitPlugin} from "@/pages/pluginEditor/modifyYakitPlugin/ModifyYakitPlugin"
import {ModifyPluginCallback} from "@/pages/pluginEditor/pluginEditor/PluginEditor"
import {grpcFetchLocalPluginDetail} from "../utils/grpc"
import {KeyParamsFetchPluginDetail} from "@/pages/pluginEditor/base"
import {PluginUploadModal} from "../pluginUploadModal/PluginUploadModal"
import {PluginGroupDrawer} from "../group/PluginGroupDrawer"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {UpdateGroupList, UpdateGroupListItem} from "../group/UpdateGroupList"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ListDelGroupConfirmPop} from "../group/PluginOperationGroupList"
import {defaultAddYakitScriptPageInfo} from "@/defaultConstants/AddYakitScript"

import classNames from "classnames"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import styles from "./PluginHubList.module.scss"
import {getRemoteHttpSettingGV} from "@/utils/envfile"

interface HubListLocalProps extends HubListBaseProps {
    rootElementId?: string
    openGroupDrawer: boolean
    onSetOpenGroupDrawer: (openGroupDrawer: boolean) => void
}
/** @name 本地插件 */
export const HubListLocal: React.FC<HubListLocalProps> = memo((props) => {
    const {
        rootElementId,
        hiddenFilter,
        isDetailList,
        hiddenDetailList,
        onPluginDetail,
        openGroupDrawer,
        onSetOpenGroupDrawer
    } = props

    const divRef = useRef<HTMLDivElement>(null)
    const wrapperWidth = useListenWidth(divRef)
    const [inViewPort = true] = useInViewport(divRef)

    const userinfo = useStore((s) => s.userInfo)
    const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

    // 私有域
    const privateDomain = useRef<string>("")
    const fetchPrivateDomain = useMemoizedFn((callback?: () => void) => {
        getRemoteValue(getRemoteHttpSettingGV())
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

    // 列表无条件下的总数
    const [listTotal, setListTotal] = useState<number>(0)

    const [filterGroup, setFilterGroup] = useState<PluginGroupList[]>([])

    // 列表数据
    const [response, dispatch] = useReducer(pluginLocalReducer, initialLocalState)
    // 全选
    const [allChecked, setAllChecked] = useState<boolean>(false)
    // 选中插件
    const [selectList, setSelectList] = useState<YakScript[]>([])
    // 搜索条件
    const [search, setSearch, getSearch] = useGetSetState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters, getFilters] = useGetSetState<PluginFilterParams>(cloneDeep(defaultFilter))

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
            fetchFilterGroup()
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        fetchPrivateDomain(() => {
            handleRefreshList(true)
        })
    }, [])

    useUpdateEffect(() => {
        fetchList(true)
    }, [isLogin])
    useUpdateEffect(() => {
        if (inViewPort) onRefreshFilterAndTotal()
    }, [inViewPort])
    /** 搜索条件 */
    useUpdateEffect(() => {
        fetchList(true)
    }, [filters])

    const fetchInitTotal = useMemoizedFn(() => {
        apiQueryYakScriptTotal(true)
            .then((res) => {
                setListTotal(Number(res.Total) || 0)
            })
            .catch(() => {})
    })

    // 搜索条件分组数据
    const fetchFilterGroup = useMemoizedFn((refFlagList: boolean = true) => {
        apiFetchGroupStatisticsLocal()
            .then((res: API.PluginsSearchResponse) => {
                if (refFlagList) {
                    const latestGroup = res.data.find((item) => item.groupKey === "plugin_group")?.data || []
                    const oldGroup = filterGroup.find((item) => item.groupKey === "plugin_group")?.data || []
                    const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, res.data)
                    if (updateFilterFlag) {
                        setFilters(realFilter)
                    } else {
                        if (JSON.stringify(latestGroup) != JSON.stringify(oldGroup)) {
                            fetchList(true)
                        }
                    }
                }
                setFilterGroup(res.data)
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
                      page: +response.Pagination.Page + 1 || 1,
                      limit: +response.Pagination.Limit || 20
                  }

            const queryFilter = {...getFilters()}
            const queryFearch = {...getSearch()}
            const query: QueryYakScriptRequest = {
                ...convertLocalPluginsRequestParams({
                    filter: queryFilter,
                    search: queryFearch,
                    pageParams: params
                })
            }

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
        handleRefreshList(true)
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

    /** 搜索内容 */
    const onSearch = useDebounceFn(
        useMemoizedFn((val: PluginSearchParams) => {
            setSearch(val)
            fetchList(true)
        }),
        {wait: 300, leading: true}
    ).run
    /** ---------- 列表相关方法 End ---------- */

    const listLength = useMemo(() => {
        return Number(response.Total) || 0
    }, [response])
    const selectedNum = useMemo(() => {
        if (allChecked) return listLength
        else return selectList.length
    }, [allChecked, selectList, listLength])

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
            if (allChecked) {
                let request: DeleteLocalPluginsByWhereRequestProps = convertDeleteLocalPluginsByWhereRequestParams(
                    {...getFilters()},
                    {...getSearch()}
                )
                await apiDeleteLocalPluginsByWhere(request)
            }
            if (!allChecked && selectedNum > 0) {
                let request: DeleteYakScriptRequestByIdsProps = {Ids: selectList.map((item) => item.Id)}
                await apiDeleteYakScriptByIds(request)
            }
        } catch (error) {}
        onCheck(false)
        handleRefreshList(true)
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
                onRefreshFilterAndTotal()
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
    const [batchUploadLoading, setBatchUploadLoading] = useState<boolean>(false)
    const onHeaderExtraUpload = useMemoizedFn(() => {
        if (batchUploadLoading) return
        if (!isLogin) {
            yakitNotify("error", "请登录后再上传插件")
            return
        }
        if (selectedNum === 0) return
        handleBatchUpload()
    })
    // 批量上传
    const handleBatchUpload = useMemoizedFn(async () => {
        if (batchUploadLoading) return
        setBatchUploadLoading(true)

        const list = selectList.filter((item) => !item.IsCorePlugin).map((item) => item.ScriptName) || []
        if (!allChecked && list.length === 0) {
            yakitNotify("error", "勾选的插件全为内置插件或没有勾选插件")
            return
        }
        const m = showYakitModal({
            type: "white",
            title: "批量上传插件",
            content: (
                <PluginLocalUpload
                    pluginNames={list}
                    onClose={() => {
                        setBatchUploadLoading(false)
                        m.destroy()
                        setTimeout(() => {
                            // 刷新我的列表
                            emiter.emit("onRefreshOwnPluginList", true)
                            fetchList(true)
                        }, 200)
                    }}
                />
            ),
            footer: null,
            modalAfterClose: () => {
                setBatchUploadLoading(false)
                onCheck(false)
            }
        })
    })

    // 单个上传的插件信息队列
    const uploadPlugin = useRef<YakScript>()
    const onFooterExtraUpload = useMemoizedFn((info: YakScript) => {
        if (!isLogin) {
            yakitNotify("error", "登录后才可上传插件")
            return
        }
        if (!!uploadPlugin.current) {
            yakitNotify("error", "有插件正在执行上传操作,请稍后再试")
            return
        }
        uploadPlugin.current = cloneDeep(info)
        openUploadHint()
    })
    const [uploadHint, setUploadHint] = useState<boolean>(false)
    const openUploadHint = useMemoizedFn(() => {
        if (uploadHint) return
        if (!uploadPlugin.current) return
        setUploadHint(true)
    })
    const uploadHintCallback = useMemoizedFn(
        (result: boolean, plugin?: YakScript, onlinePlugin?: API.PostPluginsResponse) => {
            // 新建云端
            if (result && plugin) {
                dispatch({
                    type: "replace",
                    payload: {
                        item: {...plugin}
                    }
                })
            }
            // 编辑云端(有 uuid，但是云端上传时被删除)
            if (result && !plugin && onlinePlugin && uploadPlugin.current) {
                dispatch({
                    type: "replace",
                    payload: {
                        item: {...uploadPlugin.current, ScriptName: onlinePlugin.script_name, UUID: onlinePlugin.uuid}
                    }
                })
            }
            uploadPlugin.current = undefined
            setUploadHint(false)
        }
    )
    /** ---------- 上传插件 End ---------- */

    /** ---------- 导出插件 Start ---------- */
    // 导出本地插件
    const [exportModal, setExportModal] = useState<boolean>(false)
    const exportParams = useRef<ExportYakScriptStreamRequest>({...DefaultExportRequest})
    const exportSource = useRef<string>("")
    const onHeaderExtraExport = useMemoizedFn(() => {
        exportSource.current = "batch"
        const names: string[] = selectList.map((ele) => ele.ScriptName).filter((item) => !!item)
        openExportModal(names)
    })
    // 单个导出
    const onFooterExtraExport = useMemoizedFn((info: YakScript) => {
        exportSource.current = "single"
        openExportModal([info.ScriptName])
    })
    const openExportModal = useMemoizedFn(async (names: string[]) => {
        if (exportModal) return
        try {
            let m = showYakitModal({
                title: "导出插件",
                width: 450,
                closable: true,
                maskClosable: false,
                footer: null,
                content: (
                    <div style={{marginBottom: 15}}>
                        <div className={styles.infoBox}>
                            远程模式下导出后请打开~Yakit\yakit-projects\projects路径查看导出文件，文件名无需填写后缀
                        </div>
                        <PluginLocalExportForm
                            onCancel={() => m.destroy()}
                            onOK={(values) => {
                                const page: PluginListPageMeta = {
                                    page: +response.Pagination.Page,
                                    limit: +response.Pagination.Limit || 20
                                }
                                const queryFilters = {...getFilters()}
                                const querySearch = {...getSearch()}
                                const query: QueryYakScriptRequest = {
                                    ...convertLocalPluginsRequestParams({
                                        filter: queryFilters,
                                        search: querySearch,
                                        pageParams: page
                                    })
                                }
                                const params: ExportYakScriptStreamRequest = {
                                    OutputFilename: values.OutputFilename,
                                    Password: values.Password,
                                    Filter: {...query, IncludedScriptNames: names}
                                }
                                exportParams.current = params
                                setExportModal(true)
                                m.destroy()
                            }}
                        ></PluginLocalExportForm>
                    </div>
                ),
                getContainer: divRef.current || undefined
            })
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

    /** ---------- 编辑插件 Start ---------- */
    const editPlugin = useRef<YakScript>()
    const [editHint, setEditHint] = useState<boolean>(false)
    const handleOpenEditHint = useMemoizedFn((info: YakScript) => {
        if (editHint) return
        editPlugin.current = cloneDeep(info)
        setEditHint(true)
    })
    const handleEditHintCallback = useMemoizedFn(async (isSuccess: boolean, data?: ModifyPluginCallback) => {
        if (isSuccess && data) {
            const {opType, info} = data
            // 关闭编辑插件弹窗
            if (opType !== "save") {
                editPlugin.current = undefined
                setEditHint(false)
            }
        } else {
            editPlugin.current = undefined
            setEditHint(false)
        }
    })
    /** ---------- 编辑插件 End ---------- */

    // 新建插件
    const onNewPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.AddYakitScript,
                params: {...defaultAddYakitScriptPageInfo, source: YakitRoute.Plugin_Hub}
            })
        )
    })

    /** ---------- 分组 Start ---------- */
    // 组抽屉列表
    const [pluginGroupMagDrawer, setPluginGroupMagDrawer] = useState<boolean>(false)
    const onOpenPluginGroup = useMemoizedFn((e) => {
        e.stopPropagation()
        setPluginGroupMagDrawer(true)
    })
    const onPluginGroupMagDrawerClose = useMemoizedFn((changeGroupListFlag: boolean) => {
        setPluginGroupMagDrawer(false)
        onSetOpenGroupDrawer(false)
        if (changeGroupListFlag) {
            fetchFilterGroup()
        }
    })
    useEffect(() => {
        openGroupDrawer && setPluginGroupMagDrawer(true)
    }, [openGroupDrawer])

    // 本地获取插件所在插件组和其他插件组
    const scriptNameRef = useRef<string[]>([])
    const updateGroupListRef = useRef<any>()
    const [addGroupVisible, setAddGroupVisible] = useState<boolean>(false)
    const [groupList, setGroupList] = useState<UpdateGroupListItem[]>([]) // 组数据
    const getYakScriptGroupLocal = (scriptName: string[]) => {
        scriptNameRef.current = scriptName
        const query = getGroupPluginListQuery(scriptName)
        apiFetchGetYakScriptGroupLocal(query).then((res) => {
            const copySetGroup = [...res.SetGroup]
            const newSetGroup = copySetGroup.map((name) => ({
                groupName: name,
                checked: true
            }))
            let copyAllGroup = [...res.AllGroup]
            const newAllGroup = copyAllGroup.map((name) => ({
                groupName: name,
                checked: false
            }))
            setGroupList([...newSetGroup, ...newAllGroup])
        })
    }

    // 更新组数据
    const updateGroupList = useMemoizedFn(() => {
        const latestGroupList: UpdateGroupListItem[] = updateGroupListRef.current.latestGroupList

        // 新
        const checkedGroup = latestGroupList.filter((item) => item.checked).map((item) => item.groupName)
        const unCheckedGroup = latestGroupList.filter((item) => !item.checked).map((item) => item.groupName)

        // 旧
        const originCheckedGroup = groupList.filter((item) => item.checked).map((item) => item.groupName)

        let saveGroup: string[] = []
        let removeGroup: string[] = []
        checkedGroup.forEach((groupName: string) => {
            saveGroup.push(groupName)
        })
        unCheckedGroup.forEach((groupName: string) => {
            if (originCheckedGroup.includes(groupName)) {
                removeGroup.push(groupName)
            }
        })
        if (!saveGroup.length && !removeGroup.length) return
        const query = getGroupPluginListQuery(scriptNameRef.current)
        apiFetchSaveYakScriptGroupLocal({
            Filter: query,
            SaveGroup: saveGroup,
            RemoveGroup: removeGroup
        }).then(() => {
            setAddGroupVisible(false)
            if (removeGroup.length) {
                yakitNotify(
                    "success",
                    `${allChecked ? response.Total : query.IncludedScriptNames?.length}个插件已从“${removeGroup.join(
                        ","
                    )}”组移除`
                )
            }
            const addGroup: string[] = checkedGroup.filter((item) => !originCheckedGroup.includes(item))
            if (addGroup.length) {
                yakitNotify(
                    "success",
                    `${allChecked ? response.Total : query.IncludedScriptNames?.length}个插件已添加至“${addGroup.join(
                        ","
                    )}”组`
                )
            }
            if (removeGroup.length || addGroup.length) {
                fetchFilterGroup()
            }
        })
    })

    // 列表头部右侧组标签
    const [groupTagShow, setGroupTagShow] = useState<boolean>(false)
    const [listDelGroupConfirm, setListDelGroupConfirm] = useState<boolean>(false)
    const listDelGroupConfirmPopRef = useRef<any>()
    const removeSingleRef = useRef<boolean>(false)
    const removeSingleGroupRef = useRef<string>("")
    const removeOutGroupContRef = useRef<string>("")
    useDebounceEffect(
        () => {
            if (selectList.length || allChecked) {
                getYakScriptGroupLocal(selectList.map((item) => item.ScriptName))
            } else {
                setGroupList([])
            }
        },
        [selectList, allChecked],
        {wait: 200}
    )
    const showGroupList = useMemo(() => {
        return groupList.filter((item) => item.checked).map((item) => item.groupName)
    }, [groupList])
    const onRemoveGroup = (group: string) => {
        removeSingleRef.current = true
        removeSingleGroupRef.current = group
        getRemoteValue(RemoteGV.PluginListGroupDelNoPrompt).then((result: string) => {
            const flag = result === "true"
            if (flag) {
                onRemoveOk()
            } else {
                removeOutGroupContRef.current = allChecked
                    ? `是否从 “${removeSingleGroupRef.current}” 组移除${response.Total}个插件？`
                    : `是否从 “${removeSingleGroupRef.current}” 组中移除插件 “${scriptNameRef.current}” ？`
                setListDelGroupConfirm(true)
            }
        })
    }
    const onRemoveAllGroup = () => {
        removeSingleRef.current = false
        getRemoteValue(RemoteGV.PluginListGroupDelNoPrompt).then((result: string) => {
            const flag = result === "true"
            if (flag) {
                onRemoveOk()
            } else {
                removeOutGroupContRef.current = allChecked
                    ? `是否从 “${showGroupList.join(",")}” 组移除${response.Total}个插件？`
                    : `是否从 “${showGroupList.join(",")}” 组中移除插件 “${scriptNameRef.current}” ？`
                setListDelGroupConfirm(true)
            }
        })
    }
    const handleRemoveGroup = async (saveGroup: string[], removeGroup: string[]) => {
        const query = getGroupPluginListQuery(scriptNameRef.current)
        await apiFetchSaveYakScriptGroupLocal({
            Filter: query,
            SaveGroup: saveGroup,
            RemoveGroup: removeGroup
        })
        if (removeGroup.length) {
            yakitNotify(
                "success",
                `${allChecked ? response.Total : query.IncludedScriptNames?.length}个插件已从“${removeGroup.join(
                    ","
                )}”组移除`
            )
            fetchFilterGroup()
        }
    }
    const onRemoveOk = useMemoizedFn(() => {
        const okFun = () => {
            setRemoteValue(
                RemoteGV.PluginListGroupDelNoPrompt,
                listDelGroupConfirmPopRef.current.delGroupConfirmNoPrompt + ""
            )
            onRemoveCancel()
        }
        if (removeSingleRef.current) {
            const saveGroup = groupList
                .filter((item) => item.checked && item.groupName !== removeSingleGroupRef.current)
                .map((item) => item.groupName)
            const removeGroup: string[] = [removeSingleGroupRef.current]
            handleRemoveGroup(saveGroup, removeGroup).then(() => {
                okFun()
            })
        } else {
            handleRemoveGroup([], showGroupList).then(() => {
                okFun()
            })
        }
    })
    const onRemoveCancel = useMemoizedFn(() => {
        removeSingleGroupRef.current = ""
        removeOutGroupContRef.current = ""
        setListDelGroupConfirm(false)
    })

    const getGroupPluginListQuery = useMemoizedFn((includedScriptNames: string[]) => {
        const page: PluginListPageMeta = {
            page: +response.Pagination.Page,
            limit: +response.Pagination.Limit || 20
        }
        const queryFilters = {...getFilters()}
        const querySearch = {...getSearch()}
        const query: QueryYakScriptRequest = {
            ...convertLocalPluginsRequestParams({
                filter: queryFilters,
                search: querySearch,
                pageParams: page
            })
        }
        query.IncludedScriptNames = includedScriptNames
        return query
    })

    /** ---------- 分组 End ---------- */

    /** ---------- 通信监听 Start ---------- */
    // 刷新列表(是否刷新高级筛选数据)
    const handleRefreshList = useDebounceFn(
        useMemoizedFn((updateFilterGroup?: boolean) => {
            if (updateFilterGroup) fetchFilterGroup(false)
            fetchList(true)
        }),
        {wait: 200}
    ).run

    const handleSwitchPrivateDomain = useMemoizedFn(() => {
        handleRefreshList()
    })

    // 触发详情列表的局部更新
    const [recalculation, setRecalculation] = useState<boolean>(false)
    // 更新本地插件信息，存在则进行局部更新，不存在则刷新列表
    const handleUpdatePluginInfo = useMemoizedFn(async (content: string) => {
        try {
            const info: KeyParamsFetchPluginDetail = JSON.parse(content)
            if (!info.name) return
            const plugin: YakScript = await grpcFetchLocalPluginDetail({Name: info.name, UUID: info.uuid || undefined})
            plugin.isLocalPlugin = privateDomain.current !== plugin.OnlineBaseUrl

            const index = response.Data.findIndex((ele) => ele.ScriptName === plugin.ScriptName || ele.Id === plugin.Id)
            if (index === -1) {
                handleRefreshList(true)
            } else {
                dispatch({
                    type: "replace",
                    payload: {
                        item: {...plugin}
                    }
                })
                if (isDetailList) {
                    setRecalculation((val) => !val)
                }
            }
        } catch (error) {}
    })

    // 详情删除本地插件触发列表的局部更新
    const handleDetailDeleteToLocal = useMemoizedFn((info: string) => {
        if (!info) return
        try {
            const plugin: {name: string; id: number} = JSON.parse(info)
            if (!plugin.name) return
            const index = selectList.findIndex((ele) => ele.ScriptName === plugin.name || ele.Id === Number(plugin.id))
            const data: YakScript = {
                ...DefaultLocalPlugin,
                Id: Number(plugin.id) || 0,
                ScriptName: plugin.name || ""
            }
            if (index !== -1) {
                optCheck(data, false)
            }
            onRefreshFilterAndTotal()
            dispatch({
                type: "remove",
                payload: {
                    itemList: [data]
                }
            })
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onSwitchPrivateDomain", handleSwitchPrivateDomain)
        emiter.on("onRefreshLocalPluginList", handleRefreshList)
        emiter.on("editorLocalSaveToLocalList", handleUpdatePluginInfo)
        emiter.on("detailDeleteLocalPlugin", handleDetailDeleteToLocal)

        return () => {
            emiter.off("onSwitchPrivateDomain", handleSwitchPrivateDomain)
            emiter.off("onRefreshLocalPluginList", handleRefreshList)
            emiter.off("editorLocalSaveToLocalList", handleUpdatePluginInfo)
            emiter.off("detailDeleteLocalPlugin", handleDetailDeleteToLocal)
        }
    }, [])
    /** ---------- 通信监听 Start ---------- */

    /** ---------- 详情列表操作 Start ---------- */
    // 进入插件详情
    const onOptClick = useMemoizedFn((info: YakScript, index: number) => {
        if (!info.ScriptName) {
            yakitNotify("error", "未获取到插件信息，请刷新列表重试")
            return
        }
        setShowIndex(index)
        onPluginDetail({type: "local", name: info.ScriptName, uuid: info.UUID || "", isCorePlugin: !!info.IsCorePlugin})
    })

    // 触发详情列表的单项定位
    const [scrollTo, setScrollTo] = useState<number>(0)
    useUpdateEffect(() => {
        if (isDetailList) {
            // setTimeout(() => {
            //     setScrollTo(showIndex.current)
            // }, 100)
        }
    }, [isDetailList])

    /** 详情列表转换插件组搜索条件 */
    const convertGroupParam = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
        const realFilters: PluginFilterParams = {
            ...filter,
            plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
        }
        return realFilters
    }

    /** 详情条件搜索 */
    const onDetailFilter = useMemoizedFn((value: PluginFilterParams) => {
        onCheck(false)
        setFilters(value)
        fetchList(true)
    })

    /** 详情列表-选中组展示 */
    const detailSelectedGroup = useMemo(() => {
        const group: YakFilterRemoteObj[] = cloneDeep(filters).plugin_group?.map((item: API.PluginsSearchData) => ({
            name: item.value,
            total: item.count
        })) as YakFilterRemoteObj[]
        return group || []
    }, [filters])

    // 详情单项副标题
    const detailOptSubTitle = useMemoizedFn((info: YakScript) => {
        if (privateDomain.current !== info.OnlineBaseUrl) return <></>
        if (info.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon className='icon-svg-16' />
        } else {
            return <SolidCloudpluginIcon className='icon-svg-16' />
        }
    })
    /** ---------- 详情列表操作 End ---------- */

    // 单项副标题
    const optSubTitle = useMemoizedFn((data: YakScript) => {
        if (data.isLocalPlugin) return null
        if (data.OnlineOfficial) {
            return <SolidYakOfficialPluginColorIcon />
        }
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon />
        } else {
            return <SolidCloudpluginIcon />
        }
    })
    // 单项操作
    const extraFooter = (info: YakScript) => {
        return (
            <LocalOptFooterExtra
                isLogin={isLogin}
                info={info}
                onEdit={handleOpenEditHint}
                uploadInfo={uploadPlugin.current}
                onUpload={onFooterExtraUpload}
                onExport={onFooterExtraExport}
                execDelInfo={singleDel}
                onDel={onFooterExtraDel}
            />
        )
    }

    return (
        <div className={styles["plugin-hub-tab-list"]}>
            <YakitSpin
                wrapperClassName={isDetailList ? styles["hidden-view"] : ""}
                spinning={loading && isInitLoading.current}
            >
                <div className={styles["outer-list"]} ref={divRef}>
                    <div className={classNames(styles["list-filter"], {[styles["hidden-view"]]: hiddenFilter})}>
                        <HubListFilter
                            groupList={filterGroup}
                            selecteds={filters as Record<string, API.PluginsSearchData[]>}
                            onSelect={setFilters}
                            groupItemExtra={(info) => {
                                if (info.groupKey === "plugin_group") {
                                    return (
                                        <>
                                            <YakitButton type='text' onClick={onOpenPluginGroup}>
                                                管理
                                            </YakitButton>
                                            <div className={styles["local-list-divider-style"]} />
                                        </>
                                    )
                                }
                                return null
                            }}
                        />
                    </div>

                    <div className={styles["list-body"]}>
                        <HubOuterList
                            title='本地插件'
                            headerExtra={
                                <div className={styles["hub-list-header-extra"]}>
                                    <FuncFilterPopover
                                        maxWidth={1200}
                                        icon={<SolidChevrondownIcon />}
                                        name='批量操作'
                                        disabled={selectedNum === 0}
                                        button={{
                                            type: "outline2",
                                            size: "large"
                                        }}
                                        menu={{
                                            type: "primary",
                                            data: [
                                                {key: "export", label: "导出"},
                                                {
                                                    key: "upload",
                                                    label: "上传",
                                                    disabled: allChecked || batchUploadLoading
                                                },
                                                {key: "remove", label: "删除", disabled: batchDelLoading}
                                            ],
                                            onClick: ({key}) => {
                                                switch (key) {
                                                    case "export":
                                                        onHeaderExtraExport()
                                                        break
                                                    case "upload":
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
                            }
                            listHeaderRightExtra={
                                <div className={styles["hub-list-header-right-extra"]}>
                                    {showGroupList.length > 0 && (
                                        <div className={styles["header-filter-tag"]}>
                                            {showGroupList.length <= 2 ? (
                                                showGroupList.map((group) => {
                                                    return (
                                                        <YakitTag
                                                            key={group}
                                                            color='info'
                                                            closable
                                                            onClose={() => onRemoveGroup(group)}
                                                        >
                                                            {group}
                                                        </YakitTag>
                                                    )
                                                })
                                            ) : (
                                                <YakitPopover
                                                    overlayClassName={styles["hub-outer-list-group-popover"]}
                                                    content={
                                                        <div className={styles["hub-outer-list-filter"]}>
                                                            {showGroupList.map((group) => {
                                                                return (
                                                                    <Tooltip
                                                                        title={group}
                                                                        placement='top'
                                                                        overlayClassName='plugins-tooltip'
                                                                        key={group}
                                                                    >
                                                                        <YakitTag
                                                                            closable
                                                                            onClose={() => onRemoveGroup(group)}
                                                                        >
                                                                            {group}
                                                                        </YakitTag>
                                                                    </Tooltip>
                                                                )
                                                            })}
                                                        </div>
                                                    }
                                                    trigger='hover'
                                                    onVisibleChange={setGroupTagShow}
                                                    placement='bottom'
                                                >
                                                    <div
                                                        className={classNames(styles["tag-total"], {
                                                            [styles["tag-total-active"]]: groupTagShow
                                                        })}
                                                    >
                                                        <span>
                                                            插件组{" "}
                                                            <span className={styles["total-style"]}>
                                                                {showGroupList.length}
                                                            </span>
                                                        </span>
                                                        <OutlineXIcon onClick={() => onRemoveAllGroup()} />
                                                    </div>
                                                </YakitPopover>
                                            )}
                                        </div>
                                    )}
                                    <YakitPopover
                                        visible={addGroupVisible}
                                        overlayClassName={styles["add-group-popover"]}
                                        placement='bottomRight'
                                        trigger='click'
                                        content={
                                            <UpdateGroupList
                                                ref={updateGroupListRef}
                                                originGroupList={groupList}
                                                onOk={updateGroupList}
                                                onCanle={() => setAddGroupVisible(false)}
                                            ></UpdateGroupList>
                                        }
                                        onVisibleChange={(visible) => {
                                            setAddGroupVisible(visible)
                                        }}
                                    >
                                        {showGroupList.length ? (
                                            <div className={styles["ui-op-btn-wrapper"]}>
                                                <div
                                                    className={classNames(styles["op-btn-body"], {
                                                        [styles["op-btn-body-hover"]]: addGroupVisible
                                                    })}
                                                >
                                                    <OutlinePluscircleIcon
                                                        className={classNames(
                                                            addGroupVisible
                                                                ? styles["icon-hover-style"]
                                                                : styles["icon-style"],
                                                            styles["plus-icon"]
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <YakitButton
                                                disabled={!selectList.length && !allChecked}
                                                type={"text"}
                                                icon={<OutlinePluscircleIcon />}
                                                style={{
                                                    color: addGroupVisible ? "var(--yakit-primary-5)" : "#31343F"
                                                }}
                                            >
                                                添加分组
                                            </YakitButton>
                                        )}
                                    </YakitPopover>
                                </div>
                            }
                            allChecked={allChecked}
                            setAllChecked={onCheck}
                            total={response.Total}
                            selected={selectedNum}
                            search={search}
                            setSearch={setSearch}
                            onSearch={onSearch}
                            filters={filters as Record<string, API.PluginsSearchData[]>}
                            setFilters={setFilters}
                        >
                            {listLength > 0 ? (
                                <HubGridList
                                    data={response.Data || []}
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
                            ) : listTotal > 0 ? (
                                <YakitEmpty
                                    image={SearchResultEmpty}
                                    imageStyle={{margin: "0 auto 24px", width: 274, height: 180}}
                                    title='搜索结果“空”'
                                    className={styles["hub-list-empty"]}
                                />
                            ) : (
                                <div className={styles["hub-list-empty"]}>
                                    <YakitEmpty
                                        title='暂无数据'
                                        description='可新建插件同步至云端，创建属于自己的插件'
                                    />
                                    <div className={styles["refresh-buttons"]}>
                                        <YakitButton type='outline1' icon={<OutlinePlusIcon />} onClick={onNewPlugin}>
                                            新建插件
                                        </YakitButton>
                                        <YakitButton type='outline1' icon={<OutlineRefreshIcon />} onClick={onRefresh}>
                                            刷新
                                        </YakitButton>
                                    </div>
                                </div>
                            )}
                        </HubOuterList>
                    </div>
                </div>
            </YakitSpin>

            {isDetailList && (
                <div className={classNames(styles["inner-list"], {[styles["hidden-view"]]: hiddenDetailList})}>
                    <HubDetailList
                        search={search}
                        setSearch={setSearch}
                        onSearch={onSearch}
                        filterNode={
                            <PluginGroup
                                pluginListQuery={getGroupPluginListQuery}
                                checkedPlugin={selectList.map((item) => item.ScriptName)}
                                allChecked={allChecked}
                                total={response.Total}
                                selectGroup={detailSelectedGroup}
                                setSelectGroup={(group) =>
                                    onDetailFilter(convertGroupParam({...getFilters()}, {group}))
                                }
                            />
                        }
                        checked={allChecked}
                        onCheck={onCheck}
                        total={listLength}
                        selected={selectedNum}
                        filterExtra={
                            <div className={styles["hub-detail-list-extra"]}>
                                <FilterPopoverBtn defaultFilter={filters} onFilter={onDetailFilter} type='local' />
                                <div className={styles["divider-style"]}></div>
                                <Tooltip title='上传插件' overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        type='text2'
                                        loading={batchUploadLoading}
                                        disabled={allChecked || selectedNum === 0}
                                        icon={<OutlineClouduploadIcon />}
                                        onClick={onHeaderExtraUpload}
                                    />
                                </Tooltip>
                                {/* <div className={styles["divider-style"]}></div>
                                <Tooltip title={selectedNum > 0 ? "删除" : "清空"} overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        type='text2'
                                        loading={batchDelLoading}
                                        disabled={listTotal === 0}
                                        icon={<OutlineTrashIcon />}
                                        onClick={onHeaderExtraDel}
                                    />
                                </Tooltip> */}
                            </div>
                        }
                        filterBodyBottomNode={
                            <div style={{marginTop: 8}}>
                                <TagsAndGroupRender
                                    wrapStyle={{marginBottom: 0}}
                                    selectGroup={detailSelectedGroup}
                                    setSelectGroup={(group) =>
                                        onDetailFilter(convertGroupParam({...getFilters()}, {group}))
                                    }
                                />
                            </div>
                        }
                        listProps={{
                            rowKey: "ScriptName",
                            numberRoll: scrollTo,
                            data: response.Data || [],
                            loadMoreData: onUpdateList,
                            classNameRow: styles["hub-detail-list-opt"],
                            recalculation: recalculation,
                            renderRow: (info, i) => {
                                const check =
                                    allChecked ||
                                    selectList.findIndex((item) => item.ScriptName === info.ScriptName) !== -1
                                return (
                                    <HubDetailListOpt
                                        order={i}
                                        plugin={info}
                                        check={check}
                                        headImg={info.HeadImg || ""}
                                        pluginName={info.ScriptName}
                                        help={info.Help || ""}
                                        content={info.Content || ""}
                                        optCheck={optCheck}
                                        official={!!info.OnlineOfficial}
                                        isCorePlugin={!!info.IsCorePlugin}
                                        pluginType={info.Type}
                                        onPluginClick={onOptClick}
                                        extra={detailOptSubTitle}
                                    />
                                )
                            },
                            page: response.Pagination.Page,
                            hasMore: hasMore.current,
                            loading: loading,
                            defItemHeight: 46,
                            isRef: loading && isInitLoading.current
                        }}
                        spinLoading={loading && isInitLoading.current}
                    />
                </div>
            )}

            <NoPromptHint
                visible={delHint}
                title='是否要删除插件'
                content={PluginOperateHint["delLocal"]}
                cacheKey={RemotePluginGV.LocalPluginRemoveCheck}
                onCallback={delHintCallback}
            />

            <PluginLocalExport
                visible={exportModal}
                getContainer={document.getElementById(rootElementId || "") || document.body}
                exportLocalParams={exportParams.current}
                onClose={closeExportModal}
            />

            {editPlugin.current && (
                <ModifyYakitPlugin
                    getContainer={document.getElementById(rootElementId || "") || document.body}
                    plugin={editPlugin.current}
                    visible={editHint}
                    onCallback={handleEditHintCallback}
                />
            )}
            <PluginGroupDrawer
                groupType='local'
                visible={pluginGroupMagDrawer}
                onClose={onPluginGroupMagDrawerClose}
            ></PluginGroupDrawer>
            <ListDelGroupConfirmPop
                ref={listDelGroupConfirmPopRef}
                visible={listDelGroupConfirm}
                content={removeOutGroupContRef.current}
                onCancel={onRemoveCancel}
                onOk={onRemoveOk}
            ></ListDelGroupConfirmPop>

            {/* 单个插件上传 */}
            <PluginUploadModal
                isLogin={isLogin}
                info={uploadPlugin.current}
                visible={uploadHint}
                callback={uploadHintCallback}
            />
        </div>
    )
})
