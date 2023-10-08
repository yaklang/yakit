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
import {FuncBtn, FuncFilterPopover, OnlineExtraOperate} from "../funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {yakitNotify} from "@/utils/notification"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {MePluginType, OnlineUserExtraOperate, mePluginTypeList} from "./PluginUser"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "bizcharts/lib/utils/cloneDeep"
import {PluginUserDetailProps} from "./PluginUserType"
import {PrivatePluginIcon} from "@/assets/newIcon"

import "../plugins.scss"
import styles from "./PluginUserDetail.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

export const PluginUserDetail: React.FC<PluginUserDetailProps> = (props) => {
    const {info, defaultAllCheck, defaultSelectList, response, onBack, loadMoreData, defaultSearchValue, dispatch} =
        props
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()
    const [selectList, setSelectList] = useState<string[]>(defaultSelectList)
    const [loading, setLoading] = useState<boolean>(false)
    const [recalculation, setRecalculation] = useState<boolean>(false) // 更新item后刷新虚拟列表

    const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    useEffect(() => {
        if (info) setPlugin({...info})
        else setPlugin(undefined)
    }, [info])

    const onRun = useMemoizedFn(() => {})
    // 返回
    const onPluginBack = useMemoizedFn(() => {
        onBack({
            search,
            selectList,
            allCheck
        })
        setPlugin(undefined)
    })

    const onUserDetailSelect = useMemoizedFn((key) => {
        switch (key) {
            case "share":
                yakitNotify("success", "分享~~~")
                break
            case "download":
                yakitNotify("success", "下载~~~")
                break
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
        const editPlugin = {...plugin, is_private: !plugin.is_private, status: plugin.is_private ? 0 : plugin.status}

        setPlugin({
            ...editPlugin
        })
        dispatch({
            type: "update",
            payload: {
                item: {
                    ...editPlugin
                }
            }
        })
        setRecalculation(!recalculation)
    })
    const onRemove = useMemoizedFn(() => {
        if (!plugin) return
        const removePlugin = {...plugin}
        if (response.data.length === 1) {
            // 如果删除是最后一个，就回到列表中得空页面
            onPluginBack()
        } else {
            const index = response.data.findIndex((ele) => ele.uuid === removePlugin.uuid)

            if (index === -1) return
            if (index === Number(response.pagemeta.total) - 1) {
                // 选中得item为最后一个，删除后选中倒数第二个
                setPlugin({
                    ...response.data[index - 1]
                })
            } else {
                //选择下一个
                setPlugin({
                    ...response.data[index + 1]
                })
            }
        }
        dispatch({
            type: "remove",
            payload: {
                item: removePlugin
            }
        })
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
        if (data.is_private) {
            console.log("data", data)
        }
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
    const onPluginClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        setPlugin({...data})
    })
    if (!plugin) return null
    return (
        <>
            <PluginDetails<YakitPluginOnlineDetail>
                title='我的云端插件'
                filterExtra={
                    <div className={"details-filter-extra-wrapper"}>
                        <YakitButton type='text2' icon={<OutlineFilterIcon />} />
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='下载插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineClouddownloadIcon />} />
                        </Tooltip>
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineTrashIcon />} />
                        </Tooltip>
                        <div style={{height: 12}} className='divider-style'></div>
                        <YakitButton type='text'>新建插件</YakitButton>
                    </div>
                }
                checked={allCheck}
                onCheck={onCheck}
                total={response.pagemeta.total}
                selected={selectNum}
                listProps={{
                    rowKey: "uuid",
                    data: response.data,
                    loadMoreData: onLoadMoreData,
                    classNameRow: "plugin-details-opt-wrapper",
                    recalculation,
                    renderRow: (info, i) => {
                        const check = allCheck || selectList.includes(info.uuid)
                        return (
                            <PluginDetailsListItem<YakitPluginOnlineDetail>
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
                                extra={optExtra}
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
                                            <OnlineUserExtraOperate plugin={plugin} onSelect={onUserDetailSelect} />
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
                                />
                                <div className={styles["details-editor-wrapper"]}>
                                    <YakitEditor type={"yak"} value={plugin.content} />
                                </div>
                            </div>
                        </TabPane>
                        <TabPane tab='日志' key='log' disabled={true}>
                            <div>日志</div>
                        </TabPane>
                    </Tabs>
                </div>
            </PluginDetails>
        </>
    )
}
