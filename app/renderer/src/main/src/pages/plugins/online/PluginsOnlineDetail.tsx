import React, {useEffect, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem} from "../baseTemplate"
import {OutlineClouddownloadIcon, OutlineCursorclickIcon} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {FilterPopoverBtn, FuncBtn, OnlineExtraOperate} from "../funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {yakitNotify} from "@/utils/notification"
import {OnlineBackInfoProps, PluginsOnlineDetailProps, YakitPluginOnlineDetail} from "./PluginsOnlineType"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "lodash/cloneDeep"
import {thousandthConversion} from "../pluginReducer"
import {useStore} from "@/store"
import {LoadingOutlined} from "@ant-design/icons"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRouteConstants"
import {onlineUseToLocalDetail} from "../utils"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {PluginLog} from "../log/PluginLog"

import "../plugins.scss"
import styles from "./PluginsOnlineDetail.module.scss"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {API} from "@/services/swagger/resposeType"
import {PluginComment} from "../baseComment"

const {ipcRenderer} = window.require("electron")

const {TabPane} = PluginTabs

const wrapperId = "plugin-online-detail"

export const PluginsOnlineDetail: React.FC<PluginsOnlineDetailProps> = (props) => {
    const {
        info,
        defaultAllCheck,
        // onCheck,
        defaultSelectList,
        // optCheck,
        response,
        onBack,
        loadMoreData,
        loading,
        defaultSearchValue,
        defaultFilter,
        dispatch,
        onBatchDownload,
        downloadLoading,
        onDetailSearch,
        spinLoading,
        currentIndex,
        setCurrentIndex
    } = props
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
    const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)
    const [selectList, setSelectList] = useState<string[]>(defaultSelectList)
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))

    // 因为组件 RollingLoadList 的定向滚动功能初始不执行，所以设置一个初始变量跳过初始状态
    const [scrollTo, setScrollTo] = useState<number>(0)

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()

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
        onlineUseToLocalDetail(plugin.uuid, "online")
    })
    // 返回
    const onPluginBack = useMemoizedFn(() => {
        onBack({
            search,
            filter: filters,
            allCheck,
            selectList
        })
        setPlugin(undefined)
    })
    const onLikeClick = useMemoizedFn(() => {
        if (plugin) {
            const newLikeItem = {...plugin}
            if (newLikeItem.is_stars) {
                newLikeItem.is_stars = false
                newLikeItem.stars = newLikeItem.stars - 1
                newLikeItem.starsCountString = thousandthConversion(newLikeItem.stars)
            } else {
                newLikeItem.is_stars = true
                newLikeItem.stars = newLikeItem.stars + 1
                newLikeItem.starsCountString = thousandthConversion(newLikeItem.stars)
            }
            setPlugin({...newLikeItem})
        }
    })
    const onCommentClick = useMemoizedFn(() => {
        yakitNotify("success", "评论~~~")
    })
    const onDownloadClick = useMemoizedFn(() => {
        if (plugin) {
            const newDownloadItem = {...plugin}
            newDownloadItem.downloaded_total = newDownloadItem.downloaded_total + 1
            newDownloadItem.downloadedTotalString = thousandthConversion(newDownloadItem.downloaded_total)
            setPlugin({...newDownloadItem})
        }
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
    const onDownload = useMemoizedFn(() => {
        const params: OnlineBackInfoProps = {allCheck, selectList, search, filter: filters, selectNum}
        onBatchDownload(params, () => {
            onCheck(false)
        })
    })
    /**转换group参数*/
    const convertGroupParam = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
        const realFilters: PluginFilterParams = {
            ...filter,
            plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
        }
        return realFilters
    }
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
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Store}})
        )
    })
    /**搜索需要清空勾选 */
    const onSearch = useMemoizedFn(() => {
        onDetailSearch(search, filters)
        setAllCheck(false)
        setSelectList([])
    })

    /**选中组 */
    const selectGroup = useMemo(() => {
        const group: YakFilterRemoteObj[] = cloneDeep(filters).plugin_group?.map((item: API.PluginsSearchData) => ({
            name: item.value,
            total: item.count
        }))
        return group || []
    }, [filters])

    if (!plugin) return null
    return (
        <PluginDetails<YakitPluginOnlineDetail>
            title='插件商店'
            pageWrapId={wrapperId}
            filterNode={
                <>
                    <PluginGroup
                        isOnline={true}
                        selectGroup={selectGroup}
                        setSelectGroup={(group) => onFilter(convertGroupParam(filters, {group}))}
                        isShowGroupMagBtn={false}
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
                    <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='online' />
                    <div style={{height: 12}} className='divider-style'></div>
                    {downloadLoading ? (
                        <LoadingOutlined className='loading-icon' />
                    ) : (
                        <Tooltip title='下载插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineClouddownloadIcon />} onClick={onDownload} />
                        </Tooltip>
                    )}
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
                loadMoreData: loadMoreData,
                classNameRow: "plugin-details-opt-wrapper",
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
                                        <OnlineExtraOperate
                                            data={plugin}
                                            isLogin={userInfo.isLogin}
                                            dispatch={dispatch}
                                            likeProps={{
                                                active: plugin.is_stars,
                                                likeNumber: plugin.starsCountString || "",
                                                onLikeClick: onLikeClick
                                            }}
                                            commentProps={{
                                                commentNumber: plugin.commentCountString || ""
                                                // onCommentClick: onCommentClick
                                            }}
                                            downloadProps={{
                                                downloadNumber: plugin.downloadedTotalString || "",
                                                onDownloadClick: onDownloadClick
                                            }}
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
                            />
                            <div className={styles["details-editor-wrapper"]}>
                                <YakitEditor type={plugin.type} value={plugin.content} readOnly={true} />
                            </div>
                        </div>
                    </TabPane>
                    <TabPane tab='评论' key='comment'>
                        <div className={styles["plugin-comment-wrapper"]}>
                            <PluginDetailHeader
                                pluginName={plugin.script_name}
                                help={plugin.help}
                                tags={plugin.tags}
                                wrapperClassName={styles["plugin-comment-detail-header"]}
                                extraNode={
                                    <div className={styles["plugin-info-extra-header"]}>
                                        <OnlineExtraOperate
                                            data={plugin}
                                            isLogin={userInfo.isLogin}
                                            dispatch={dispatch}
                                            likeProps={{
                                                active: plugin.is_stars,
                                                likeNumber: plugin.starsCountString || "",
                                                onLikeClick: onLikeClick
                                            }}
                                            commentProps={{
                                                commentNumber: plugin.commentCountString || ""
                                                // onCommentClick: onCommentClick
                                            }}
                                            downloadProps={{
                                                downloadNumber: plugin.downloadedTotalString || "",
                                                onDownloadClick: onDownloadClick
                                            }}
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
                            />
                            <PluginComment isLogin={userInfo.isLogin} plugin={{...plugin}} />
                        </div>
                    </TabPane>
                    <TabPane tab='日志' key='log'>
                        <PluginLog uuid={plugin.uuid || ""} getContainer={wrapperId} />
                    </TabPane>
                </PluginTabs>
            </div>
        </PluginDetails>
    )
}
