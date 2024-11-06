import React, {memo, useEffect, useMemo, useReducer, useRef, useState} from "react"
import {PluginsContainer, PluginsLayout, statusTag} from "../baseTemplate"
import {
    AuthorImg,
    FuncBtn,
    FuncFilterPopover,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    PluginsList,
    TypeSelect
} from "../funcTemplate"
import {TypeSelectOpt} from "../funcTemplateType"
import {
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineDotshorizontalIcon,
    OutlinePencilaltIcon,
    OutlinePluscircleIcon,
    OutlineRefreshIcon,
    OutlineSaveIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useInViewport,
    useLatest,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form, Tooltip} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {BackInfoProps, DetailRefProps, PluginManageDetail} from "./PluginManageDetail"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {yakitNotify} from "@/utils/notification"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {
    DownloadOnlinePluginsRequest,
    PluginsQueryProps,
    apiDeletePluginCheck,
    apiDownloadPluginCheck,
    apiFetchCheckList,
    apiFetchGetYakScriptGroupOnline,
    apiFetchGroupStatisticsCheck,
    apiFetchResetPlugins,
    apiFetchSaveYakScriptGroupOnline,
    convertDownloadOnlinePluginBatchRequestParams,
    convertPluginsRequestParams,
    excludeNoExistfilter
} from "../utils"
import {isEnpriTraceAgent} from "@/utils/envfile"
import {NetWorkApi} from "@/services/fetch"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {DefaultStatusList, defaultSearch} from "../builtInData"
import {useStore} from "@/store"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginGroupList} from "../local/PluginsLocalType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {PluginGroupDrawer} from "@/pages/pluginHub/group/PluginGroupDrawer"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {UpdateGroupList, UpdateGroupListItem} from "@/pages/pluginHub/group/UpdateGroupList"
import classNames from "classnames"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import Dragger from "antd/lib/upload/Dragger"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import {RcFile} from "antd/lib/upload"
import {RemoteGV} from "@/yakitGV"
import {ListDelGroupConfirmPop} from "@/pages/pluginHub/group/PluginOperationGroupList"
import {RemotePluginGV} from "@/enums/plugin"
import {NoPromptHint} from "@/pages/pluginHub/utilsUI/UtilsTemplate"
import {grpcDownloadOnlinePlugin, grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import emiter from "@/utils/eventBus/eventBus"
import useAdmin from "@/hook/useAdmin"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"

const {ipcRenderer} = window.require("electron")
interface PluginManageProps {}

export const PluginManage: React.FC<PluginManageProps> = (props) => {
    // 判断该页面-用户是否可见状态
    const layoutRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(layoutRef)

    // 初始时，数据是否为空，为空展示空数据时的UI
    const [initTotal, setInitTotal] = useState<number>(0)
    const getInitTotal = useMemoizedFn(() => {
        apiFetchCheckList({page: 1, limit: 50}).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })
    // 由不可见变为可见时，刷新总数统计和筛选条件数据
    useUpdateEffect(() => {
        getInitTotal()
        onInit(true)
    }, [inViewPort])

    // 用户信息
    const {userInfo} = useStore()
    const admin = useAdmin()

    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useGetState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    /** 是否为首屏加载 */
    const isLoadingRef = useRef<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)
    // 获取筛选栏展示状态
    useEffect(() => {
        getRemoteValue(RemotePluginGV.AuditFilterCloseStatus).then((value: string) => {
            if (value === "true") setShowFilter(true)
            if (value === "false") setShowFilter(false)
        })
    }, [])
    const onSetShowFilter = useMemoizedFn((v) => {
        setRemoteValue(RemotePluginGV.AuditFilterCloseStatus, `${v}`)
        setShowFilter(v)
    })

    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: [],
        status: [],
        tags: [],
        plugin_group: []
    })
    /** 首页顶部的审核状态组件选中情况 */
    const pluginStatusSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.status?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.status])
    const [searchs, setSearchs] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [hasMore, setHasMore] = useState<boolean>(true)

    // 获取插件列表数据
    const fetchList = useDebounceFn(
        useMemoizedFn((reset?: boolean) => {
            // 从详情页返回不进行搜索
            if (isDetailBack.current) {
                isDetailBack.current = false
                return
            }

            if (latestLoadingRef.current) return
            if (reset) {
                isLoadingRef.current = true
                onCheck(false)
                setShowPluginIndex(0)
            }

            setLoading(true)
            const params: PluginListPageMeta = !!reset
                ? {page: 1, limit: 20}
                : {
                      page: response.pagemeta.page + 1,
                      limit: response.pagemeta.limit || 20
                  }
            // api接口请求参数
            const query: PluginsQueryProps = {...convertPluginsRequestParams({...filters}, searchs, params)}

            apiFetchCheckList(query)
                .then((res) => {
                    if (!res.data) res.data = []
                    dispatch({
                        type: "add",
                        payload: {
                            response: {...res}
                        }
                    })

                    const dataLength = +res.pagemeta.page === 1 ? res.data : response.data.concat(res.data)
                    const isMore = res.data.length < res.pagemeta.limit || dataLength.length >= res.pagemeta.total
                    setHasMore(!isMore)

                    isLoadingRef.current = false
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                })
        }),
        {wait: 300}
    ).run

    const [pluginFilters, setPluginFilters] = useState<PluginGroupList[]>([])
    // 获取所有过滤条件统计数据
    const fetchPluginFilters = useMemoizedFn(() => {
        apiFetchGroupStatisticsCheck({}, false).then((res: any) => {
            res.data.forEach((item) => {
                item.data = item.data || []
                if (item.groupKey === "plugin_group") {
                    item.groupExtraOptBtn = undefined
                }
            })
            const latestGroup = res.data.find((item) => item.groupKey === "plugin_group")?.data || []
            const oldGroup = pluginFilters.find((item) => item.groupKey === "plugin_group")?.data || []
            const {realFilter, updateFilterFlag} = excludeNoExistfilter(filters, res.data)
            if (updateFilterFlag) {
                setFilters(realFilter)
            } else {
                if (JSON.stringify(latestGroup) != JSON.stringify(oldGroup)) {
                    fetchList(true)
                }
            }
            setPluginFilters(res.data)
        })
    })

    /**
     * @name 数据初始化
     * @param noRefresh 初始化时不刷新列表数据
     */
    const onInit = useMemoizedFn((noRefresh?: boolean) => {
        fetchPluginFilters()
        if (!noRefresh) fetchList(true)
    })

    // 页面初始化的首次列表请求
    useEffect(() => {
        getInitTotal()
        onInit()
    }, [])
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })

    // 关键词|作者搜索
    const onKeywordAndUser = useMemoizedFn((value: PluginSearchParams) => {
        fetchList(true)
    })

    // 过滤条件搜索
    useUpdateEffect(() => {
        fetchList(true)
    }, [filters])
    const onFilter = useMemoizedFn((value: Record<string, API.PluginsSearchData[]>) => {
        setFilters({...value})
    })
    const onSetActive = useMemoizedFn((status: TypeSelectOpt[]) => {
        const newStatus: API.PluginsSearchData[] = status.map((ele) => ({
            value: ele.key,
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, status: newStatus})
    })

    // ----- 选中插件 -----
    const [allCheck, setAllcheck] = useState<boolean>(false)
    const [selectList, setSelectList, getSelectList] = useGetState<YakitPluginOnlineDetail[]>([])
    // 选中插件的uuid集合
    const selectUUIDs = useMemo(() => {
        return getSelectList().map((item) => item.uuid)
    }, [selectList])
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])
    // 全选|取消全选
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllcheck(value)
    })

    // 清空选中并刷新列表
    const onClearSelecteds = useMemoizedFn(() => {
        if (allCheck) setAllcheck(false)
        setSelectList([])
        onInit()
    })

    /** 批量修改插件作者 */
    const [showModifyAuthor, setShowModifyAuthor] = useState<boolean>(false)
    const onShowModifyAuthor = useMemoizedFn(() => {
        setShowModifyAuthor(true)
    })
    const onModifyAuthor = useMemoizedFn(() => {
        setShowModifyAuthor(false)
        onCheck(false)
        fetchList(true)
    })

    /** 批量删除插件 */
    // 原因窗口(删除|不通过)
    const [showReason, setShowReason] = useState<{visible: boolean; type: "nopass" | "del"}>({
        visible: false,
        type: "nopass"
    })
    // 单项插件删除
    const activeDelPlugin = useRef<YakitPluginOnlineDetail>()
    const onShowDelPlugin = useMemoizedFn(() => {
        setShowReason({visible: true, type: "del"})
    })
    const onCancelReason = useMemoizedFn(() => {
        activeDelPlugin.current = undefined
        activeDetailData.current = undefined
        setShowReason({visible: false, type: "nopass"})
    })
    // 删除插件集合接口
    const apiDelPlugins = useMemoizedFn(
        (params?: API.PluginsWhereDeleteRequest, thenCallback?: () => any, catchCallback?: () => any) => {
            apiDeletePluginCheck(params)
                .then(() => {
                    if (thenCallback) thenCallback()
                })
                .catch((e) => {
                    if (detailRef && detailRef.current) {
                        detailRef.current.onDelCallback([], false)
                    }
                    if (catchCallback) catchCallback()
                })
        }
    )
    // 删除插件(首页批量|清空|单个|详情内删除共用一个方法)
    const onReasonCallback = useMemoizedFn((reason: string) => {
        const type = showReason.type

        // 是否全选
        let delAllCheck: boolean = allCheck
        // 选中插件数量
        let selectTotal: number = selectNum
        // 选中插件UUID
        let selectUuids: string[] = [...selectUUIDs]
        // 搜索内容
        let delSearch: PluginSearchParams = {...searchs}
        // 搜索筛选条件
        let delFilter: PluginFilterParams = {...filters}

        // 如果是从详情页过来的回调事件
        if (activeDetailData.current) {
            delAllCheck = activeDetailData.current.allCheck
            selectTotal = activeDetailData.current.allCheck
                ? response.pagemeta.total
                : activeDetailData.current.selectList.length
            selectUuids = activeDetailData.current.selectList.map((item) => item.uuid)
            delSearch = {...activeDetailData.current.search}
            delFilter = {...activeDetailData.current.filter}
        }

        // 获取单个删除插件的信息
        const onlyPlugin: YakitPluginOnlineDetail | undefined = activeDelPlugin.current
        onCancelReason()

        // 删除插件逻辑
        if (type === "del") {
            // 清空操作(无视搜索条件)
            if (selectTotal === 0 && !onlyPlugin) {
                apiDelPlugins({description: reason}, () => {
                    setSearchs({...delSearch})
                    setFilters({...delFilter})
                    onClearSelecteds()
                    if (!!plugin) setPlugin(undefined)
                })
            }
            // 单个删除
            else if (!!onlyPlugin) {
                let delRequest: API.PluginsWhereDeleteRequest = {uuid: [onlyPlugin.uuid]}
                apiDelPlugins({...delRequest, description: reason}, () => {
                    // 当前

                    const next: YakitPluginOnlineDetail = response.data[showPluginIndex.current + 1]
                    dispatch({
                        type: "remove",
                        payload: {
                            itemList: [onlyPlugin]
                        }
                    })

                    if (!!plugin) {
                        // 将删除结果回传到详情页
                        if (detailRef && detailRef.current) {
                            detailRef.current.onDelCallback([onlyPlugin], true)
                        }
                        setPlugin({...next})
                    } else {
                        // 首页的单独删除
                        const index = selectUUIDs.findIndex((item) => item === onlyPlugin?.uuid)
                        if (index > -1) {
                            optCheck(onlyPlugin, false)
                        }
                    }
                    onInit(true)
                })
            }
            // 批量删除
            // 详情的批量删除成功后自动返回首页
            else if (!activeDelPlugin.current) {
                let delRequest: API.PluginsWhereDeleteRequest = {}
                if (delAllCheck) {
                    delRequest = {...convertPluginsRequestParams(delFilter, delSearch), description: reason}
                } else {
                    delRequest = {uuid: selectUuids, description: reason}
                }
                apiDelPlugins(delRequest, () => {
                    setSearchs({...delSearch})
                    setFilters({...delFilter})
                    onClearSelecteds()
                    // 以前详情页的逻辑
                    if (!!plugin) setPlugin(undefined)
                })
            }
        }
    })

    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(false)

    // 当前展示的插件序列
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail | undefined>()

    // 单项组件-相关操作和展示组件逻辑
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
            setAllcheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...getSelectList(), data])
        else setSelectList(getSelectList().filter((item) => item.uuid !== data.uuid))
    })
    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return statusTag[`${data.status}`]
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return (
            <FuncFilterPopover
                icon={<OutlineDotshorizontalIcon />}
                menu={{
                    data: admin.isAdmin
                        ? [
                              {
                                  key: "download",
                                  label: "下载",
                                  itemIcon: <OutlineClouddownloadIcon />
                              },
                              {type: "divider"},
                              {
                                  key: "del",
                                  label: "删除",
                                  type: "danger",
                                  itemIcon: <OutlineTrashIcon />
                              }
                          ]
                        : [
                              {
                                  key: "download",
                                  label: "下载",
                                  itemIcon: <OutlineClouddownloadIcon />
                              }
                          ],
                    className: styles["func-filter-dropdown-menu"],
                    onClick: ({key}) => {
                        switch (key) {
                            case "del":
                                activeDelPlugin.current = data
                                setShowReason({visible: true, type: "del"})
                                return
                            case "download":
                                onFooterExtraDownload(data)
                                return
                            default:
                                return
                        }
                    }
                }}
                button={{
                    type: "text2"
                }}
                placement='bottomRight'
            />
        )
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setPlugin({...data})
        setShowPluginIndex(index)
    })

    // 详情页-相关回调逻辑
    const detailRef = useRef<DetailRefProps>(null)
    // 是否从详情页返回的
    const isDetailBack = useRef<boolean>(false)
    /** 返回事件 */
    const onBack = useMemoizedFn((data: BackInfoProps) => {
        isDetailBack.current = true
        setPlugin(undefined)
        setAllcheck(data.allCheck)
        setSelectList(data.selectList)
        setSearchs(data.search)
        setFilters(data.filter)
        fetchPluginFilters()
    })
    /** 搜索事件 */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        setSearchs({...detailSearch})
        // 延时是防止同时赋值后的搜索拿不到最新的搜索条件数据
        setTimeout(() => {
            setFilters({...detailFilter})
        }, 100)
    })
    /** 删除插件事件 */
    const activeDetailData = useRef<BackInfoProps>()
    const onDetailDel = useMemoizedFn((detail: YakitPluginOnlineDetail | undefined, data: BackInfoProps) => {
        activeDelPlugin.current = detail
        activeDetailData.current = {...data}
        onShowDelPlugin()
    })
    /**初始数据为空的时候,刷新按钮,刷新列表和初始total,以及分组数据 */
    const onRefListAndTotalAndGroup = useMemoizedFn(() => {
        getInitTotal()
        fetchList(true)
        fetchPluginFilters()
    })
    // 一键重置
    const [resetLoading, setResetLoading] = useState<boolean>(false)
    const onResetAll = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "请先登录")
            return
        }
        if (!admin.ee) {
            yakitNotify("error", "暂无权限")
            return
        }

        setResetLoading(true)
        apiFetchResetPlugins()
            .then((res) => {
                if (res.ok) {
                    yakitNotify("success", "一键重置成功")
                    onRefListAndTotalAndGroup()
                    setResetLoading(false)
                }
            })
            .catch((err) => {
                yakitNotify("error", err)
                setResetLoading(false)
            })
    })

    /** ---------- 分组 Start ---------- */
    const [pluginGroupMagDrawer, setPluginGroupMagDrawer] = useState<boolean>(false)
    const [importGroupVisible, setImportGroupVisible] = useState<boolean>(false)
    // 管理分组展示状态
    const magGroupState = useMemoizedFn(() => {
        if (admin.isAdmin) {
            return true
        }
        return false
    })

    const onOpenPluginGroup = useMemoizedFn((e) => {
        e.stopPropagation()
        setPluginGroupMagDrawer(true)
    })
    const onPluginGroupMagDrawerClose = useMemoizedFn((changeGroupListFlag: boolean) => {
        setPluginGroupMagDrawer(false)
        if (changeGroupListFlag) {
            fetchPluginFilters()
        }
    })

    // 线上获取插件所在插件组和其他插件组
    const pluginUuidRef = useRef<string[]>([])
    const updateGroupListRef = useRef<any>()
    const [addGroupVisible, setAddGroupVisible] = useState<boolean>(false)
    const [groupList, setGroupList] = useState<UpdateGroupListItem[]>([]) // 组数据
    const getYakScriptGroupOnline = (uuid: string[]) => {
        pluginUuidRef.current = uuid
        const params: PluginListPageMeta = {
            page: +response.pagemeta.page,
            limit: +response.pagemeta.limit || 20
        }
        const query: PluginsQueryProps = {...convertPluginsRequestParams({...filters}, searchs, params)}
        apiFetchGetYakScriptGroupOnline({...query, uuid}).then((res) => {
            const copySetGroup = Array.isArray(res.setGroup) ? [...res.setGroup] : []
            const newSetGroup = copySetGroup.map((name) => ({
                groupName: name,
                checked: true
            }))
            let copyAllGroup = Array.isArray(res.allGroup) ? [...res.allGroup] : []
            // 便携版 如果没有基础扫描 塞基础扫描
            if (isEnpriTraceAgent()) {
                const index = copySetGroup.findIndex((name) => name === "基础扫描")
                const index2 = copyAllGroup.findIndex((name) => name === "基础扫描")

                if (index === -1 && index2 === -1) {
                    copyAllGroup = [...copyAllGroup, "基础扫描"]
                }
            }
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
        const pageParams: PluginListPageMeta = {
            page: +response.pagemeta.page,
            limit: +response.pagemeta.limit || 20
        }
        const query: PluginsQueryProps = {...convertPluginsRequestParams({...filters}, searchs, pageParams)}
        const params: API.GroupRequest = {
            ...query,
            uuid: pluginUuidRef.current,
            saveGroup,
            removeGroup
        }
        apiFetchSaveYakScriptGroupOnline(params).then(() => {
            setAddGroupVisible(false)
            if (removeGroup.length) {
                yakitNotify(
                    "success",
                    `${allCheck ? response.pagemeta.total : params.uuid.length}个插件已从“${removeGroup.join(
                        ","
                    )}”组移除`
                )
            }
            const addGroup: string[] = checkedGroup.filter((item) => !originCheckedGroup.includes(item))
            if (addGroup.length) {
                yakitNotify("success", `${params.uuid.length}个插件已添加至“${addGroup.join(",")}”组`)
            }
            if (removeGroup.length || addGroup.length) {
                fetchPluginFilters()
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
            if (selectList.length || allCheck) {
                if (magGroupState()) {
                    getYakScriptGroupOnline(selectList.map((item) => item.uuid))
                }
            } else {
                setGroupList([])
            }
        },
        [selectList, allCheck],
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
                removeOutGroupContRef.current = allCheck
                    ? `是否从 “${removeSingleGroupRef.current}” 组移除${response.pagemeta.total}个插件？`
                    : `是否从 “${removeSingleGroupRef.current}” 组中移除插件 “${selectList[0].script_name}” ？`
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
                removeOutGroupContRef.current = allCheck
                    ? `是否从 “${showGroupList.join(",")}” 组移除${response.pagemeta.total}个插件？`
                    : `是否从 “${showGroupList.join(",")}” 组中移除插件 “${selectList
                          .map((item) => item.script_name)
                          .join(",")}” ？`
                setListDelGroupConfirm(true)
            }
        })
    }
    const handleRemoveGroup = async (saveGroup: string[], removeGroup: string[]) => {
        const pageParams: PluginListPageMeta = {
            page: +response.pagemeta.page,
            limit: +response.pagemeta.limit || 20
        }
        const query: PluginsQueryProps = {...convertPluginsRequestParams({...filters}, searchs, pageParams)}
        const params: API.GroupRequest = {
            ...query,
            uuid: pluginUuidRef.current,
            saveGroup,
            removeGroup
        }
        await apiFetchSaveYakScriptGroupOnline(params)
        if (removeGroup.length) {
            yakitNotify(
                "success",
                `${allCheck ? response.pagemeta.total : params.uuid.length}个插件已从“${removeGroup.join(",")}”组移除`
            )
            fetchPluginFilters()
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

    /** ---------- 分组 End ---------- */

    /** ---------- 下载插件 Start ---------- */
    useEffect(() => {
        // 批量下载的同名覆盖二次确认框缓存
        getRemoteValue(RemotePluginGV.BatchDownloadPluginSameNameOverlay)
            .then((res) => {
                batchSameNameCache.current = res === "true"
            })
            .catch((err) => {})
        // 单个下载的同名覆盖二次确认框缓存
        getRemoteValue(RemotePluginGV.SingleDownloadPluginSameNameOverlay)
            .then((res) => {
                singleSameNameCache.current = res === "true"
            })
            .catch((err) => {})
    }, [])

    const batchDownloadRequest = useRef<BackInfoProps>()
    const setBatchDownloadRequest = useMemoizedFn((request?: BackInfoProps) => {
        batchDownloadRequest.current = request || undefined
    })
    const headerExtraDownload = useMemoizedFn((newRequest?: BackInfoProps) => {
        if (!batchSameNameCache.current) {
            setBatchDownloadRequest()
            if (batchSameNameHint) return
            setBatchSameNameHint(true)
            setBatchDownloadRequest(newRequest)
            return
        }
        setBatchDownloadRequest(newRequest)
        handleBatchDownloadPlugin()
    })

    // 批量下载同名覆盖提示
    const batchSameNameCache = useRef<boolean>(false)
    const [batchSameNameHint, setBatchSameNameHint] = useState<boolean>(false)
    const handleBatchSameNameHint = useMemoizedFn((isOK: boolean, cache: boolean) => {
        if (isOK) {
            batchSameNameCache.current = cache
            handleBatchDownloadPlugin()
        }
        setBatchSameNameHint(false)
    })

    // 全部下载
    const [allDownloadHint, setAllDownloadHint] = useState<boolean>(false)
    const handleAllDownload = useMemoizedFn(() => {
        if (allDownloadHint) return
        setAllDownloadHint(true)
    })
    // 批量下载
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    const handleBatchDownloadPlugin = useMemoizedFn(() => {
        let allChecks: boolean = allCheck
        let selectedTotal: number = selectNum
        let selectedUUIDs: string[] = [...selectUUIDs]
        let downloadSearch: PluginSearchParams = {...searchs}
        let downloadFilter: PluginFilterParams = {...filters}

        if (batchDownloadRequest.current) {
            const {
                allCheck: detailAllCheck,
                selectList: detailSelectList,
                search: detailSearch,
                filter: detailFilter
            } = batchDownloadRequest.current
            allChecks = detailAllCheck
            selectedTotal = detailAllCheck ? response.pagemeta.total : detailSelectList.length
            selectedUUIDs = detailSelectList.map((item) => item.uuid)
            downloadSearch = {...detailSearch}
            downloadFilter = {...detailFilter}
        }

        setBatchDownloadRequest()
        if (selectedTotal === 0) {
            handleAllDownload()
        } else {
            let downloadRequest: DownloadOnlinePluginsRequest = {}
            if (allChecks) {
                downloadRequest = {...convertDownloadOnlinePluginBatchRequestParams(downloadFilter, downloadSearch)}
            } else {
                downloadRequest = {
                    UUID: selectedUUIDs
                }
            }
            if (downloadLoading) return
            setDownloadLoading(true)
            apiDownloadPluginCheck(downloadRequest)
                .then(() => {
                    onCheck(false)
                    yakitNotify("success", "批量下载成功")
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        setDownloadLoading(false)
                    }, 200)
                })
        }
    })

    // 单个下载同名覆盖提示
    const singleSameNameCache = useRef<boolean>(false)
    const [singleSameNameHint, setSingleSameNameHint] = useState<boolean>(false)
    const handleSingleSameNameHint = useMemoizedFn((isOK: boolean, cache: boolean) => {
        if (isOK) {
            singleSameNameCache.current = cache
            const data = singleDownload[singleDownload.length - 1]
            if (data) handleSingleDownload(data)
        } else {
            setSingleDownload((arr) => arr.slice(0, arr.length - 1))
        }
        setSingleSameNameHint(false)
    })
    // 单个下载的插件信息队列
    const [singleDownload, setSingleDownload] = useState<YakitPluginOnlineDetail[]>([])
    const onFooterExtraDownload = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        const findIndex = singleDownload.findIndex((item) => item.uuid === info.uuid)
        if (findIndex > -1) {
            yakitNotify("error", "该插件正在执行下载操作,请稍后再试")
            return
        }
        setSingleDownload((arr) => {
            arr.push(info)
            return [...arr]
        })

        grpcFetchLocalPluginDetail({Name: info.script_name, UUID: info.uuid}, true)
            .then((res) => {
                const {ScriptName, UUID} = res
                if (ScriptName === info.script_name && UUID !== info.uuid) {
                    if (!singleSameNameCache.current) {
                        if (singleSameNameHint) return
                        setSingleSameNameHint(true)
                        return
                    }
                }
                handleSingleDownload(info)
            })
            .catch((err) => {
                handleSingleDownload(info)
            })
    })
    // 单个插件下载
    const handleSingleDownload = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        grpcDownloadOnlinePlugin({uuid: info.uuid})
            .then((res) => {
                emiter.emit(
                    "editorLocalSaveToLocalList",
                    JSON.stringify({
                        id: Number(res.Id) || 0,
                        name: res.ScriptName,
                        uuid: res.UUID || ""
                    })
                )
                yakitNotify("success", "下载成功")
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSingleDownload((arr) => arr.filter((item) => item.uuid !== info.uuid))
                }, 50)
            })
    })
    /** ---------- 下载插件 End ---------- */

    return (
        <div ref={layoutRef} className={styles["plugin-manage-layout"]}>
            {!!plugin && (
                <PluginManageDetail
                    ref={detailRef}
                    spinLoading={isLoadingRef.current && loading}
                    listLoading={loading}
                    response={response}
                    dispatch={dispatch}
                    info={plugin}
                    defaultAllCheck={allCheck}
                    defaultSelectList={selectList}
                    defaultSearch={searchs}
                    defaultFilter={filters}
                    downloadLoading={downloadLoading}
                    onBatchDownload={headerExtraDownload}
                    onPluginDel={onDetailDel}
                    currentIndex={showPluginIndex.current}
                    setCurrentIndex={setShowPluginIndex}
                    onBack={onBack}
                    loadMoreData={onUpdateList}
                    onDetailSearch={onDetailSearch}
                />
            )}
            <PluginsLayout
                title='插件管理'
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginStatusSelect} list={DefaultStatusList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <FuncSearch maxWidth={1000} value={searchs} onSearch={onKeywordAndUser} onChange={setSearchs} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            {admin.isAdmin && (
                                <FuncBtn
                                    maxWidth={1150}
                                    icon={<OutlinePencilaltIcon />}
                                    disabled={selectNum === 0 && !allCheck}
                                    type='outline2'
                                    size='large'
                                    name={"修改作者"}
                                    onClick={onShowModifyAuthor}
                                />
                            )}
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                loading={downloadLoading}
                                name={selectNum > 0 ? "下载" : "一键下载"}
                                onClick={() => headerExtraDownload()}
                                disabled={initTotal === 0}
                            />
                            {admin.isAdmin && (
                                <FuncBtn
                                    maxWidth={1150}
                                    icon={<OutlineSaveIcon />}
                                    type='outline2'
                                    size='large'
                                    name='导入分组'
                                    onClick={() => setImportGroupVisible(true)}
                                />
                            )}
                            {admin.ee && (
                                <FuncBtn
                                    maxWidth={1150}
                                    icon={<OutlineClouduploadIcon />}
                                    type='outline2'
                                    size='large'
                                    loading={resetLoading}
                                    name={"一键重置"}
                                    onClick={() => {
                                        let m = showYakitModal({
                                            title: "一键重置",
                                            centered: true,
                                            width: 400,
                                            closable: true,
                                            maskClosable: false,
                                            footer: (
                                                <div style={{textAlign: "right", width: "100%", margin: "0 15px 15px"}}>
                                                    <YakitButton
                                                        type='outline1'
                                                        style={{marginRight: 15}}
                                                        onClick={() => {
                                                            m.destroy()
                                                        }}
                                                    >
                                                        取消
                                                    </YakitButton>
                                                    <YakitButton
                                                        onClick={() => {
                                                            onResetAll()
                                                            m.destroy()
                                                        }}
                                                    >
                                                        确定
                                                    </YakitButton>
                                                </div>
                                            ),
                                            content: (
                                                <div style={{padding: 15}}>
                                                    一键重置会清空线上所有数据，再从服务器内置库中重新内置插件数据，是否确认重置
                                                </div>
                                            ),
                                            onCancel: () => {
                                                m.destroy()
                                            }
                                        })
                                    }}
                                />
                            )}
                            {admin.isAdmin && (
                                <FuncBtn
                                    maxWidth={1150}
                                    icon={<OutlineTrashIcon />}
                                    type='outline2'
                                    size='large'
                                    name={selectNum > 0 ? "删除" : "清空"}
                                    onClick={onShowDelPlugin}
                                    disabled={initTotal === 0}
                                />
                            )}
                        </div>
                    </div>
                }
            >
                <PluginsContainer
                    loading={loading && isLoadingRef.current}
                    visible={showFilter}
                    setVisible={onSetShowFilter}
                    selecteds={filters as Record<string, API.PluginsSearchData[]>}
                    onSelect={onFilter}
                    groupList={pluginFilters.map((item) => {
                        if (item.groupKey === "plugin_group") {
                            item.groupExtraOptBtn = magGroupState() ? (
                                <>
                                    <YakitButton type='text' onClick={onOpenPluginGroup}>
                                        管理
                                    </YakitButton>
                                    <div className={styles["divider-style"]} />
                                </>
                            ) : (
                                <></>
                            )
                        }
                        return item
                    })}
                >
                    <PluginsList
                        checked={allCheck}
                        onCheck={onCheck}
                        isList={isList}
                        setIsList={setIsList}
                        total={response.pagemeta.total}
                        selected={selectNum}
                        filters={filters}
                        setFilters={setFilters}
                        visible={showFilter}
                        setVisible={onSetShowFilter}
                        extraHeader={
                            <div className={styles["hub-list-header-right-extra"]}>
                                {magGroupState() ? (
                                    <>
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
                                                    disabled={!selectList.length && !allCheck}
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
                                    </>
                                ) : (
                                    <></>
                                )}
                            </div>
                        }
                    >
                        {initTotal > 0 ? (
                            <ListShowContainer<YakitPluginOnlineDetail>
                                id='pluginManage'
                                isList={isList}
                                data={response.data}
                                gridNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectUUIDs.includes(data.uuid)
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
                                            official={data.official}
                                            subTitle={optSubTitle}
                                            extraFooter={optExtraNode}
                                            onClick={optClick}
                                        />
                                    )
                                }}
                                gridHeight={226}
                                listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                    const {index, data} = info
                                    const check = allCheck || selectUUIDs.includes(data.uuid)
                                    return (
                                        <ListLayoutOpt
                                            order={index}
                                            data={data}
                                            checked={check}
                                            onCheck={optCheck}
                                            img={data.head_img}
                                            title={info.index + data.script_name}
                                            help={data.help || ""}
                                            time={data.updated_at}
                                            type={""}
                                            isCorePlugin={!!data.isCorePlugin}
                                            official={data.official}
                                            subTitle={optSubTitle}
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
                            <div className={styles["plugin-manage-empty"]}>
                                <YakitEmpty title='暂无数据' />

                                <div className={styles["plugin-manage-buttons"]}>
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
                </PluginsContainer>
            </PluginsLayout>
            <ModifyAuthorModal
                visible={showModifyAuthor}
                setVisible={setShowModifyAuthor}
                plugins={selectUUIDs}
                onOK={onModifyAuthor}
            />
            <ReasonModal
                visible={showReason.visible}
                setVisible={onCancelReason}
                type={showReason.type}
                total={!!activeDelPlugin.current ? 1 : selectNum || response.pagemeta.total}
                onOK={onReasonCallback}
            />
            <PluginGroupDrawer
                groupType='online'
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
            {importGroupVisible && (
                <YakitModal
                    title='导入分组'
                    closable={true}
                    visible={importGroupVisible}
                    maskClosable={false}
                    centered
                    onCancel={() => setImportGroupVisible(false)}
                    footer={null}
                >
                    <UploadGroupModal importSuccess={fetchPluginFilters} onClose={() => setImportGroupVisible(false)} />
                </YakitModal>
            )}

            {/* 一键下载 */}
            {allDownloadHint && (
                <YakitGetOnlinePlugin
                    listType='check'
                    visible={allDownloadHint}
                    setVisible={(v) => setAllDownloadHint(v)}
                />
            )}
            {/* 批量下载同名覆盖提示 */}
            <NoPromptHint
                visible={batchSameNameHint}
                title='同名覆盖提示'
                content='如果本地存在同名插件会直接进行覆盖'
                cacheKey={RemotePluginGV.BatchDownloadPluginSameNameOverlay}
                onCallback={handleBatchSameNameHint}
            />
            {/* 单个下载同名覆盖提示 */}
            <NoPromptHint
                visible={singleSameNameHint}
                title='同名覆盖提示'
                content='本地有插件同名，下载将会覆盖，是否下载'
                cacheKey={RemotePluginGV.SingleDownloadPluginSameNameOverlay}
                onCallback={handleSingleSameNameHint}
            />
        </div>
    )
}

interface ModifyAuthorModalProps {
    visible: boolean
    setVisible: (show: boolean) => any
    plugins: string[]
    onOK: () => any
}
/** @name 批量修改插件作者 */
const ModifyAuthorModal: React.FC<ModifyAuthorModalProps> = memo((props) => {
    const {visible, setVisible, plugins, onOK} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [list, setList] = useState<API.UserList[]>([])
    const [value, setValue] = useState<number>()
    const onsearch = useDebounceFn(
        (value?: string) => {
            if (!value) {
                setList([])
                return
            }
            if (loading) return

            setLoading(true)
            NetWorkApi<{keywords: string}, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {keywords: value}
            })
                .then((res) => {
                    setList(res?.data || [])
                })
                .catch((err) => {
                    yakitNotify("error", "获取普通用户失败：" + err)
                })
                .finally(() => {
                    setTimeout(() => setLoading(false), 200)
                })
        },
        {
            wait: 500
        }
    ).run

    const [submitLoading, setSubmitLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<"" | "error">("")
    const submit = useMemoizedFn(() => {
        if (!value) {
            setStatus("error")
            return
        }

        setSubmitLoading(true)
        NetWorkApi<API.UpPluginsUserRequest, API.ActionSucceeded>({
            method: "post",
            url: "up/plugins/user",
            data: {uuid: plugins, user_id: +value || 0}
        })
            .then((res) => {
                onOK()
            })
            .catch((err) => {
                yakitNotify("error", "批量修改失败，原因:" + err)
            })
            .finally(() => {
                setTimeout(() => setSubmitLoading(false), 200)
            })
    })
    const cancel = useMemoizedFn(() => {
        if (submitLoading) return
        setVisible(false)
    })

    useEffect(() => {
        if (!visible) {
            setList([])
            setValue(undefined)
            setStatus("")
            setSubmitLoading(false)
        }
    }, [visible])

    return (
        <YakitModal
            title='批量修改插件作者'
            width={448}
            type='white'
            centered={true}
            closable={true}
            keyboard={false}
            visible={visible}
            cancelButtonProps={{loading: submitLoading}}
            confirmLoading={submitLoading}
            onCancel={cancel}
            onOk={submit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["modify-author-modal-body"]}>
                <Form.Item
                    labelCol={{span: 24}}
                    label={<>作者：</>}
                    help={
                        <>
                            共选择了 <span className={styles["modify-author-hint-span"]}>{plugins.length || 0}</span>{" "}
                            个插件
                        </>
                    }
                    validateStatus={status}
                >
                    <YakitSelect
                        placeholder='请输入用户名进行搜索'
                        showArrow={false}
                        showSearch={true}
                        filterOption={false}
                        notFoundContent={loading ? <YakitSpin spinning={true} size='small' /> : ""}
                        allowClear={true}
                        value={value}
                        onSearch={onsearch}
                        onChange={(value, option: any) => {
                            setValue(value)
                            if (value) setStatus("")
                        }}
                    >
                        {list.map((item) => (
                            <YakitSelect.Option key={item.name} value={item.id} record={item}>
                                <div className={styles["modify-author-item-wrapper"]}>
                                    <AuthorImg size='small' src={item.head_img || ""} />
                                    {item.name}
                                </div>
                            </YakitSelect.Option>
                        ))}
                    </YakitSelect>
                </Form.Item>
            </div>
        </YakitModal>
    )
})

interface ReasonModalProps {
    visible: boolean
    setVisible: () => any
    type?: string
    total?: number
    onOK: (reason: string) => any
}
/** @name 原因说明 */
export const ReasonModal: React.FC<ReasonModalProps> = memo((props) => {
    const {visible, setVisible, type = "nopass", total, onOK} = props

    const title = useMemo(() => {
        if (type === "nopass") return "不通过原因"
        if (type === "del") return "删除原因"
        return "未知错误窗口,请关闭重试!"
    }, [type])

    useEffect(() => {
        if (!visible) setValue("")
    }, [visible])

    const [value, setValue] = useState<string>("")
    // const [kind, setKind] = useState<"body" | "extra">("body")
    const onSubmit = useMemoizedFn(() => {
        if (!value) {
            yakitNotify("error", "请输入删除原因!")
            return
        }
        let data = value
        if (type === "nopass") {
            data = value //`${kind}\n${value}`
        }
        onOK(data)
    })

    return (
        <YakitModal
            title={title}
            width={448}
            type='white'
            centered={true}
            closable={true}
            maskClosable={false}
            keyboard={false}
            visible={visible}
            onCancel={setVisible}
            onOk={onSubmit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["reason-modal-body"]}>
                {
                    type === "nopass" && null
                    // <div className={styles["no-pass-kind"]}>
                    //     <Radio
                    //         className='plugins-radio-wrapper'
                    //         checked={kind === "body"}
                    //         onClick={(e) => {
                    //             if (kind === "body") return
                    //             setKind("body")
                    //         }}
                    //     >
                    //         内容不通过
                    //     </Radio>
                    //     <Radio
                    //         className='plugins-radio-wrapper'
                    //         checked={kind === "extra"}
                    //         onClick={(e) => {
                    //             if (kind === "extra") return
                    //             setKind("extra")
                    //         }}
                    //     >
                    //         补充资料不通过
                    //     </Radio>
                    // </div>
                }
                <YakitInput.TextArea
                    autoSize={{minRows: 3, maxRows: 3}}
                    isShowResize={false}
                    showCount
                    value={value}
                    maxLength={150}
                    onChange={(e) => setValue(e.target.value)}
                />
                {total && (
                    <div className={styles["hint-wrapper"]}>
                        共选择了 <span className={styles["total-num"]}>{total || 0}</span> 个插件
                    </div>
                )}
            </div>
        </YakitModal>
    )
})

interface UploadGroupModalProps {
    importSuccess: () => void
    onClose: () => void
}

const UploadGroupModal: React.FC<UploadGroupModalProps> = (props) => {
    const {importSuccess, onClose} = props
    const [file, setFile] = useState<RcFile>()
    const [loading, setLoading] = useState<boolean>(false)
    const isCancelRef = useRef<boolean>(false)

    const suffixFun = (file_name: string) => {
        let file_index = file_name.lastIndexOf(".")
        return file_name.slice(file_index, file_name.length)
    }

    const UploadDataPackage = useMemoizedFn(async () => {
        isCancelRef.current = false
        if (file) {
            setLoading(true)
            ipcRenderer
                // @ts-ignore
                .invoke("upload-group-data", {path: file.path})
                .then((res) => {
                    if (res.code === 200 && !isCancelRef.current) {
                        importSuccess()
                        yakitNotify("success", "导入分组上传成功")
                        onClose()
                    }

                    if (!res.data.ok) {
                        yakitNotify("error", res.data.reason)
                    }
                })
                .catch((err) => {
                    !isCancelRef.current && yakitNotify("error", "导入分组上传失败")
                })
                .finally(() => {
                    isCancelRef.current && setTimeout(() => setLoading(false), 200)
                })
        }
    })

    return (
        <div className={styles["upload-yakit-ee"]}>
            <YakitSpin spinning={loading}>
                <div className={styles["upload-dragger-box"]}>
                    <Dragger
                        className={styles["upload-dragger"]}
                        multiple={false}
                        maxCount={1}
                        showUploadList={false}
                        beforeUpload={(f) => {
                            const file_name = f.name
                            const suffix = suffixFun(file_name)
                            const typeArr: string[] = [
                                // ".csv",
                                // ".xls",
                                ".xlsx"
                                // "application/vnd.ms-excel",
                                // "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            ]
                            if (!typeArr.includes(suffix)) {
                                setFile(undefined)
                                yakitNotify("warning", "上传文件格式错误，请重新上传")
                                return false
                            }
                            setFile(f)
                            return false
                        }}
                    >
                        <div className={styles["upload-info"]}>
                            <div className={styles["add-file-icon"]}>
                                <PropertyIcon />
                            </div>
                            {file ? (
                                file.name
                            ) : (
                                <div className={styles["content"]}>
                                    <div className={styles["title"]}>
                                        可将文件拖入框内，或
                                        <span className={styles["hight-light"]}>点击此处导入</span>
                                    </div>
                                    <div className={styles["sub-title"]}>
                                        （仅支持.xlsx格式文件）可先
                                        <span
                                            className={styles["hight-light"]}
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                const fileData = await ipcRenderer.invoke("get-template-file")
                                                // 将 base64 编码的文件数据转换为字节字符
                                                const byteCharacters = atob(fileData)
                                                // 将字节字符转换为字节数字
                                                const byteNumbers = new Array(byteCharacters.length)
                                                for (let i = 0; i < byteCharacters.length; i++) {
                                                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                                                }
                                                // 将字节数字转换为 Uint8Array
                                                const byteArray = new Uint8Array(byteNumbers)
                                                // 使用 Uint8Array 创建一个 Blob 对象
                                                const blob = new Blob([byteArray], {
                                                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                                })
                                                const link = document.createElement("a")
                                                link.href = URL.createObjectURL(blob)
                                                link.download = "导入模板.xlsx"
                                                document.body.appendChild(link)
                                                link.click()
                                                document.body.removeChild(link)
                                            }}
                                        >
                                            下载模板
                                        </span>
                                        填写后再进行导入
                                    </div>
                                </div>
                            )}
                        </div>
                    </Dragger>
                </div>
            </YakitSpin>
            <div style={{textAlign: "right", marginTop: 16}}>
                {loading ? (
                    <YakitButton
                        className={styles["btn-style"]}
                        onClick={() => {
                            isCancelRef.current = true
                            setFile(undefined)
                            setLoading(false)
                        }}
                    >
                        取消
                    </YakitButton>
                ) : (
                    <YakitButton
                        className={styles["btn-style"]}
                        type='primary'
                        disabled={!file}
                        onClick={() => {
                            UploadDataPackage()
                        }}
                    >
                        导入
                    </YakitButton>
                )}
            </div>
        </div>
    )
}
