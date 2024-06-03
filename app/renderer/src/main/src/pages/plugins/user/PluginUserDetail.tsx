import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem, statusTag} from "../baseTemplate"
import {OutlineClouddownloadIcon, OutlineCursorclickIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {FilterPopoverBtn, FuncBtn} from "../funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {yakitNotify} from "@/utils/notification"
import {OnlineUserExtraOperate} from "./PluginUser"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "lodash/cloneDeep"
import {PluginUserDetailProps, UserBackInfoProps} from "./PluginUserType"
import {useStore} from "@/store"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {onlineUseToLocalDetail} from "../utils"
import {LoadingOutlined} from "@ant-design/icons"
import {SolidPrivatepluginIcon} from "@/assets/icon/colors"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {PluginLog} from "../log/PluginLog"

import "../plugins.scss"
import styles from "./PluginUserDetail.module.scss"

const {TabPane} = PluginTabs

const wrapperId = "plugin-user-detail"

export const PluginUserDetail: React.FC<PluginUserDetailProps> = React.memo(
    forwardRef((props, ref) => {
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
            // onDetailsBatchRemove,
            // removeLoading,
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

        useImperativeHandle(
            ref,
            () => ({
                onRecalculation
            }),
            [allCheck, selectList]
        )

        useEffect(() => {
            if (info) {
                setPlugin({...info})
                // 必须加上延时，不然本次操作会成为组件(RollingLoadList)的初始数据
                setTimeout(() => {
                    setScrollTo(currentIndex)
                }, 100)
            } else setPlugin(undefined)
        }, [info])

        /**刷新我的插件列表 */
        const onRecalculation = useMemoizedFn(() => {
            setRecalculation(!recalculation)
        })
        /**去使用，跳转到本地插件详情页面 */
        const onUse = useMemoizedFn(() => {
            if (!plugin) return
            onlineUseToLocalDetail(plugin.uuid, "mine")
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
            return data.is_private ? <SolidPrivatepluginIcon className='icon-svg-16' /> : statusTag[`${data.status}`]
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
            setSelectList([])
            setAllCheck(value)
        })
        const onPluginClick = useMemoizedFn((data: YakitPluginOnlineDetail, index: number) => {
            setCurrentIndex(index)
            setPlugin({...data})
        })
        const onFilter = useMemoizedFn(async (value: PluginFilterParams) => {
            setSpinLoading(true)
            try {
                setFilters(value)
                await onDetailSearch(search, value)
                setAllCheck(false)
                setSelectList([])
            } catch (error) {}
            setTimeout(() => {
                setSpinLoading(false)
            }, 200)
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
            setSpinLoading(true)
            try {
                await onDetailSearch(search, filters)
            } catch (error) {}
            setAllCheck(false)
            setSelectList([])
            setTimeout(() => {
                setSpinLoading(false)
            }, 200)
        })
        /**详情批量删除 */
        // const onBatchRemove = useMemoizedFn(async () => {
        //     const params: UserBackInfoProps = {allCheck, selectList, search, filter: filters, selectNum}
        //     onDetailsBatchRemove(params)
        //     setAllCheck(false)
        //     setSelectList([])
        // })
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
                    pageWrapId={wrapperId}
                    filterExtra={
                        <div className={"details-filter-extra-wrapper"}>
                            <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='user' />
                            <div style={{height: 12}} className='divider-style'></div>
                            {downloadLoading ? (
                                <LoadingOutlined className='loading-icon' />
                            ) : (
                                <Tooltip title='下载插件' overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        type='text2'
                                        icon={<OutlineClouddownloadIcon />}
                                        onClick={onBatchDownload}
                                    />
                                </Tooltip>
                            )}
                            {/* <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onBatchRemove} />
                        </Tooltip> */}
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
                    spinLoading={spinLoading}
                >
                    <div className={styles["details-content-wrapper"]}>
                        <PluginTabs tabPosition='right'>
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
                                        type={plugin.type}
                                        basePluginName={plugin.base_script_name}
                                    />
                                    <div className={styles["details-editor-wrapper"]}>
                                        <YakitEditor type={plugin.type} value={plugin.content} readOnly={true} />
                                    </div>
                                </div>
                            </TabPane>
                            <TabPane tab='日志' key='log'>
                                <PluginLog uuid={plugin.uuid || ""} getContainer={wrapperId} />
                            </TabPane>
                        </PluginTabs>
                    </div>
                </PluginDetails>
            </>
        )
    })
)
