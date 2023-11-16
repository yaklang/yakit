import React, {ReactNode, useEffect, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem, statusTag} from "../baseTemplate"
import {
    OutlineClouddownloadIcon,
    OutlineCursorclickIcon,
    OutlineDotshorizontalIcon,
    OutlineFilterIcon,
    OutlineLockclosedIcon,
    OutlineLockopenIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import {Tabs, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {FilterPopoverBtn, FuncBtn} from "../funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {yakitNotify} from "@/utils/notification"
import {MePluginType, OnlineUserExtraOperate, mePluginTypeList} from "./PluginUser"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "bizcharts/lib/utils/cloneDeep"
import {PluginUserDetailProps, UserBackInfoProps} from "./PluginUserType"
import {PrivatePluginIcon} from "@/assets/newIcon"
import {useStore} from "@/store"
import {YakitPluginOnlineJournal} from "@/pages/yakitStore/YakitPluginOnlineJournal/YakitPluginOnlineJournal"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"

import "../plugins.scss"
import styles from "./PluginUserDetail.module.scss"
import classNames from "classnames"
import {DownloadOnlinePluginsRequest, apiDownloadPluginMine, apiQueryYakScript} from "../utils"
import {QueryYakScriptRequest} from "@/pages/invoker/schema"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

export const PluginUserDetail: React.FC<PluginUserDetailProps> = (props) => {
    const {
        info,
        defaultAllCheck,
        defaultSelectList,
        defaultFilter,
        response,
        onBack,
        loadMoreData,
        defaultSearchValue,
        dispatch,
        onRemovePluginDetailSingleBefore,
        onDetailSearch,
        currentIndex,
        setCurrentIndex,
        onDetailsBatchDownload,
        onDetailsBatchRemove,
        removeLoading,
        downloadLoading
    } = props
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
    const [selectList, setSelectList] = useState<string[]>(defaultSelectList)
    const [loading, setLoading] = useState<boolean>(false)
    const [spinLoading, setSpinLoading] = useState<boolean>(false)
    const [recalculation, setRecalculation] = useState<boolean>(false) // 更新item后刷新虚拟列表
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))

    const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)

    // 因为组件 RollingLoadList 的定向滚动功能初始不执行，所以设置一个初始变量跳过初始状态
    const [scrollTo, setScrollTo] = useState<number>(0)

    const userInfo = useStore((s) => s.userInfo)

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    useEffect(() => {
        if (info) {
            setPlugin({...info})
            // 必须加上延时，不然本次操作会成为组件(RollingLoadList)的初始数据
            setTimeout(() => {
                setScrollTo(currentIndex)
            }, 100)
        } else setPlugin(undefined)
    }, [info])
    /**去使用，跳转到本地插件详情页面 */
    const onUse = useMemoizedFn(() => {
        if (!plugin) return
        const query: QueryYakScriptRequest = {
            Pagination: {
                Page: 1,
                Limit: 1,
                Order: "",
                OrderBy: ""
            },
            UUId: plugin.uuid
        }
        apiQueryYakScript(query).then((res) => {
            if (+res.Total > 0) {
                emiter.emit("openPage", JSON.stringify({route: YakitRoute.Plugin_Local, params: {uuid: plugin.uuid}}))
            } else {
                let downloadParams: DownloadOnlinePluginsRequest = {
                    UUID: [plugin.uuid]
                }
                apiDownloadPluginMine(downloadParams).then(() => {
                    emiter.emit(
                        "openPage",
                        JSON.stringify({route: YakitRoute.Plugin_Local, params: {uuid: plugin.uuid}})
                    )
                })
            }
        })
    })
    // 返回
    const onPluginBack = useMemoizedFn(() => {
        onBack({
            search,
            filter: filters,
            selectList,
            allCheck
        })
        setPlugin(undefined)
    })

    const onUserDetailSelect = useMemoizedFn((key) => {
        switch (key) {
            case "editState":
                onEditState()
                break
            case "remove":
                onRemove()
                break
            default:
                break
        }
    })
    const onEditState = useMemoizedFn(() => {
        if (!plugin) return
        const isPrivate: boolean = !plugin.is_private
        let status: number = 0
        if (userInfo.role === "ordinary") {
            // 为待审核
            status = 0
        } else {
            // 为审核通过
            if (!isPrivate) status = 1
        }
        const editPlugin = {...plugin, is_private: isPrivate, status}

        setPlugin({
            ...editPlugin
        })
        setRecalculation(!recalculation)
    })
    const onRemove = useMemoizedFn(() => {
        if (!plugin) return
        onRemovePluginDetailSingleBefore(plugin)
    })
    const onLoadMoreData = useMemoizedFn(async () => {
        if (loading) return
        setLoading(true)
        await loadMoreData()
        setTimeout(() => {
            setLoading(false)
        }, 300)
    })
    /** 单项副标题组件 */
    const optExtra = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return data.is_private ? <PrivatePluginIcon /> : statusTag[`${data.status}`]
    })
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        try {
            // 全选情况时的取消勾选
            if (allCheck) {
                setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
                setAllCheck(false)
                return
            }
            // 单项勾选回调
            if (value) setSelectList([...selectList, data.uuid])
            else setSelectList(selectList.filter((item) => item !== data.uuid))
        } catch (error) {
            yakitNotify("error", "勾选失败:" + error)
        }
    })
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllCheck(value)
    })
    const onPluginClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
        setCurrentIndex(index)
        setPlugin({...data})
    })
    const onFilter = useMemoizedFn((value: PluginFilterParams) => {
        setFilters(value)
        onDetailSearch(search, value)
        setAllCheck(false)
        setSelectList([])
    })
    /** 新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Owner}})
        )
    })
    /**搜索需要清空勾选 */
    const onSearch = useMemoizedFn(async () => {
        try {
            await onDetailSearch(search, filters)
        } catch (error) {}
        setAllCheck(false)
        setSelectList([])
    })
    /**详情批量删除 */
    const onBatchRemove = useMemoizedFn(async () => {
        const params: UserBackInfoProps = {allCheck, selectList, search, filter: filters, selectNum}
        onDetailsBatchRemove(params)
        setAllCheck(false)
        setSelectList([])
    })
    /**详情批量下载 */
    const onBatchDownload = useMemoizedFn(async () => {
        const params: UserBackInfoProps = {allCheck, selectList, search, filter: filters, selectNum}
        onDetailsBatchDownload(params)
        setAllCheck(false)
        setSelectList([])
    })
    if (!plugin) return null
    return (
        <>
            <PluginDetails<YakitPluginOnlineDetail>
                title='我的云端插件'
                filterExtra={
                    <div className={"details-filter-extra-wrapper"}>
                        <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='user' />
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='下载插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineClouddownloadIcon />} onClick={onBatchDownload} />
                        </Tooltip>
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onBatchRemove} />
                        </Tooltip>
                        <div style={{height: 12}} className='divider-style'></div>
                        <YakitButton type='text' onClick={onNewAddPlugin}>
                            新建插件
                        </YakitButton>
                    </div>
                }
                checked={allCheck}
                onCheck={onCheck}
                total={response.pagemeta.total}
                selected={selectNum}
                listProps={{
                    rowKey: "uuid",
                    numberRoll: scrollTo,
                    data: response.data,
                    loadMoreData: onLoadMoreData,
                    classNameRow: "plugin-details-opt-wrapper",
                    recalculation,
                    renderRow: (info, i) => {
                        const check = allCheck || selectList.includes(info.uuid)
                        return (
                            <PluginDetailsListItem<YakitPluginOnlineDetail>
                                order={i}
                                plugin={info}
                                selectUUId={plugin.uuid}
                                check={check}
                                headImg={info.head_img}
                                pluginUUId={info.uuid}
                                pluginName={info.script_name}
                                help={info.help}
                                content={info.content}
                                optCheck={optCheck}
                                official={info.official}
                                isCorePlugin={!!info.isCorePlugin}
                                pluginType={info.type}
                                extra={optExtra}
                                onPluginClick={onPluginClick}
                            />
                        )
                    },
                    page: response.pagemeta.page,
                    hasMore: +response.pagemeta.total !== response.data.length,
                    loading: loading,
                    defItemHeight: 46,
                    isRef: spinLoading
                }}
                onBack={onPluginBack}
                search={search}
                setSearch={setSearch}
                onSearch={onSearch}
                spinLoading={spinLoading || removeLoading || downloadLoading}
            >
                <div className={styles["details-content-wrapper"]}>
                    <Tabs tabPosition='right' className='plugins-tabs'>
                        <TabPane tab='源 码' key='code'>
                            <div className={styles["plugin-info-wrapper"]}>
                                <PluginDetailHeader
                                    pluginName={plugin.script_name}
                                    help={plugin.help}
                                    tags={plugin.tags}
                                    extraNode={
                                        <div className={styles["plugin-info-extra-header"]}>
                                            <OnlineUserExtraOperate
                                                dispatch={dispatch}
                                                userInfoRole={userInfo.role || ""}
                                                plugin={plugin}
                                                onSelect={onUserDetailSelect}
                                            />
                                            <FuncBtn
                                                maxWidth={1100}
                                                icon={<OutlineCursorclickIcon />}
                                                name={"去使用"}
                                                onClick={onUse}
                                            />
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
                                />
                                <div className={styles["details-editor-wrapper"]}>
                                    <YakitEditor type={"yak"} value={plugin.content} />
                                </div>
                            </div>
                        </TabPane>
                        <TabPane tab='日志' key='log'>
                            <div className={styles["plugin-log-wrapper"]}>
                                <YakitPluginOnlineJournal pluginId={plugin.id} />
                            </div>
                        </TabPane>
                    </Tabs>
                </div>
            </PluginDetails>
        </>
    )
}
