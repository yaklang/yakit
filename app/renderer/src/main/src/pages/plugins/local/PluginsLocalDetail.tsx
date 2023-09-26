import React, {useEffect, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem, statusTag} from "../baseTemplate"
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
import {QueryYakScriptsResponse, YakScript} from "@/pages/invoker/schema"
import {useStore} from "@/store"
import {FuncFilterPopover} from "../funcTemplate"
import {PluginGroup, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"

import "../plugins.scss"
import styles from "./PluginsLocalDetail.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

interface PluginsLocalDetailProps {
    info: YakScript
    allCheck: boolean
    loading: boolean
    onCheck: (value: boolean) => void
    selectList: string[]
    optCheck: (data: YakScript, value: boolean) => void
    data: QueryYakScriptsResponse
    onBack: () => void
    loadMoreData: () => void
}

export const PluginsLocalDetail: React.FC<PluginsLocalDetailProps> = (props) => {
    const {info, allCheck, onCheck, selectList, optCheck, data, onBack, loadMoreData, loading} = props

    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return data.Total
        else return selectList.length
    }, [allCheck, selectList])

    const [plugin, setPlugin] = useState<YakScript>()
    const userInfo = useStore((s) => s.userInfo)
    useEffect(() => {
        if (info) setPlugin({...info})
        else setPlugin(undefined)
    }, [info])

    const onRun = useMemoizedFn(() => {})
    // 返回
    const onPluginBack = useMemoizedFn(() => {
        onBack()
        setPlugin(undefined)
    })
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    const onExport = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    const onUpload = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    if (!plugin) return null
    return (
        <>
            <PluginDetails<YakScript>
                title='本地插件'
                filterNode={
                    <PluginGroup
                        checkList={selectList}
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
                total={data.Total}
                selected={selectNum}
                listProps={{
                    rowKey: "uuid",
                    data: data.Data,
                    loadMoreData: loadMoreData,
                    classNameRow: "plugin-details-opt-wrapper",
                    renderRow: (info, i) => {
                        const check = allCheck || selectList.includes(info.UUID)
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
                            />
                        )
                    },
                    page: data.Pagination.Page,
                    hasMore: data.Total !== data.Data.length,
                    loading: loading,
                    defItemHeight: 46
                }}
                onBack={onPluginBack}
            >
                <div className={styles["details-content-wrapper"]}>
                    <Tabs tabPosition='right' className='plugins-tabs'>
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
                                                            key: "remove",
                                                            label: (
                                                                <span className={styles["remove-menu-item"]}>
                                                                    <OutlineLogoutIcon
                                                                        className={
                                                                            styles["plugin-local-extra-node-icon"]
                                                                        }
                                                                    />
                                                                    <span>移出菜单栏</span>
                                                                </span>
                                                            )
                                                        }
                                                    ],
                                                    className: styles["func-filter-dropdown-menu"],
                                                    onClick: ({key}) => {
                                                        switch (key) {
                                                            default:
                                                                break
                                                        }
                                                    }
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
                                    updated_at={plugin.CreatedAt}
                                />
                                <div className={styles["details-editor-wrapper"]}>
                                    <YakitEditor type={"yak"} value={plugin.Content} />
                                </div>
                            </div>
                        </TabPane>
                        <TabPane tab='日志' key='log' disabled={true}>
                            <div>日志</div>
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
