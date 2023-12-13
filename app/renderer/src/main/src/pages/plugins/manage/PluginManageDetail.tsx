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
    OutlineCursorclickIcon,
    OutlineLightbulbIcon,
    OutlinePencilIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useGetState, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginFilterParams, PluginInfoRefProps, PluginSearchParams, PluginSettingRefProps} from "../baseTemplateType"
import {ReasonModal} from "./PluginManage"
import {ApplicantIcon, AuthorImg, FilterPopoverBtn, FuncBtn} from "../funcTemplate"
import {
    PluginBaseParamProps,
    PluginDataProps,
    PluginParamDataProps,
    PluginSettingParamProps,
    YakParamProps
} from "../pluginsType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {OnlinePluginAppAction} from "../pluginReducer"
import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {apiAuditPluginDetaiCheck, apiFetchPluginDetailCheck} from "../utils"
import {convertRemoteToLocalParams, convertRemoteToRemoteInfo} from "../editDetails/utils"
import {yakitNotify} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"

const {TabPane} = PluginTabs

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

        const [searchs, setSearchs] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
        const onSearch = useMemoizedFn((value: PluginSearchParams) => {
            onDetailSearch(searchs, filters)
        })
        const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
        const onFilter = useMemoizedFn((value: PluginFilterParams) => {
            setFilters(value)
            onDetailSearch(searchs, value)
        })

        // 获取插件详情
        const onDetail = useMemoizedFn((info: YakitPluginOnlineDetail) => {
            if (loading) return

            setLoading(true)
            apiFetchPluginDetailCheck({uuid: info.uuid, list_type: "check"})
                .then((res) => {
                    if (res) {
                        setPlugin({...res})
                        setOldContent("")
                        // 源码
                        setContent(res.content)
                        if (+res.status !== 0) return
                        // 设置修改人
                        setApply({
                            name: res.apply_user_name || "",
                            img: res.apply_user_head_img || "",
                            description: res.logDescription || ""
                        })
                        // 设置基础信息
                        let infoData: PluginBaseParamProps = {
                            ScriptName: res.script_name,
                            Help: res.help,
                            RiskType: res.riskType,
                            RiskDetail: {
                                CWEId: res.riskDetail?.cweId || "",
                                RiskType: res.riskDetail?.riskType || "",
                                Description: res.riskDetail?.description || "",
                                CWESolution: res.riskDetail?.solution || ""
                            },
                            RiskAnnotation: res.risk_annotation,
                            Tags: []
                        }
                        try {
                            infoData.Tags = (res.tags || "").split(",") || []
                        } catch (error) {}
                        if (!infoData.RiskType) infoData.RiskDetail = undefined
                        setInfoParams({...infoData})
                        // 设置配置信息
                        let settingData: PluginSettingParamProps = {
                            Params: convertRemoteToLocalParams(res.params || []).map((item) => {
                                const obj: PluginParamDataProps = {
                                    ...item,
                                    ExtraSetting: item.ExtraSetting ? JSON.parse(item.ExtraSetting) : undefined
                                }
                                return obj
                            }),
                            EnablePluginSelector: !!res.enable_plugin_selector,
                            PluginSelectorTypes: res.plugin_selector_types,
                            Content: res.content || ""
                        }
                        setSettingParams({...settingData})

                        if (res.merge_before_plugins) setOldContent(res.merge_before_plugins.content || "")
                    }
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        })

        // 因为组件 RollingLoadList 的定向滚动功能初始不执行，所以设置一个初始变量跳过初始状态
        const [scrollTo, setScrollTo] = useState<number>(0)

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
        // 插件类型(漏洞类型|其他类型)
        const isRisk = useMemo(() => {
            if ((plugin as any)?.riskType) return "bug"
            return "other"
        }, [plugin])

        // 修改者信息
        const [apply, setApply] = useState<{name: string; img: string; description: string}>()
        const isApply = useMemo(() => !!(apply && apply.name), [apply])

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
        // 删除某些tag 触发  DNSLog和HTTP数据包变形开关的改变
        const onTagsCallback = useMemoizedFn(() => {
            setInfoParams({...(fetchInfoData() || getInfoParams())})
        })
        // DNSLog和HTTP数据包变形开关的改变 影响 tag的增删
        const onSwitchToTags = useMemoizedFn((value: string[]) => {
            setInfoParams({
                ...(fetchInfoData() || getInfoParams()),
                Tags: value
            })
        })

        // 插件配置信息-相关逻辑
        const settingRef = useRef<PluginSettingRefProps>(null)
        const [settingParams, setSettingParams] = useState<PluginSettingParamProps>({
            Params: [],
            Content: ""
        })

        // 插件源码
        const [content, setContent] = useState<string>("")
        // 旧插件源码
        const [oldContent, setOldContent] = useState<string>("")

        // 将各部分组件内的数据取出并转换
        const convertPluginInfo = useMemoizedFn(async () => {
            if (!plugin) return undefined

            if (+plugin.status !== 0) {
                const obj = convertRemoteToRemoteInfo(plugin)
                return obj
            }

            const data: PluginDataProps = {
                ScriptName: plugin.script_name,
                Type: plugin.type,
                Kind: plugin.riskType ? "bug" : "other",
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
                data.Help = data.Kind === "bug" ? undefined : info?.Help
                data.RiskType = data.Kind === "bug" ? info?.RiskType : undefined
                data.RiskDetail = data.Kind === "bug" ? info?.RiskDetail : undefined
                data.RiskAnnotation = data.Kind === "bug" ? info?.RiskAnnotation : undefined
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
                data.Params = (setting?.Params || []).map((item) => {
                    const obj: YakParamProps = {
                        ...item,
                        ExtraSetting: item.ExtraSetting ? JSON.stringify(item.ExtraSetting) : ""
                    }
                    return obj
                })
                data.EnablePluginSelector = setting?.EnablePluginSelector
                data.PluginSelectorTypes = setting?.PluginSelectorTypes
            }
            // 无参数情况
            if (data.Params.length === 0) data.Params = undefined
            data.Content = content

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
                    const audit: API.PluginsAudit = {
                        listType: "check",
                        status: isPass ? "true" : "false",
                        uuid: plugin.uuid,
                        logDescription: description || undefined,
                        upPluginLogId: plugin.up_log_id || 0
                    }
                    const info: API.PluginsRequest | undefined = await convertPluginInfo()
                    if (!info) {
                        if (callback) callback()
                        return
                    }

                    apiAuditPluginDetaiCheck({...info, ...audit})
                        .then(() => {
                            if (callback)
                                callback({
                                    ...(info as any),
                                    tags: (info.tags || []).join(","),
                                    risk_annotation: info.annotation,
                                    downloaded_total: info.download_total || 0
                                })
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
                        setPlugin({...value, status: 2})
                        dispatch({
                            type: "update",
                            payload: {
                                item: {...value, status: 2}
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
            if (statusLoading) return
            setStatusLoading(true)
            onChangeStatus({isPass: true}, (value) => {
                if (value) {
                    setPlugin({...value, status: 1})
                    dispatch({
                        type: "update",
                        payload: {
                            item: {...value, status: 1}
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
        // 去使用
        const onRun = useMemoizedFn(() => {})
        // 返回
        const onPluginBack = useMemoizedFn(() => {
            onBack({allCheck, selectList, search: searchs, filter: filters})
        })

        const optExtra = useMemoizedFn((data: API.YakitPluginDetail) => {
            return statusTag[`${data.status}`]
        })

        if (!plugin) return null

        return (
            <PluginDetails<YakitPluginOnlineDetail>
                title='插件管理'
                spinLoading={spinLoading}
                search={searchs}
                setSearch={setSearchs}
                onSearch={onSearch}
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
                        {/* <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                            <YakitButton
                                type='text2'
                                loading={delLoading}
                                icon={<OutlineTrashIcon />}
                                onClick={() => {
                                    onBatchDel()
                                }}
                            />
                        </Tooltip> */}
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
                            <PluginDetailsListItem<API.YakitPluginDetail>
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
                                        extraNode={
                                            <div className={styles["plugin-info-extra-header"]}>
                                                {+plugin.status !== 0 && (
                                                    <>
                                                        <Tooltip
                                                            title={+plugin.status === 1 ? "改为未通过" : "改为通过"}
                                                            overlayClassName='plugins-tooltip'
                                                        >
                                                            <YakitButton
                                                                loading={statusLoading}
                                                                type='text2'
                                                                icon={<OutlinePencilIcon />}
                                                                onClick={() => {
                                                                    if (+plugin.status === 1) onOpenReason()
                                                                    else onPass()
                                                                }}
                                                            />
                                                        </Tooltip>
                                                        <div style={{height: 12}} className='divider-style'></div>
                                                    </>
                                                )}
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

                                                {+plugin.status === 0 && (
                                                    <>
                                                        <FuncBtn
                                                            maxWidth={1100}
                                                            type='outline1'
                                                            colors='danger'
                                                            icon={<SolidBanIcon />}
                                                            loading={statusLoading}
                                                            name={"不通过"}
                                                            onClick={onOpenReason}
                                                        />
                                                        <FuncBtn
                                                            maxWidth={1100}
                                                            colors='success'
                                                            icon={<SolidBadgecheckIcon />}
                                                            loading={statusLoading}
                                                            name={"通过"}
                                                            onClick={onPass}
                                                        />
                                                    </>
                                                )}
                                                {/* <FuncBtn
                                                    maxWidth={1100}
                                                    icon={<OutlineCursorclickIcon />}
                                                    name={"去使用"}
                                                    onClick={onRun}
                                                /> */}
                                            </div>
                                        }
                                        img={plugin.head_img}
                                        user={plugin.authors}
                                        pluginId={plugin.uuid}
                                        updated_at={plugin.updated_at}
                                        prImgs={(plugin.collaborator || []).map((ele) => ({
                                            headImg: ele.head_img,
                                            userName: ele.user_name
                                        }))}
                                        type={plugin.type}
                                    />

                                    {+plugin.status === 0 ? (
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
                                                    kind={isRisk}
                                                    data={infoParams}
                                                    tagsCallback={onTagsCallback}
                                                />
                                            </div>
                                            <div className={styles["plugin-setting-info"]}>
                                                <div className={styles["setting-header"]}>插件配置</div>
                                                <div className={styles["setting-body"]}>
                                                    <PluginModifySetting
                                                        ref={settingRef}
                                                        type='yak'
                                                        tags={infoParams.Tags || []}
                                                        setTags={onSwitchToTags}
                                                        data={settingParams}
                                                    />
                                                    <PluginEditorDiff
                                                        language={ plugin.type}
                                                        isDiff={isApply}
                                                        newCode={content}
                                                        oldCode={oldContent}
                                                        setCode={setContent}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles["details-editor-wrapper"]}>
                                            <YakitEditor type={plugin.type} value={content} readOnly={true} />
                                        </div>
                                    )}
                                </div>
                            </YakitSpin>
                        </TabPane>
                        <TabPane tab='日 志(监修中)' key='log' disabled={true}>
                            <div></div>
                        </TabPane>
                    </PluginTabs>
                </div>

                <ReasonModal
                    visible={showReason.visible}
                    setVisible={onCancelReason}
                    type={showReason.type}
                    onOK={onReasonCallback}
                />
            </PluginDetails>
        )
    })
)
