import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    PluginDetailHeader,
    PluginDetails,
    PluginEditorDiff,
    PluginModifyInfo,
    PluginModifySetting,
    statusTag
} from "../baseTemplate"
import {SolidBadgecheckIcon, SolidBanIcon} from "@/assets/icon/solid"
import {
    OutlineCursorclickIcon,
    OutlineLightbulbIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {PluginListPageMeta} from "../pluginsType"
import {useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {Tabs, Tooltip} from "antd"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakEditor} from "@/utils/editors"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginInfoRefProps, PluginSettingRefProps} from "../baseTemplateType"
import {ReasonModal} from "./PluginManage"
import {ApplicantIcon, AuthorImg} from "../funcTemplate"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

interface PluginManageDetailProps {
    info: API.YakitPluginDetail
    allCheck: boolean
    onCheck: (value: boolean) => any
    data: API.YakitPluginListResponse
    selected: number
    onBack: () => any
}

export const PluginManageDetail: React.FC<PluginManageDetailProps> = (props) => {
    const {info, allCheck, onCheck, data, selected, onBack} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()

    useEffect(() => {
        if (info) setPlugin({...info})
        else setPlugin(undefined)
    }, [info])

    const pluginInfoTags = useMemo(() => {
        let arr: string[] = []
        try {
            arr = JSON.parse(plugin?.tags || "") || []
        } catch (error) {}
        return arr
    }, [plugin])

    const infoRef = useRef<PluginInfoRefProps>(null)
    // 获取基础信息组件内容
    const fetchInfoData = useMemoizedFn(() => {
        if (infoRef.current) {
            return infoRef.current.onGetValue()
        }
        return undefined
    })
    const settingRef = useRef<PluginSettingRefProps>(null)
    // 获取配置信息组件内容
    const fetchSettingData = useMemoizedFn(() => {
        if (settingRef.current) {
            return settingRef.current.onGetValue()
        }
        return undefined
    })

    // 原因窗口
    const [showReason, setShowReason] = useState<{visible: boolean; type: string}>({visible: false, type: "nopass"})

    const onDel = useMemoizedFn(() => {
        setShowReason({visible: true, type: "del"})
    })
    const onNoPass = useMemoizedFn(() => {})
    const onPass = useMemoizedFn(() => {})
    const onRun = useMemoizedFn(() => {})

    if (!plugin) return null

    return (
        <PluginDetails<API.YakitPluginDetail>
            title='插件管理'
            checked={allCheck}
            onCheck={onCheck}
            total={data.pagemeta.total}
            selected={selected}
            listProps={{
                rowKey: "uuid",
                data: data.data,
                loadMoreData: () => {},
                classNameRow: styles["details-opt-wrapper"],
                renderRow: (info, i) => {
                    return (
                        <div
                            className={classNames(styles["details-wrapper-item-opt"], {
                                [styles["details-wrapper-item-opt-active"]]: plugin.uuid === info.uuid
                            })}
                        >
                            <div className={styles["opt-wrapper"]}>
                                <div className={styles["opt-info"]}>
                                    <YakitCheckbox />
                                    <AuthorImg src={info.head_img || ""} />
                                    <div
                                        className={classNames(styles["text-style"], "yakit-content-single-ellipsis")}
                                        title={info.script_name}
                                    >
                                        {info.script_name}
                                    </div>
                                </div>
                                <div className={styles["opt-show"]}>
                                    {statusTag[`${i % 3}`]}
                                    <Tooltip
                                        title={info.help || "No Description about it."}
                                        placement='topRight'
                                        overlayClassName='plugins-tooltip'
                                    >
                                        <OutlineQuestionmarkcircleIcon className={styles["icon-style"]} />
                                    </Tooltip>
                                    <YakitPopover
                                        placement='topRight'
                                        overlayClassName={styles["terminal-popover"]}
                                        content={<YakEditor type={"yak"} value={info.content} readOnly={true} />}
                                    >
                                        <OutlineTerminalIcon className={styles["icon-style"]} />
                                    </YakitPopover>
                                </div>
                            </div>
                        </div>
                    )
                },
                page: data.pagemeta.page,
                hasMore: data.pagemeta.total !== data.data.length,
                loading: loading,
                defItemHeight: 46
            }}
            onBack={() => {
                onBack()
                setPlugin(undefined)
            }}
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
                                        <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                                            <YakitButton
                                                type='text2'
                                                icon={<OutlineTrashIcon />}
                                                onClick={() => setShowReason({visible: true, type: "del"})}
                                            />
                                        </Tooltip>

                                        <YakitButton
                                            className={styles["btn-style"]}
                                            type='outline1'
                                            colors='danger'
                                            onClick={() => setShowReason({visible: true, type: "nopass"})}
                                        >
                                            <SolidBanIcon />
                                            不通过
                                        </YakitButton>
                                        <Tooltip title='不通过' overlayClassName='plugins-tooltip'>
                                            <YakitButton
                                                className={styles["btn-icon"]}
                                                type='outline1'
                                                colors='danger'
                                                icon={<SolidBanIcon />}
                                                onClick={() => setShowReason({visible: true, type: "nopass"})}
                                            />
                                        </Tooltip>

                                        <YakitButton className={styles["btn-style"]} colors='success' onClick={onPass}>
                                            <SolidBadgecheckIcon />
                                            通过
                                        </YakitButton>
                                        <Tooltip title='通过' overlayClassName='plugins-tooltip'>
                                            <YakitButton
                                                className={styles["btn-icon"]}
                                                colors='success'
                                                icon={<SolidBadgecheckIcon />}
                                                onClick={onPass}
                                            />
                                        </Tooltip>

                                        <YakitButton className={styles["btn-style"]} onClick={onRun}>
                                            <OutlineCursorclickIcon />
                                            去使用
                                        </YakitButton>
                                        <Tooltip title='去使用' overlayClassName='plugins-tooltip'>
                                            <YakitButton
                                                className={styles["btn-icon"]}
                                                icon={<OutlineCursorclickIcon />}
                                                onClick={onRun}
                                            />
                                        </Tooltip>
                                    </div>
                                }
                                img={plugin.head_img}
                                user={plugin.authors}
                                pluginId={plugin.uuid}
                                updated_at={plugin.updated_at}
                            />

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
                                                <AuthorImg src={plugin.head_img} />
                                                {plugin.authors}
                                                <ApplicantIcon />
                                            </div>
                                        </div>
                                    </div>
                                    <PluginModifyInfo ref={infoRef} kind='bug' />
                                </div>

                                <div className={styles["plugin-setting-info"]}>
                                    <div className={styles["setting-header"]}>插件配置</div>
                                    <div className={styles["setting-body"]}>
                                        <PluginModifySetting type='yak' tags={[]} setTags={() => {}} />
                                        <PluginEditorDiff />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabPane>
                    <TabPane tab='日 志' key='log'>
                        <div></div>
                    </TabPane>
                </Tabs>
            </div>

            <ReasonModal
                visible={showReason.visible}
                setVisible={() => setShowReason({visible: false, type: ""})}
                type={showReason.type}
                onOK={() => {}}
            />
        </PluginDetails>
    )
}
