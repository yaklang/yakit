import React, {ForwardedRef, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    PluginDetailHeader,
    PluginDetails,
    PluginDetailsListItem,
    PluginEditorDiff,
    PluginModifyInfo,
    PluginModifySetting,
    statusTag
} from "../baseTemplate"
import {SolidBadgecheckIcon, SolidBanIcon} from "@/assets/icon/solid"
import {
    OutlineClouddownloadIcon,
    OutlineCodeIcon,
    OutlineLightbulbIcon,
    OutlineLoadingIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useGetState, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {Image, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    PluginFilterParams,
    PluginInfoRefProps,
    PluginListPageMeta,
    PluginSearchParams,
    PluginSettingRefProps
} from "../baseTemplateType"
import {ReasonModal} from "./PluginManage"
import {ApplicantIcon, AuthorImg, CodeScoreModule, FilterPopoverBtn} from "../funcTemplate"
import {PluginBaseParamProps, PluginDataProps, PluginSettingParamProps} from "../pluginsType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {OnlinePluginAppAction} from "../pluginReducer"
import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {convertPluginsRequestParams} from "../utils"
import {convertRemoteToRemoteInfo, onCodeToInfo} from "../editDetails/utils"
import {failed, yakitNotify} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {PluginDebug} from "../pluginDebug/PluginDebug"
import {GetPluginLanguage} from "../builtInData"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {pluginSupplementJSONConvertToData, riskDetailConvertOnlineToLocal} from "@/pages/pluginEditor/utils/convert"
import {httpAuditPluginOperate, httpFetchAuditPluginDetail} from "@/pages/pluginHub/utils/http"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {HubButton} from "@/pages/pluginHub/hubExtraOperate/funcTemplate"
import useAdmin from "@/hook/useAdmin"
import emiter from "@/utils/eventBus/eventBus"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitPluginSupplement} from "@/pages/pluginEditor/base"
import {DownloadingState} from "@/yakitGVDefine"
import {PluginLog} from "@/pages/pluginHub/pluginLog/PluginLog"

import classNames from "classnames"
import "../plugins.scss"
import styles from "./pluginManage.module.scss"

const {TabPane} = PluginTabs

const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

const {ipcRenderer} = window.require("electron")

/** 详情页返回列表页 时的 关联数据 */
export interface BackInfoProps {
    /** 是否全选 */
    allCheck: boolean
    /** 选中插件集合 */
    selectList: YakitPluginOnlineDetail[]
    /** 搜索内容条件 */
    search: PluginSearchParams
    /** 搜索过滤条件 */
    filter: PluginFilterParams
}

export interface DetailRefProps {
    /**
     * @name 删除的回调
     * @param value 删除的插件数组
     * @param isFailed 是否失败
     */
    onDelCallback: (value: YakitPluginOnlineDetail[], isFailed?: boolean) => any
}

interface PluginManageDetailProps {
    ref?: ForwardedRef<any>
    /** 列表初始加载状态 */
    spinLoading: boolean
    /** 列表更多加载状态 */
    listLoading: boolean
    /** 所有数据 */
    response: YakitPluginListOnlineResponse
    /** 所有数据操作方法 */
    dispatch: React.Dispatch<OnlinePluginAppAction>
    /** 初始点击插件数据 */
    info: YakitPluginOnlineDetail
    /** 初始全选状态 */
    defaultAllCheck: boolean
    /** 初始选中插件集合 */
    defaultSelectList: YakitPluginOnlineDetail[]
    /** 初始搜索内容 */
    defaultSearch: PluginSearchParams
    /** 初始过滤条件 */
    defaultFilter: PluginFilterParams
    /** 批量下载loading状态 */
    downloadLoading: boolean
    /** 批量下载回调 */
    onBatchDownload: (data?: BackInfoProps) => any
    /** 删除功能回调 */
    onPluginDel: (info: YakitPluginOnlineDetail | undefined, data: BackInfoProps) => any
    /** 当前展示插件的索引 */
    currentIndex: number
    setCurrentIndex: (index: number) => any
    /** 返回 */
    onBack: (data: BackInfoProps) => any
    /** 加载更多数据 */
    loadMoreData: () => any
    /** 搜索功能回调 */
    onDetailSearch: (searchs: PluginSearchParams, filters: PluginFilterParams) => any
}

const pageWrapId = "plugin-manage-detail"

export const PluginManageDetail: React.FC<PluginManageDetailProps> = memo(
    forwardRef((props, ref) => {
        const {
            spinLoading,
            listLoading,
            response,
            dispatch,
            info,
            defaultAllCheck,
            defaultSelectList,
            defaultSearch,
            defaultFilter,
            downloadLoading,
            onBatchDownload,
            onPluginDel,
            currentIndex,
            setCurrentIndex,
            onBack,
            loadMoreData,
            onDetailSearch
        } = props

        const wrapperWidth = useListenWidth(document.body)
        const admin = useAdmin()

        const [searchs, setSearchs] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
        const onSearch = useMemoizedFn((value: PluginSearchParams) => {
            onDetailSearch(value, filters)
            setSelectList([])
            setAllcheck(false)
        })
        const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
        const onFilter = useMemoizedFn((value: PluginFilterParams) => {
            setFilters(value)
            onDetailSearch(searchs, value)
            setSelectList([])
            setAllcheck(false)
        })

        /**转换group参数*/
        const convertGroupParam = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
            const realFilters: PluginFilterParams = {
                ...filter,
                plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
            }
            return realFilters
        }

        // 获取插件详情
        const onDetail = useMemoizedFn(
            (info: YakitPluginOnlineDetail, callback?: (data: API.PluginsAuditDetailResponse) => void) => {
                if (loading) return

                setLoading(true)
                httpFetchAuditPluginDetail(info.uuid)
                    .then(async (res) => {
                        if (res) {
                            setOldContent("")
                            // 源码
                            setContent(res.content)
                            // 设置修改人
                            setApply({
                                name: res.apply_user_name || "",
                                img: res.apply_user_head_img || "",
                                description: res.logDescription || ""
                            })
                            // 获取补充资料
                            const supplementInfo = pluginSupplementJSONConvertToData(res.pluginSupplement || "")
                            setSupplement(supplementInfo ? {...supplementInfo} : undefined)
                            // 设置基础信息
                            let infoData: PluginBaseParamProps = {
                                ScriptName: res.script_name,
                                Help: res.help,
                                RiskDetail: riskDetailConvertOnlineToLocal(res.riskInfo),
                                Tags: []
                            }
                            let tags: string[] = []
                            try {
                                tags = (res.tags || "").split(",") || []
                            } catch (error) {}
                            const codeInfo =
                                GetPluginLanguage(res.type) === "yak"
                                    ? await onCodeToInfo({type: res.type, code: res.content})
                                    : null
                            if (codeInfo && codeInfo.Tags.length > 0) {
                                // 去重
                                tags = filter([...tags, ...codeInfo.Tags])
                            }
                            infoData.Tags = [...tags]

                            setInfoParams({...infoData})
                            setCacheTags(infoData?.Tags || [])
                            // 设置配置信息
                            let settingData: PluginSettingParamProps = {
                                EnablePluginSelector: !!res.enable_plugin_selector,
                                PluginSelectorTypes: res.plugin_selector_types,
                                Content: res.content || ""
                            }
                            setSettingParams({...settingData})
                            setPlugin({...res})
                            if (res.merge_before_plugins) setOldContent(res.merge_before_plugins.content || "")
                            if (callback) callback(res)
                        }
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setLoading(false)
                        }, 200)
                    })
            }
        )

        // 因为组件 RollingLoadList 的定向滚动功能初始不执行，所以设置一个初始变量跳过初始状态
        const [scrollTo, setScrollTo] = useState<number>(0)

        const updateDetail = useMemoizedFn((uuid) => {
            if (!uuid || !plugin) return
            if (uuid !== plugin.uuid) return
            onDetail(plugin, (data) => {
                dispatch({
                    type: "update",
                    payload: {
                        item: cloneDeep(data)
                    }
                })
                setTimeout(() => {
                    setRecalculation(!recalculation)
                }, 50)
            })
        })
        // 日志里的合并影响审核插件的状态，所以需要获取最新数据展示
        useEffect(() => {
            emiter.on("logMergeModifyToPluginDetail", updateDetail)
            return () => {
                emiter.off("logMergeModifyToPluginDetail", updateDetail)
            }
        }, [])

        useEffect(() => {
            if (info) {
                onDetail(info)
                // 必须加上延时，不然本次操作会成为组件(RollingLoadList)的初始数据
                setTimeout(() => {
                    setScrollTo(currentIndex)
                }, 100)
            }
        }, [info])

        // 详情页面的loading状态
        const [loading, setLoading] = useState<boolean>(false)

        const [allCheck, setAllcheck] = useState<boolean>(defaultAllCheck)
        const onAllCheck = useMemoizedFn((check: boolean) => {
            setSelectList([])
            setAllcheck(check)
        })

        const [selectList, setSelectList, getSelectList] = useGetState<YakitPluginOnlineDetail[]>(defaultSelectList)
        // 选中插件的uuid集合
        const selectUUIDs = useMemo(() => {
            return getSelectList().map((item) => item.uuid)
        }, [selectList])
        // 选中插件的数量
        const selectNum = useMemo(() => {
            if (allCheck) return response.pagemeta.total
            else return selectList.length
        }, [allCheck, selectList])
        // 复选框勾选
        const onOptCheck = useMemoizedFn((data: YakitPluginOnlineDetail, check: boolean) => {
            if (allCheck) {
                setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
                setAllcheck(false)
            }
            if (check) setSelectList([...getSelectList(), data])
            else setSelectList(getSelectList().filter((item) => item.uuid !== data.uuid))
        })
        // 点击插件查看详情
        const onOptClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
            setCurrentIndex(index)
            onDetail(data)
        })

        // 批量下载|一键下载
        const onDownload = useMemoizedFn(() => {
            onBatchDownload({allCheck, selectList, search: searchs, filter: filters})
        })

        // 删除按钮
        const [delLoading, setDelLoading] = useState<boolean>(false)
        // (批量|单个)删除|清空
        const onBatchDel = useMemoizedFn((info?: YakitPluginOnlineDetail) => {
            onPluginDel(info, {allCheck, selectList, search: searchs, filter: filters})
            setTimeout(() => {
                setDelLoading(false)
            }, 300)
        })

        // 删除事件的结果回调
        const onDelCallback: DetailRefProps["onDelCallback"] = useMemoizedFn((value, isFailed) => {
            if (!isFailed) {
                if (value.length > 0) {
                    const index = selectUUIDs.findIndex((item) => value[0]?.uuid === item)
                    if (index > -1) {
                        onOptCheck(value[0], false)
                    }
                }
            }
            setTimeout(() => {
                setDelLoading(false)
            }, 200)
        })

        useImperativeHandle(
            ref,
            () => ({
                onDelCallback: onDelCallback
            }),
            []
        )

        const [plugin, setPlugin] = useState<API.PluginsAuditDetailResponse>()
        // 判断不同权限不同审核状态下的按钮展示
        const extraHeaderInfo = useMemo(() => {
            const isPass = !!plugin?.pen ? (plugin.status === 3 ? true : plugin?.status === 1) : plugin?.status === 1
            // isBtns-是否展示通过和不通过按钮
            // isPass-是否展示钢笔 icon
            return {isBtns: !plugin?.pen, isPass: isPass}
        }, [plugin?.status, plugin?.pen])
        // 是否可以进行操作和禁用提示语
        const isBanOperate = useMemo(() => {
            return {
                isBan: !!plugin?.disable,
                hint: !!plugin?.disable ? (plugin?.isAuthor ? "作者无法操作" : "修改者无法操作") : ""
            }
        }, [plugin?.disable, plugin?.isAuthor])

        // 修改者信息
        const [apply, setApply] = useState<{name: string; img: string; description: string}>()
        const isApply = useMemo(() => !!(apply && apply.name), [apply])

        // 补充资料
        const [supplement, setSupplement] = useState<YakitPluginSupplement>()

        // 插件基础信息-相关逻辑
        const infoRef = useRef<PluginInfoRefProps>(null)
        const [infoParams, setInfoParams, getInfoParams] = useGetState<PluginBaseParamProps>({
            ScriptName: ""
        })
        // 获取基础信息组件内的数据(不考虑验证)
        const fetchInfoData = useMemoizedFn(() => {
            if (infoRef.current) {
                return infoRef.current.onGetValue()
            }
            return undefined
        })
        const [cacheTags, setCacheTags] = useState<string[]>()
        // 删除某些tag 触发  DNSLog和HTTP数据包变形开关的改变
        const onTagsCallback = useMemoizedFn((v: string[]) => {
            setCacheTags(v || [])
        })
        // DNSLog和HTTP数据包变形开关的改变 影响 tag的增删
        const onSwitchToTags = useMemoizedFn((value: string[]) => {
            setInfoParams({
                ...(fetchInfoData() || getInfoParams()),
                Tags: value
            })
            setCacheTags(value)
        })

        // 插件配置信息-相关逻辑
        const settingRef = useRef<PluginSettingRefProps>(null)
        const [settingParams, setSettingParams] = useState<PluginSettingParamProps>({
            Content: ""
        })

        // 强制更新对比器
        const [updateDiff, setUpdateDiff] = useState<boolean>(false)
        // 插件源码
        const [content, setContent] = useState<string>("")
        // 旧插件源码
        const [oldContent, setOldContent] = useState<string>("")

        // 将各部分组件内的数据取出并转换
        const convertPluginInfo = useMemoizedFn(async () => {
            if (!plugin) return undefined

            if (plugin.status === 1 || plugin.status === 2) {
                const obj = convertRemoteToRemoteInfo(plugin)
                return obj
            }

            const data: PluginDataProps = {
                ScriptName: plugin.script_name,
                Type: plugin.type,
                Content: plugin.content
            }
            // 基础信息
            if (!infoRef.current) {
                yakitNotify("error", "未获取到基础信息，请重试")
                return
            }
            const info = await infoRef.current.onSubmit()
            if (!info) {
                yakitNotify("error", "请完善必填的基础信息")
                return
            } else {
                data.Help = info?.Help
                data.Tags = (info?.Tags || []).join(",") || undefined
            }
            // 配置信息
            if (!settingRef.current) {
                yakitNotify("error", "未获取到配置信息，请重试")
                return
            }
            const setting = await settingRef.current.onSubmit()
            if (!setting) {
                yakitNotify("error", "请完善必填的配置信息")
                return
            } else {
                data.EnablePluginSelector = setting?.EnablePluginSelector
                data.PluginSelectorTypes = setting?.PluginSelectorTypes
            }
            data.Content = content

            const codeAnalysis =
                GetPluginLanguage(data.Type) === "yak"
                    ? await onCodeToInfo({type: data.Type, code: data.Content})
                    : null
            // 源码-获取 tag 信息
            let newTags = (data.Tags || "").split(",") || []
            if (codeAnalysis && codeAnalysis.Tags.length > 0) {
                newTags = newTags.concat(codeAnalysis.Tags)
                newTags = newTags.filter((item, index, self) => {
                    return self.indexOf(item) === index
                })
            }
            data.Tags = newTags.length === 0 ? undefined : newTags.join(",")
            // 源码-获取漏洞详情信息
            if (GetPluginLanguage(data.Type) === "yak" && codeAnalysis) {
                data.RiskDetail = codeAnalysis.RiskInfo.filter((item) => item.Level && item.CVE && item.TypeVerbose)
            }
            // 源码-获取参数信息
            if (["yak", "mitm", "codec"].includes(data.Type) && codeAnalysis) {
                data.Params = codeAnalysis.CliParameter || []
                data.PluginEnvKey = codeAnalysis.PluginEnvKey || []
            }

            const obj = convertRemoteToRemoteInfo(plugin, data)

            return obj
        })

        // 通过|不通过请求API
        const onChangeStatus = useMemoizedFn(
            async (
                param: {
                    isPass: boolean
                    description?: string
                },
                callback?: (value?: API.PluginsAuditDetailResponse) => any
            ) => {
                const {isPass, description = ""} = param

                if (plugin) {
                    const audit: API.PluginAudit = {
                        status: isPass ? "true" : "false",
                        uuid: plugin.uuid,
                        logDescription: description || undefined
                    }
                    const info: API.PluginsRequest | undefined = await convertPluginInfo()
                    if (!info) {
                        if (callback) callback()
                        return
                    }

                    httpAuditPluginOperate({...info, ...audit})
                        .then(() => {
                            if (plugin) {
                                onDetail(cloneDeep(plugin), (data) => {
                                    if (callback) callback(cloneDeep(data))
                                })
                            } else {
                                yakitNotify("error", "未获取到插件信息，请在左侧列表切换插件获取最新信息")
                            }
                        })
                        .catch(() => {
                            if (callback) callback()
                        })
                } else {
                    if (callback) callback()
                }
            }
        )
        // 更新item后刷新虚拟列表
        const [recalculation, setRecalculation] = useState<boolean>(false)
        // 原因窗口
        const [showReason, setShowReason] = useState<{visible: boolean; type: "nopass" | "del"}>({
            visible: false,
            type: "nopass"
        })
        // 审核按钮
        const [statusLoading, setStatusLoading] = useState<boolean>(false)
        // 打开原因窗口
        const onOpenReason = useMemoizedFn(() => {
            if (isBanOperate.isBan) return
            if (statusLoading) return
            setStatusLoading(true)
            setShowReason({visible: true, type: "nopass"})
        })
        // 关闭原因窗口
        const onCancelReason = useMemoizedFn((loading?: boolean) => {
            setShowReason({visible: false, type: "del"})
            if (typeof loading !== "boolean" || !loading) {
                setTimeout(() => {
                    setStatusLoading(false)
                }, 200)
            }
        })
        const onReasonCallback = useMemoizedFn((reason: string) => {
            const type = showReason.type
            onCancelReason(true)

            if (type === "nopass") {
                setStatusLoading(true)
                onChangeStatus({isPass: false, description: reason}, (value) => {
                    if (value) {
                        setContent(value?.content || "")
                        setPlugin({...value})
                        dispatch({
                            type: "update",
                            payload: {
                                item: {...value}
                            }
                        })
                        setTimeout(() => {
                            setRecalculation(!recalculation)
                        }, 200)
                    }
                    setTimeout(() => {
                        setStatusLoading(false)
                    }, 200)
                })
            }
        })
        // 审核通过
        const onPass = useMemoizedFn(() => {
            if (isBanOperate.isBan) return
            if (statusLoading) return
            handleOpenScoreHint()
        })

        // 通过操作需先进行源码评分
        const [scoreHint, setScoreHint] = useState<boolean>(false)
        const handleOpenScoreHint = useMemoizedFn(() => {
            if (scoreHint) return
            if (!plugin) {
                yakitNotify("error", "未获取到插件信息，请切换插件详情后重试")
                return
            }
            setScoreHint(true)
        })
        const handleScoreModule = useMemoizedFn((value: boolean) => {
            if (value) handleScoreHintSuccess()
        })
        const handleScoreHintSuccess = useMemoizedFn(() => {
            setStatusLoading(true)
            handleCancelScoreHint()
            onChangeStatus({isPass: true}, (value) => {
                if (value) {
                    setPlugin({...value})
                    dispatch({
                        type: "update",
                        payload: {
                            item: {...value}
                        }
                    })
                    setTimeout(() => {
                        setRecalculation(!recalculation)
                    }, 200)
                }
                setTimeout(() => {
                    setStatusLoading(false)
                }, 200)
            })
        })
        const handleCancelScoreHint = useMemoizedFn(() => {
            setScoreHint(false)
        })

        /** --------------- 插件调试 Start --------------- */
        const [debugPlugin, setDebugPlugin] = useState<PluginDataProps>()
        const [debugShow, setDebugShow] = useState<boolean>(false)

        const onCancelDebug = useMemoizedFn(() => {
            if (debugShow) setDebugShow(false)
        })
        const onMerge = useMemoizedFn((v: string) => {
            setContent(v)
            setUpdateDiff(!updateDiff)
            setDebugShow(false)
            setDebugPlugin(undefined)
        })

        // 将页面数据转化为插件调试信息
        const convertDebug = useMemoizedFn(() => {
            return new Promise(async (resolve, reject) => {
                setDebugPlugin(undefined)
                try {
                    if (!plugin) {
                        resolve("false")
                        return
                    }

                    const paramsList =
                        GetPluginLanguage(plugin.type) === "yak"
                            ? await onCodeToInfo({type: plugin.type, code: content})
                            : {CliParameter: []}
                    if (!paramsList) {
                        resolve("false")
                        return
                    }
                    const info: PluginDataProps = {
                        ScriptName: plugin.script_name,
                        Type: plugin.type,
                        Params: paramsList.CliParameter,
                        Content: content
                    }
                    setDebugPlugin({...info})

                    resolve("true")
                } catch (error) {
                    resolve("false")
                }
            })
        })

        // 调试
        const onDebug = useMemoizedFn(async () => {
            if (!plugin) return
            if (debugShow) return

            const result = await convertDebug()
            // 获取插件信息错误
            if (result === "false") return
            setDebugShow(true)
        })
        /** --------------- 插件调试 End --------------- */

        // 返回
        const onPluginBack = useMemoizedFn(() => {
            onBack({allCheck, selectList, search: searchs, filter: filters})
        })

        const optExtra = useMemoizedFn((data: API.PluginsDetail) => {
            return statusTag[`${data.status}`]
        })

        /**选中组 */
        const selectGroup = useMemo(() => {
            const group: YakFilterRemoteObj[] = cloneDeep(filters).plugin_group?.map((item: API.PluginsSearchData) => ({
                name: item.value,
                total: item.count
            })) as YakFilterRemoteObj[]
            return group || []
        }, [filters])

        const getGroupPluginListQuery = useMemoizedFn((uuid: string[]) => {
            const pageParams: PluginListPageMeta = {
                page: +response.pagemeta.page,
                limit: +response.pagemeta.limit
            }
            const params = {
                ...convertPluginsRequestParams({...filters}, searchs, pageParams),
                uuid: uuid
            }
            return params
        })

        // 预览
        const [preview, setPreview] = useState<boolean>(false)
        const current = useRef<number>(0)
        const handlePreview = useMemoizedFn((index: number) => {
            if (preview) return
            current.current = index
            setPreview(true)
        })

        const [downloadFileLoading, setDownloadFileLoading] = useState<boolean>(false)
        // 下载附件里的压缩包
        const downloadSupplementFile = useMemoizedFn(() => {
            if (downloadFileLoading) return
            if (!supplement) {
                failed("补充资料里无压缩包附件")
                return
            }
            const {
                fileInfo: {url, fileName}
            } = supplement
            if (!url || !fileName) {
                failed("补充资料里无压缩包附件")
                return
            }
            setDownloadFileLoading(true)
            ipcRenderer.invoke("download-url-to-path", {url: url, fileName: fileName})
        })
        useEffect(() => {
            ipcRenderer.on(`download-url-to-path-progress`, (e, data: {state: DownloadingState; openPath: string}) => {
                const {state, openPath} = data
                if (state.percent >= 1) {
                    ipcRenderer.invoke("shell-open-abs-file", openPath)
                    setTimeout(() => {
                        setDownloadFileLoading(false)
                    }, 200)
                }
            })

            return () => {
                ipcRenderer.removeAllListeners(`download-url-to-path-progress`)
            }
        }, [])

        const extraNode = useMemo(() => {
            if (!plugin) return null
            return (
                <div className={styles["plugin-info-extra-header"]}>
                    {!extraHeaderInfo.isBtns && (
                        <>
                            <YakitButton
                                loading={statusLoading}
                                type={extraHeaderInfo.isPass ? "outline1" : undefined}
                                colors={extraHeaderInfo.isPass ? "danger" : "success"}
                                onClick={() => {
                                    if (extraHeaderInfo.isPass) onOpenReason()
                                    else onPass()
                                }}
                                className={classNames({
                                    [styles["operate-disabled-btn"]]: isBanOperate.isBan
                                })}
                            >
                                {extraHeaderInfo.isPass ? "改为未通过" : "改为通过"}
                            </YakitButton>
                            {admin.isAdmin && <div style={{height: 12}} className='divider-style'></div>}
                        </>
                    )}
                    {admin.isAdmin && (
                        <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                            <YakitButton
                                type='text2'
                                icon={<OutlineTrashIcon />}
                                loading={delLoading}
                                onClick={() => {
                                    if (delLoading) return
                                    setDelLoading(true)
                                    onBatchDel(plugin)
                                }}
                            />
                        </Tooltip>
                    )}

                    {extraHeaderInfo.isBtns && (
                        <>
                            <HubButton
                                width={wrapperWidth}
                                iconWidth={1100}
                                type='outline1'
                                colors='danger'
                                icon={<SolidBanIcon />}
                                loading={statusLoading}
                                name='不通过'
                                disabled={isBanOperate.isBan}
                                className={classNames({
                                    [styles["operate-disabled-btn"]]: isBanOperate.isBan
                                })}
                                hint={isBanOperate.hint}
                                onClick={onOpenReason}
                            />
                            <HubButton
                                width={wrapperWidth}
                                iconWidth={1100}
                                colors='success'
                                icon={<SolidBadgecheckIcon />}
                                loading={statusLoading}
                                name='通过'
                                disabled={isBanOperate.isBan}
                                className={classNames({
                                    [styles["operate-disabled-btn"]]: isBanOperate.isBan
                                })}
                                hint={isBanOperate.hint}
                                onClick={onPass}
                            />
                            {/* 禁用状态隐藏调试功能 */}
                            {!isBanOperate.isBan && (
                                <HubButton
                                    width={wrapperWidth}
                                    iconWidth={1100}
                                    icon={<OutlineCodeIcon />}
                                    name='调试'
                                    onClick={onDebug}
                                />
                            )}
                        </>
                    )}
                </div>
            )
        }, [extraHeaderInfo, statusLoading, admin, delLoading, wrapperWidth, plugin, isBanOperate])

        if (!plugin) return null

        return (
            <PluginDetails<YakitPluginOnlineDetail>
                pageWrapId={pageWrapId}
                title='插件管理'
                spinLoading={spinLoading}
                search={searchs}
                setSearch={setSearchs}
                onSearch={onSearch}
                filterNode={
                    <>
                        <PluginGroup
                            isOnline={true}
                            selectGroup={selectGroup}
                            pluginListQuery={getGroupPluginListQuery}
                            setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                            isShowGroupMagBtn={admin.isAdmin}
                            onClickMagFun={onPluginBack}
                            checkedPlugin={selectList.map((item) => item.uuid)}
                            allChecked={allCheck}
                            total={response.pagemeta.total}
                        />
                    </>
                }
                filterBodyBottomNode={
                    <div style={{marginTop: 8}}>
                        <TagsAndGroupRender
                            wrapStyle={{marginBottom: 0}}
                            selectGroup={selectGroup}
                            setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                        />
                    </div>
                }
                filterExtra={
                    <div className={"details-filter-extra-wrapper"}>
                        <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='check' />
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title={selectNum > 0 ? "批量下载" : "一键下载"} overlayClassName='plugins-tooltip'>
                            <YakitButton
                                loading={downloadLoading}
                                type='text2'
                                icon={<OutlineClouddownloadIcon />}
                                onClick={onDownload}
                            />
                        </Tooltip>
                    </div>
                }
                checked={allCheck}
                onCheck={onAllCheck}
                total={response.pagemeta.total}
                selected={selectNum}
                listProps={{
                    rowKey: "uuid",
                    numberRoll: scrollTo,
                    data: response.data,
                    loadMoreData: loadMoreData,
                    recalculation: recalculation,
                    classNameRow: "plugin-details-opt-wrapper",
                    renderRow: (info, i) => {
                        const check = allCheck || selectUUIDs.includes(info.uuid)
                        return (
                            <PluginDetailsListItem<API.PluginsDetail>
                                order={i}
                                plugin={info as any}
                                selectUUId={plugin.uuid}
                                check={check}
                                headImg={info.head_img}
                                pluginUUId={info.uuid}
                                pluginName={info.script_name}
                                help={info.help}
                                content={info.content}
                                optCheck={onOptCheck}
                                extra={optExtra}
                                official={info.official}
                                isCorePlugin={!!info.isCorePlugin}
                                pluginType={info.type}
                                onPluginClick={onOptClick}
                            />
                        )
                    },
                    page: response.pagemeta.page,
                    hasMore: response.pagemeta.total !== response.data.length,
                    loading: listLoading,
                    defItemHeight: 46,
                    isRef: spinLoading
                }}
                onBack={onPluginBack}
            >
                <div className={styles["details-content-wrapper"]}>
                    <PluginTabs tabPosition='right'>
                        <TabPane tab='源 码' key='code'>
                            <YakitSpin spinning={loading}>
                                <div className={styles["plugin-info-wrapper"]}>
                                    <PluginDetailHeader
                                        pluginName={plugin.script_name}
                                        help={plugin.help}
                                        titleNode={statusTag[+plugin.status]}
                                        tags={plugin.tags}
                                        extraNode={extraNode}
                                        img={plugin.head_img}
                                        user={plugin.authors}
                                        pluginId={plugin.uuid}
                                        updated_at={plugin.updated_at}
                                        prImgs={(plugin.collaborator || []).map((ele) => ({
                                            headImg: ele.head_img,
                                            userName: ele.user_name
                                        }))}
                                        type={plugin.type}
                                        wrapperClassName={styles["plugin-info-header"]}
                                    />

                                    {plugin.status === 0 || plugin.status === 3 ? (
                                        <div className={styles["plugin-info-body"]}>
                                            <div className={styles["plugin-modify-info"]}>
                                                {isApply && (
                                                    <div className={styles["modify-advice"]}>
                                                        <div className={styles["advice-icon"]}>
                                                            <OutlineLightbulbIcon />
                                                        </div>
                                                        <div className={styles["advice-body"]}>
                                                            <div className={styles["advice-content"]}>
                                                                <div className={styles["content-title"]}>
                                                                    修改内容描述
                                                                </div>
                                                                <div className={styles["content-style"]}>
                                                                    {apply?.description || ""}
                                                                </div>
                                                            </div>
                                                            <div className={styles["advice-user"]}>
                                                                <AuthorImg src={apply?.img || ""} />
                                                                {apply?.name || ""}
                                                                <ApplicantIcon />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <PluginModifyInfo
                                                    ref={infoRef}
                                                    isEdit={true}
                                                    data={infoParams}
                                                    tagsCallback={onTagsCallback}
                                                />
                                            </div>

                                            {/* {supplement && (
                                                <div className={styles["plugin-supplement"]}>
                                                    <div className={styles["supplement-header"]}>补充资料</div>
                                                    {supplement.text && (
                                                        <div className={styles["supplement-text"]}>
                                                            {supplement.text}
                                                        </div>
                                                    )}
                                                    {supplement.imgs.length > 0 && (
                                                        <div className={styles["supplement-image"]}>
                                                            {supplement.imgs.map((item, index) => {
                                                                return (
                                                                    <div
                                                                        className={classNames(styles["img-opt"])}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                        }}
                                                                    >
                                                                        <Image
                                                                            key={item.url}
                                                                            src={item.url}
                                                                            className={styles["img-style"]}
                                                                            preview={false}
                                                                        />
                                                                        <div
                                                                            className={styles["mask-box"]}
                                                                            onClick={() => {
                                                                                handlePreview(index)
                                                                            }}
                                                                        >
                                                                            预览
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                    {supplement.fileInfo.url && supplement.fileInfo.fileName && (
                                                        <div className={styles["supplement-file"]}>
                                                            附件：
                                                            <span
                                                                className={classNames(styles["span-style"], {
                                                                    [styles["span-bin-style "]]: downloadFileLoading
                                                                })}
                                                                onClick={downloadSupplementFile}
                                                            >
                                                                {supplement.fileInfo.fileName}
                                                            </span>
                                                            {downloadFileLoading && (
                                                                <div className={styles["loading-icon"]}>
                                                                    <OutlineLoadingIcon className='icon-rotate-animation' />
                                                                    下载中...
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )} */}

                                            <div className={styles["plugin-setting-info"]}>
                                                <div className={styles["setting-header"]}>插件配置</div>
                                                <div className={styles["setting-body"]}>
                                                    <PluginModifySetting
                                                        ref={settingRef}
                                                        type={plugin.type}
                                                        tags={cacheTags || []}
                                                        setTags={onSwitchToTags}
                                                        data={settingParams}
                                                    />
                                                    <PluginEditorDiff
                                                        language={plugin.type}
                                                        isDiff={isApply}
                                                        newCode={content}
                                                        oldCode={oldContent}
                                                        setCode={setContent}
                                                        triggerUpdate={updateDiff}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles["details-editor-wrapper"]}>
                                            <YakitEditor type={plugin.type} value={content} readOnly={true} />
                                        </div>
                                    )}

                                    {debugShow && (
                                        <PluginDebug
                                            getContainer={document.getElementById("plugin-manage-detail") || undefined}
                                            plugin={debugPlugin}
                                            visible={debugShow}
                                            onClose={onCancelDebug}
                                            onMerge={onMerge}
                                        />
                                    )}
                                </div>
                            </YakitSpin>
                        </TabPane>
                        <TabPane tab='日 志' key='logs'>
                            <div className={styles["plugin-logs-wrapper"]}>
                                <PluginDetailHeader
                                    pluginName={plugin.script_name}
                                    help={plugin.help}
                                    titleNode={statusTag[+plugin.status]}
                                    tags={plugin.tags}
                                    extraNode={extraNode}
                                    img={plugin.head_img}
                                    user={plugin.authors}
                                    pluginId={plugin.uuid}
                                    updated_at={plugin.updated_at}
                                    prImgs={(plugin.collaborator || []).map((ele) => ({
                                        headImg: ele.head_img,
                                        userName: ele.user_name
                                    }))}
                                    type={plugin.type}
                                    wrapperClassName={styles["plugin-info-header"]}
                                />
                                <PluginLog getContainer={pageWrapId} plugin={plugin} />
                            </div>
                        </TabPane>
                    </PluginTabs>
                </div>

                <ReasonModal
                    visible={showReason.visible}
                    setVisible={onCancelReason}
                    type={showReason.type}
                    onOK={onReasonCallback}
                />

                {/* 源码评分机制 */}
                {plugin && scoreHint && (
                    <YakitModal
                        title='插件基础检测'
                        type='white'
                        width={"50%"}
                        centered={true}
                        maskClosable={false}
                        closable={true}
                        visible={scoreHint}
                        footer={null}
                        destroyOnClose={true}
                        onCancel={handleCancelScoreHint}
                        bodyStyle={{padding: 0}}
                    >
                        <CodeScoreModule
                            type={plugin.type}
                            code={content}
                            successHint='检测合格，插件通过中...'
                            failedHint='检测不合格，请修改后操作'
                            successWait={1000}
                            isStart={scoreHint}
                            callback={handleScoreModule}
                            specialHint='(无法判断，请确认是否通过审核)'
                            specialBtnText='确定通过'
                            specialExtraBtn={
                                <YakitButton type='outline2' onClick={handleCancelScoreHint}>
                                    关闭
                                </YakitButton>
                            }
                        />
                    </YakitModal>
                )}

                {/* 图片预览 */}
                {/* <div style={{display: "none"}}>
                    <Image.PreviewGroup
                        preview={{
                            visible: preview,
                            onVisibleChange: (show) => {
                                setPreview(show)
                            },
                            current: current.current
                        }}
                    >
                        {(supplement?.imgs || []).map((item) => {
                            return <Image src={item.url} />
                        })}
                    </Image.PreviewGroup>
                </div> */}
            </PluginDetails>
        )
    })
)
