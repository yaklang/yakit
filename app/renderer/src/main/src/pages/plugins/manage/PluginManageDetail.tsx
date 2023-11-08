import React, {useEffect, useMemo, useRef, useState} from "react"
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
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useGetState, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {Tabs, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginFilterParams, PluginInfoRefProps, PluginSearchParams, PluginSettingRefProps} from "../baseTemplateType"
import {ReasonModal} from "./PluginManage"
import {ApplicantIcon, AuthorImg, FilterPopoverBtn, FuncBtn} from "../funcTemplate"
import {IconOutlinePencilAltIcon} from "@/assets/newIcon"
import {PluginBaseParamProps, PluginSettingParamProps} from "../pluginsType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {OnlinePluginAppAction} from "../pluginReducer"
import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {apiAuditPluginDetaiCheck, apiFetchPluginDetailCheck} from "../utils"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import classNames from "classnames"
import { NetWorkApi } from "@/services/fetch"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

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

interface PluginManageDetailProps {
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

export const PluginManageDetail: React.FC<PluginManageDetailProps> = (props) => {
    const {
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

    const aass = useRef<API.PluginsAuditDetailResponse>()

    // 获取插件详情
    const onDetail = useMemoizedFn((info: YakitPluginOnlineDetail) => {
        console.log("api:plugins/audit/detail", `参数:${JSON.stringify({uuid: info.uuid, list_type: "check"})}`)
        apiFetchPluginDetailCheck({uuid: info.uuid, list_type: "check"})
            .then((res) => {
                console.log("res", res)
                aass.current = res
            })
            .catch((e) => {
                console.log("error:" + e)
            })
    })

    useEffect(() => {
        if (info) {
            onDetail(info)
        } else {
        }
    }, [info])

    const qqqq = useMemoizedFn(() => {
        if (!aass.current) return
        const info = {...aass.current}
        const obj: API.CopyPluginsRequest = {
            ...info,
            tags: (info.tags || "").split(","),
            base_plugin_id: 13433,
            script_name: "我改了，这是测试审核通过的",
            // logDescription: "我就要通过改为不通过"
        }
        console.log("api:plugins/audit", JSON.stringify(obj))
        // apiAuditPluginDetaiCheck(obj)
        //     .then((res) => {
        //         console.log("res", res)
        //     })
        //     .catch((e) => {
        //         console.log("error:" + e)
        //     })
        NetWorkApi<API.CopyPluginsRequest, API.PluginsResponse>({
            method: "post",
            url: "copy/plugins",
            data: {...obj}
        })
            .then((res) => {
                console.log('copy',res)
            })
            .catch((err) => {
                console.log('err',err)
            })
    })

    const [loading, setLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    // 插件类型(漏洞类型|其他类型)
    const isRisk = useMemo(() => {
        if ((info as any)?.riskType) return "bug"
        return "other"
    }, [info])

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
    const onOptCheck = useMemoizedFn((data: YakitPluginOnlineDetail, check: boolean) => {
        if (allCheck) {
            setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
            setAllcheck(false)
        }
        if (check) setSelectList([...getSelectList(), data])
        else setSelectList(getSelectList().filter((item) => item.uuid !== data.uuid))
    })

    // 批量下载|一键下载
    const onDownload = useMemoizedFn(() => {
        onBatchDownload({allCheck, selectList, search: searchs, filter: filters})
    })

    // (批量|单个)删除|清空
    const onBatchDel = useMemoizedFn((info?: YakitPluginOnlineDetail) => {
        onPluginDel(info, {allCheck, selectList, search: searchs, filter: filters})
    })

    useEffect(() => {
        console.log("info", info)
        if (info) {
            // onDetail(info)
            setPlugin({...(info as any)})
            setInfoParams({
                ScriptName: info.script_name,
                Help: info.help || info.script_name,
                Tags: info.tags.split(",")
            })
            setSettingParams({
                Params: [] as any,
                EnablePluginSelector: !!info.enable_plugin_selector,
                PluginSelectorTypes: info.plugin_selector_types || "",
                Content: info.content
            })
        } else {
            setPlugin(undefined)
            setInfoParams({ScriptName: ""})
            setSettingParams({Params: [], Content: ""})
        }
    }, [info])

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
    const [settingParams, setSettingParams, getSettingParams] = useGetState<PluginSettingParamProps>({
        Params: [],
        Content: ""
    })

    // 原因窗口
    const [showReason, setShowReason] = useState<{visible: boolean; type: "nopass" | "del"}>({
        visible: false,
        type: "nopass"
    })
    // 删除按钮
    const [delLoading, setDelLoading] = useState<boolean>(false)
    // 审核按钮
    const [statusLoading, setStatusLoading] = useState<boolean>(false)
    // 打开原因窗口
    const onOpenReason = useMemoizedFn(() => {
        setShowReason({visible: true, type: "nopass"})
    })
    // 关闭原因窗口
    const onCancelReason = useMemoizedFn(() => {
        setShowReason({visible: false, type: "del"})
    })
    const onReasonCallback = useMemoizedFn((reason: string) => {
        const type = showReason.type
        onCancelReason()

        if (type === "nopass") {
            setStatusLoading(true)
            dispatch({
                type: "update",
                payload: {
                    item: {...info, status: 2}
                }
            })
            setTimeout(() => {
                setStatusLoading(false)
            }, 200)
        }
    })
    // 审核通过
    const onPass = useMemoizedFn(() => {
        setStatusLoading(true)
        dispatch({
            type: "update",
            payload: {
                item: {...info, status: 1}
            }
        })
        setTimeout(() => {
            setStatusLoading(false)
        }, 200)
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
                    <div style={{height: 12}} className='divider-style'></div>
                    <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                        <YakitButton
                            type='text2'
                            icon={<OutlineTrashIcon />}
                            onClick={() => {
                                onBatchDel()
                            }}
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
                numberRoll: currentIndex,
                data: response.data,
                loadMoreData: loadMoreData,
                classNameRow: "plugin-details-opt-wrapper",
                renderRow: (info, i) => {
                    const check = allCheck || selectUUIDs.includes(info.uuid)
                    return (
                        <PluginDetailsListItem<API.YakitPluginDetail>
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
                            onPluginClick={() => {}}
                        />
                    )
                },
                page: response.pagemeta.page,
                hasMore: response.pagemeta.total !== response.data.length,
                loading: loading,
                defItemHeight: 46
            }}
            onBack={onPluginBack}
        >
            <div className={styles["details-content-wrapper"]}>
                <Tabs tabPosition='right' className='plugins-tabs'>
                    <TabPane tab='源 码' key='code'>
                        <div className={styles["plugin-info-wrapper"]}>
                            <PluginDetailHeader
                                pluginName={plugin.script_name}
                                help={plugin.help}
                                titleNode={statusTag["1"]}
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
                                                        icon={<IconOutlinePencilAltIcon />}
                                                        // onClick={onOpenReason}
                                                        onClick={qqqq}
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
                                                onClick={() => onBatchDel(plugin)}
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
                                                    // onClick={onOpenReason}
                                                    onClick={qqqq}
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
                                        <FuncBtn
                                            maxWidth={1100}
                                            icon={<OutlineCursorclickIcon />}
                                            name={"去使用"}
                                            // onClick={onRun}
                                            onClick={qqqq}
                                        />
                                    </div>
                                }
                                img={plugin.head_img}
                                user={plugin.authors}
                                pluginId={plugin.uuid}
                                updated_at={plugin.updated_at}
                            />

                            {+plugin.status === 0 ? (
                                <div className={styles["plugin-info-body"]}>
                                    <div className={styles["plugin-modify-info"]}>
                                        <div className={styles["modify-advice"]}>
                                            <div className={styles["advice-icon"]}>
                                                <OutlineLightbulbIcon />
                                            </div>
                                            <div className={styles["advice-body"]}>
                                                <div className={styles["advice-content"]}>
                                                    <div className={styles["content-title"]}>修改内容描述</div>
                                                    <div className={styles["content-style"]}>
                                                        这里是申请人提交的对修改内容的描述，这里是申请人提交的对修改内容的描述，这里是申请人提交的对修改内容的描述，这里是申请人提交的对修改内容的描述，
                                                    </div>
                                                </div>
                                                <div className={styles["advice-user"]}>
                                                    <AuthorImg src={plugin?.head_img || ""} />
                                                    {plugin?.authors || ""}
                                                    <ApplicantIcon />
                                                </div>
                                            </div>
                                        </div>
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
                                            <PluginEditorDiff />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles["details-editor-wrapper"]}>
                                    <YakitEditor type={"yak"} value={"1231242112515"} />
                                </div>
                            )}
                        </div>
                    </TabPane>
                    <TabPane tab='日 志(监修中)' key='log' disabled={true}>
                        <div></div>
                    </TabPane>
                </Tabs>
            </div>

            <ReasonModal
                visible={showReason.visible}
                setVisible={onCancelReason}
                type={showReason.type}
                onOK={onReasonCallback}
            />
        </PluginDetails>
    )
}
