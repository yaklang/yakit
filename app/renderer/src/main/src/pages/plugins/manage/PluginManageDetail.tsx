import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    PluginDetailHeader,
    PluginDetails,
    PluginDetailsListItem,
    PluginEditorDiff,
    PluginModifyInfo,
    PluginModifySetting,
    defaultSearch,
    statusTag
} from "../baseTemplate"
import {SolidBadgecheckIcon, SolidBanIcon} from "@/assets/icon/solid"
import {
    OutlineClouddownloadIcon,
    OutlineCursorclickIcon,
    OutlineFilterIcon,
    OutlineLightbulbIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useGetState, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {Tabs, Tooltip} from "antd"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakEditor} from "@/utils/editors"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PluginInfoRefProps, PluginSettingRefProps} from "../baseTemplateType"
import {ReasonModal} from "./PluginManage"
import {ApplicantIcon, AuthorImg, FuncBtn} from "../funcTemplate"
import {IconOutlinePencilAltIcon} from "@/assets/newIcon"
import {PluginBaseParamProps, PluginSettingParamProps} from "../pluginsType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

interface PluginManageDetailProps {
    info: API.YakitPluginDetail
    allCheck: boolean
    onCheck: (value: boolean) => any
    selectList: string[]
    optCheck: (data: API.YakitPluginDetail, value: boolean) => any
    data: API.YakitPluginListResponse
    onBack: () => any
    loadMoreData: () => any
}

export const PluginManageDetail: React.FC<PluginManageDetailProps> = (props) => {
    const {info, allCheck, onCheck, selectList, optCheck, data, onBack, loadMoreData} = props

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return data.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    const [loading, setLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()

    useEffect(() => {
        if (info) setPlugin({...info})
        else setPlugin(undefined)
    }, [info])

    // 插件基础信息-相关逻辑
    const infoRef = useRef<PluginInfoRefProps>(null)
    const [infoParams, setInfoParams, getInfoParams] = useGetState<PluginBaseParamProps>({
        name: ""
    })
    // 获取基础信息组件内容
    const fetchInfoData = useMemoizedFn(() => {
        if (infoRef.current) {
            return infoRef.current.onGetValue()
        }
        return undefined
    })
    // DNSLog和HTTP数据包变形开关实质改变插件的tag
    const onTagsCallback = useMemoizedFn(() => {
        setInfoParams({...(fetchInfoData() || getInfoParams())})
    })
    // 插件配置信息-相关逻辑
    const settingRef = useRef<PluginSettingRefProps>(null)
    const [settingParams, setSettingParams, getSettingParams] = useGetState<PluginSettingParamProps>({
        params: [],
        content: ""
    })
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
    // 返回
    const onPluginBack = useMemoizedFn(() => {
        onBack()
        setPlugin(undefined)
    })
    const optExtra = useMemoizedFn((data: API.YakitPluginDetail) => {
        return statusTag[`${data.status}`]
    })
    if (!plugin) return null

    return (
        <PluginDetails<API.YakitPluginDetail>
            title='插件管理'
            filterExtra={
                <div className={"details-filter-extra-wrapper"}>
                    <YakitButton
                        type='text2'
                        icon={<OutlineFilterIcon />}
                        onClick={() => setShowReason({visible: true, type: "del"})}
                    />
                    <div style={{height: 12}} className='divider-style'></div>
                    <Tooltip title='下载插件' overlayClassName='plugins-tooltip'>
                        <YakitButton
                            type='text2'
                            icon={<OutlineClouddownloadIcon />}
                            onClick={() => setShowReason({visible: true, type: "del"})}
                        />
                    </Tooltip>
                    <div style={{height: 12}} className='divider-style'></div>
                    <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                        <YakitButton
                            type='text2'
                            icon={<OutlineTrashIcon />}
                            onClick={() => setShowReason({visible: true, type: "del"})}
                        />
                    </Tooltip>
                </div>
            }
            checked={allCheck}
            onCheck={onCheck}
            total={data.pagemeta.total}
            selected={selectNum}
            listProps={{
                rowKey: "uuid",
                data: data.data,
                loadMoreData: loadMoreData,
                classNameRow: "plugin-details-opt-wrapper",
                renderRow: (info, i) => {
                    const check = allCheck || selectList.includes(info.uuid)
                    return (
                        <PluginDetailsListItem<API.YakitPluginDetail>
                            plugin={info}
                            selectUUId={plugin.uuid}
                            check={check}
                            headImg={info.head_img}
                            pluginUUId={info.uuid}
                            pluginName={info.script_name}
                            help={info.help}
                            content={info.content}
                            optCheck={optCheck}
                            extra={optExtra}
                            official={info.official}
                            // isCorePlugin={info.is_core_plugin}
                            isCorePlugin={false}
                            pluginType={info.type}
                            onPluginClick={() => {}}
                        />
                    )
                },
                page: data.pagemeta.page,
                hasMore: data.pagemeta.total !== data.data.length,
                loading: loading,
                defItemHeight: 46
            }}
            onBack={onPluginBack}
            search={cloneDeep(defaultSearch)}
            setSearch={() => {}}
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
                                        {true && (
                                            <>
                                                <YakitButton
                                                    type='text2'
                                                    icon={<IconOutlinePencilAltIcon />}
                                                    onClick={() => setShowReason({visible: true, type: "del"})}
                                                />
                                                <div style={{height: 12}} className='divider-style'></div>
                                            </>
                                        )}
                                        <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                                            <YakitButton
                                                type='text2'
                                                icon={<OutlineTrashIcon />}
                                                onClick={() => setShowReason({visible: true, type: "del"})}
                                            />
                                        </Tooltip>

                                        {false && (
                                            <>
                                                <FuncBtn
                                                    maxWidth={1100}
                                                    type='outline1'
                                                    colors='danger'
                                                    icon={<SolidBanIcon />}
                                                    name={"不通过"}
                                                    onClick={() => setShowReason({visible: true, type: "nopass"})}
                                                />
                                                <FuncBtn
                                                    maxWidth={1100}
                                                    colors='success'
                                                    icon={<SolidBadgecheckIcon />}
                                                    name={"通过"}
                                                    onClick={onPass}
                                                />
                                            </>
                                        )}
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

                            {false ? (
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
                                            kind='bug'
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
                                                tags={infoParams.tags || []}
                                                setTags={(value) => setInfoParams({...getInfoParams(), tags: value})}
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
                setVisible={() => setShowReason({visible: false, type: ""})}
                type={showReason.type}
                onOK={() => {}}
            />
        </PluginDetails>
    )
}
