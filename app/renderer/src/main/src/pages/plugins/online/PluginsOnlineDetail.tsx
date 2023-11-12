import React, {useEffect, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem} from "../baseTemplate"
import {OutlineClouddownloadIcon, OutlineCursorclickIcon, OutlineFilterIcon} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import {Tabs, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {FilterPopoverBtn, FuncBtn, OnlineExtraOperate} from "../funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {yakitNotify} from "@/utils/notification"
import {OnlineBackInfoProps, PluginsOnlineDetailProps, YakitPluginOnlineDetail} from "./PluginsOnlineType"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "bizcharts/lib/utils/cloneDeep"
import {OnlinePluginAppAction, thousandthConversion} from "../pluginReducer"
import {useStore} from "@/store"
import {PluginComment} from "@/pages/yakitStore/YakitPluginInfoOnline/YakitPluginInfoOnline"
import {YakitPluginOnlineJournal} from "@/pages/yakitStore/YakitPluginOnlineJournal/YakitPluginOnlineJournal"
import {LoadingOutlined} from "@ant-design/icons"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"

import "../plugins.scss"
import styles from "./PluginsOnlineDetail.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

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
        spinLoading
    } = props
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
    const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)
    const [selectList, setSelectList] = useState<string[]>(defaultSelectList)
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))

    const userInfo = useStore((s) => s.userInfo)

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()

    useEffect(() => {
        if (info) setPlugin({...info})
        else setPlugin(undefined)
    }, [info])

    const onRun = useMemoizedFn(() => {})
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
        if (value) setSelectList([])
        setAllCheck(value)
    })
    const onPluginClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        setPlugin({...data})
    })
    const onDownload = useMemoizedFn(() => {
        const params: OnlineBackInfoProps = {allCheck, selectList, search, filter: filters, selectNum}
        onBatchDownload(params)
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
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Store}})
        )
    })
    /**搜索需要清空勾选 */
    const onSearch = useMemoizedFn(() => {
        onDetailSearch(search, filters)
        setAllCheck(false)
        setSelectList([])
    })
    if (!plugin) return null
    return (
        <PluginDetails<YakitPluginOnlineDetail>
            title='插件商店'
            filterExtra={
                <div className={"details-filter-extra-wrapper"}>
                    <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='online' />
                    <div style={{height: 12}} className='divider-style'></div>
                    {downloadLoading ? (
                        <YakitButton type='text2' icon={<LoadingOutlined />} />
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
                            // isCorePlugin={info.is_core_plugin}
                            isCorePlugin={false}
                            pluginType={info.type}
                            onPluginClick={onPluginClick}
                        />
                    )
                },
                page: response.pagemeta.page,
                hasMore: response.pagemeta.total !== response.data.length,
                loading: loading,
                defItemHeight: 46
            }}
            onBack={onPluginBack}
            search={search}
            setSearch={setSearch}
            onSearch={onSearch}
            spinLoading={spinLoading}
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
                                            onClick={onRun}
                                        />
                                    </div>
                                }
                                img={plugin.head_img}
                                user={plugin.authors}
                                pluginId={plugin.uuid}
                                updated_at={plugin.updated_at}
                                prImgs={[]}
                            />
                            <div className={styles["details-editor-wrapper"]}>
                                <YakitEditor type={"yak"} value={plugin.content} />
                            </div>
                        </div>
                    </TabPane>
                    <TabPane tab='评论' key='comment'>
                        <div className={styles["plugin-comment-wrapper"]} id='online-plugin-info-scroll'>
                            <PluginComment isLogin={userInfo.isLogin} plugin={{...plugin, default_open: false}} />
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
    )
}
