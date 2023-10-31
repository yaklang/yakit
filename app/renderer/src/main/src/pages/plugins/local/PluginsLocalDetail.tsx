import React, {useEffect, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem} from "../baseTemplate"
import {
    OutlineClouduploadIcon,
    OutlineDotshorizontalIcon,
    OutlineExportIcon,
    OutlineFilterIcon,
    OutlineLogoutIcon,
    OutlinePencilaltIcon,
    OutlinePluscircleIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {Tabs, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakScript} from "@/pages/invoker/schema"
import {useStore} from "@/store"
import {FuncFilterPopover} from "../funcTemplate"
import {PluginGroup, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {cloneDeep} from "bizcharts/lib/utils"
import {PluginSearchParams} from "../baseTemplateType"
import {PluginsLocalDetailProps, RemoveMenuModalContentProps} from "./PluginsLocalType"
import {yakitNotify} from "@/utils/notification"
import {YakitPluginOnlineJournal} from "@/pages/yakitStore/YakitPluginOnlineJournal/YakitPluginOnlineJournal"
import {executeYakScriptByParams} from "@/pages/invoker/YakScriptCreator"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {AddToMenuActionForm} from "@/pages/yakitStore/PluginOperator"
import {isCommunityEdition} from "@/utils/envfile"
import {CodeGV} from "@/yakitGV"
import {getRemoteValue} from "@/utils/kv"

import "../plugins.scss"
import styles from "./PluginsLocalDetail.module.scss"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

export const PluginsLocalDetail: React.FC<PluginsLocalDetailProps> = (props) => {
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
        dispatch,
        onRemovePluginDetailSingleBefore,
        onDetailExport
    } = props

    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
    const [selectList, setSelectList] = useState<YakScript[]>(defaultSelectList)
    const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList])

    const [plugin, setPlugin] = useState<YakScript>()
    const userInfo = useStore((s) => s.userInfo)
    useEffect(() => {
        if (info) setPlugin({...info})
        else setPlugin(undefined)
    }, [info])

    // 返回
    const onPluginBack = useMemoizedFn(() => {
        onBack({
            search,
            selectList,
            allCheck
        })
        setPlugin(undefined)
    })
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!plugin) return
        onRemovePluginDetailSingleBefore(plugin)
    })
    const onExport = useMemoizedFn(() => {
        if (!plugin) return
        onDetailExport([plugin.Id])
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    const onUpload = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    const onPluginClick = useMemoizedFn((data: YakScript) => {
        setPlugin({...data})
    })
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        try {
            // 全选情况时的取消勾选
            if (allCheck) {
                setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
                setAllCheck(false)
                return
            }
            // 单项勾选回调
            if (value) setSelectList([...selectList, data])
            else setSelectList(selectList.filter((item) => item.ScriptName !== data.ScriptName))
        } catch (error) {
            yakitNotify("error", "勾选失败:" + error)
        }
    })
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllCheck(value)
    })
    const checkList = useMemo(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])
    const onMenuSelect = useMemoizedFn(({key}) => {
        switch (key) {
            case "share":
                onExport()
                break
            case "local-debugging":
                onLocalDebugging()
                break
            case "add-to-menu":
                onAddToMenu()
                break
            case "remove-menu":
                onRemoveMenu()
                break
            default:
                break
        }
    })
    /**调试 */
    const onLocalDebugging = useMemoizedFn(() => {
        if (!plugin) return
        executeYakScriptByParams(plugin, true)
    })
    /**添加到菜单栏 */
    const onAddToMenu = useMemoizedFn(() => {
        if (!plugin) return
        const m = showYakitModal({
            title: `添加到菜单栏中[${plugin.Id}]`,
            content: <AddToMenuActionForm visible={true} setVisible={() => m.destroy()} script={plugin} />,
            onCancel: () => {
                m.destroy()
            },
            footer: null
        })
    })
    /**移出菜单 移出前需要先判断该插件是否有一级菜单 */
    const onRemoveMenu = useMemoizedFn(() => {
        if (!plugin) return
        getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            ipcRenderer
                .invoke("QueryNavigationGroups", {
                    YakScriptName: plugin.ScriptName,
                    Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : menuMode
                })
                .then((data: {Groups: string[]}) => {
                    const list = data.Groups || []
                    if (list.length === 0) {
                        yakitNotify("info", "该插件暂未添加到菜单栏")
                    } else {
                        const m = showYakitModal({
                            title: "移除菜单栏",
                            content: (
                                <RemoveMenuModalContent pluginName={plugin.ScriptName} onCancel={() => m.destroy()} />
                            ),
                            onCancel: () => {
                                m.destroy()
                            },
                            footer: null
                        })
                    }
                })
                .catch((e: any) => {
                    yakitNotify("error", "获取菜单失败：" + e)
                })
        })
    })
    if (!plugin) return null
    return (
        <>
            <PluginDetails<YakScript>
                title='本地插件'
                filterNode={
                    <PluginGroup
                        checkList={checkList}
                        selectGroup={selectGroup}
                        setSelectGroup={setSelectGroup}
                        isSelectAll={allCheck}
                    />
                }
                filterExtra={
                    <div className={"details-filter-extra-wrapper"}>
                        <YakitButton type='text2' icon={<OutlineFilterIcon />} />
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='上传插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineExportIcon />} />
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
                total={response.Total}
                selected={selectNum}
                listProps={{
                    rowKey: "uuid",
                    data: response.Data,
                    loadMoreData: loadMoreData,
                    classNameRow: "plugin-details-opt-wrapper",
                    renderRow: (info, i) => {
                        const check = allCheck || checkList.includes(info.ScriptName)
                        return (
                            <PluginDetailsListItem<YakScript>
                                plugin={info}
                                selectUUId={plugin.UUID}
                                check={check}
                                headImg={info.HeadImg || ""}
                                pluginUUId={info.UUID}
                                pluginName={info.ScriptName}
                                help={info.Help}
                                content={info.Content}
                                optCheck={optCheck}
                                official={!!info.OnlineOfficial}
                                // isCorePlugin={info.is_core_plugin}
                                isCorePlugin={false}
                                pluginType={info.Type}
                                onPluginClick={onPluginClick}
                            />
                        )
                    },
                    page: response.Pagination.Page,
                    hasMore: response.Total !== response.Data.length,
                    loading: loading,
                    defItemHeight: 46
                }}
                onBack={onPluginBack}
                search={search}
                setSearch={setSearch}
                onSearch={() => {}}
            >
                <div className={styles["details-content-wrapper"]}>
                    <Tabs defaultActiveKey='code' tabPosition='right' className='plugins-tabs'>
                        <TabPane tab='执行' key='execute'>
                            <div className={styles["plugin-info-wrapper"]}>执行</div>
                        </TabPane>
                        <TabPane tab='源 码' key='code'>
                            <div className={styles["plugin-info-wrapper"]}>
                                <PluginDetailHeader
                                    pluginName={plugin.ScriptName}
                                    help={plugin.Help}
                                    tags={plugin.Tags}
                                    extraNode={
                                        <div className={styles["plugin-info-extra-header"]}>
                                            <YakitButton type='text2' icon={<OutlineTrashIcon onClick={onRemove} />} />
                                            <div className='divider-style' />
                                            <YakitButton
                                                type='text2'
                                                icon={<OutlinePencilaltIcon onClick={onEdit} />}
                                            />
                                            <div className='divider-style' />
                                            <FuncFilterPopover
                                                icon={<OutlineDotshorizontalIcon />}
                                                menu={{
                                                    type: "primary",
                                                    data: [
                                                        {
                                                            key: "share",
                                                            label: "导出",
                                                            itemIcon: (
                                                                <OutlineExportIcon
                                                                    className={styles["plugin-local-extra-node-icon"]}
                                                                />
                                                            )
                                                        },
                                                        {
                                                            key: "local-debugging",
                                                            label: "本地调试",
                                                            itemIcon: (
                                                                <OutlineTerminalIcon
                                                                    className={styles["plugin-local-extra-node-icon"]}
                                                                />
                                                            )
                                                        },
                                                        {
                                                            key: "add-to-menu",
                                                            label: "添加到菜单栏",
                                                            itemIcon: (
                                                                <OutlinePluscircleIcon
                                                                    className={styles["plugin-local-extra-node-icon"]}
                                                                />
                                                            )
                                                        },
                                                        {type: "divider"},
                                                        {
                                                            key: "remove-menu",
                                                            itemIcon: (
                                                                <OutlineLogoutIcon
                                                                    className={styles["plugin-local-extra-node-icon"]}
                                                                />
                                                            ),
                                                            label: "移出菜单栏",
                                                            type: "danger"
                                                        }
                                                    ],
                                                    className: styles["func-filter-dropdown-menu"],
                                                    onClick: onMenuSelect
                                                }}
                                                button={{type: "text2"}}
                                                placement='bottomRight'
                                            />
                                            {userInfo.user_id === plugin.UserId && (
                                                <>
                                                    <div className='divider-style' />
                                                    <YakitButton
                                                        icon={<OutlineClouduploadIcon />}
                                                        onClick={onUpload}
                                                        className={styles["cloud-upload-icon"]}
                                                    >
                                                        上传
                                                    </YakitButton>
                                                </>
                                            )}
                                        </div>
                                    }
                                    img={plugin.HeadImg || ""}
                                    user={plugin.Author}
                                    pluginId={plugin.UUID}
                                    updated_at={plugin.UpdatedAt || 0}
                                />
                                <div className={styles["details-editor-wrapper"]}>
                                    <YakitEditor type={"yak"} value={plugin.Content} />
                                </div>
                            </div>
                        </TabPane>
                        <TabPane tab='日志' key='log'>
                            <div className={styles["plugin-log-wrapper"]}>
                                <YakitPluginOnlineJournal pluginId={plugin.OnlineId} />
                            </div>
                        </TabPane>
                        <TabPane tab='问题反馈' key='feedback' disabled={true}>
                            <div>问题反馈</div>
                        </TabPane>
                    </Tabs>
                </div>
            </PluginDetails>
        </>
    )
}

const RemoveMenuModalContent: React.FC<RemoveMenuModalContentProps> = React.memo((props) => {
    const {pluginName, onCancel} = props
    const [groups, setGroups] = useState<string[]>([])
    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")
    useEffect(() => {
        updateGroups()
    }, [])
    const updateGroups = () => {
        getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            setPatternMenu(menuMode)
            if (!pluginName) return
            ipcRenderer
                .invoke("QueryNavigationGroups", {
                    YakScriptName: pluginName,
                    Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : menuMode
                })
                .then((data: {Groups: string[]}) => {
                    const list = data.Groups || []
                    if (list.length === 0) {
                        onCancel()
                    }
                    setGroups(list)
                })
                .catch((e: any) => {
                    yakitNotify("error", "获取菜单失败：" + e)
                })
                .finally()
        })
    }
    const onClickRemove = useMemoizedFn((element: string) => {
        ipcRenderer
            .invoke("DeleteAllNavigation", {
                YakScriptName: pluginName,
                Group: element,
                Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : patternMenu
            })
            .then(() => {
                if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                else ipcRenderer.invoke("change-main-menu")
                updateGroups()
            })
            .catch((e: any) => {
                yakitNotify("error", "移除菜单失败：" + e)
            })
    })
    return (
        <div className={styles["remove-menu-body"]}>
            {groups.map((element) => {
                return (
                    <YakitButton type='outline2' key={element} onClick={() => onClickRemove(element)}>
                        从 {element} 中移除
                    </YakitButton>
                )
            }) || "暂无数据"}
        </div>
    )
})