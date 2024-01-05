import React, {ReactNode, memo, useEffect, useRef, useState} from "react"
import {Anchor, Radio} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineAdjustmentsIcon,
    OutlineArrowsexpandIcon,
    OutlineBugIcon,
    OutlineChevronrightIcon,
    OutlineIdentificationIcon,
    OutlineLightbulbIcon,
    OutlineSmviewgridaddIcon,
    OutlineViewgridIcon
} from "@/assets/icon/outline"
import {
    PluginBaseParamProps,
    PluginDataProps,
    PluginParamDataProps,
    PluginSettingParamProps,
    PluginTypeParamProps,
    YakParamProps
} from "../pluginsType"
import {useGetState, useMemoizedFn} from "ahooks"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginInfoRefProps, PluginSettingRefProps} from "../baseTemplateType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ApplicantIcon, AuthorImg, FuncBtn} from "../funcTemplate"
import {convertRemoteToLocalParams, convertRemoteToRemoteInfo} from "./utils"
import {PortScanPluginParams} from "./builtInData"
import {PluginModifyInfo, PluginModifySetting} from "../baseTemplate"
import {toolDelInvalidKV} from "@/utils/tool"
import {DefaultTypeList, PluginGV, pluginTypeToName} from "../builtInData"
import {PluginDiffEditorModal} from "./PluginEditDetails"
import {apiFetchPluginDetailCheck} from "../utils"
import {API} from "@/services/swagger/resposeType"

import "../plugins.scss"
import styles from "./pluginEditDetails.module.scss"
import classNames from "classnames"
import {SolidBadgecheckIcon, SolidBanIcon} from "@/assets/icon/solid"

const {Link} = Anchor

const {ipcRenderer} = window.require("electron")

/** @name 类型选择-插件类型选项信息 */
const DefaultKindList: {icon: ReactNode; name: string; key: string}[] = [
    {icon: <OutlineBugIcon />, name: "漏洞类", key: "bug"},
    {icon: <OutlineSmviewgridaddIcon />, name: "其他", key: "other"}
]

interface PluginLogDetailProps {
    pluginUUId: string
    logId: number
}

export const PluginLogDetail: React.FC<PluginLogDetailProps> = (props) => {
    const {pluginUUId, logId} = props

    const [loading, setLoading] = useState<boolean>(false)
    // 编辑时的旧数据
    const [plugin, setPlugin] = useState<API.PluginsAuditDetailResponse>()
    // 申请人信息
    const [apply, setApply] = useState<{name: string; img: string; description: string}>()

    // 通过ID获取插件旧数据
    const fetchPluginInfo = useMemoizedFn((uuid: string, log: number) => {
        if (loading) return

        setLoading(true)
        apiFetchPluginDetailCheck({uuid: uuid, list_type: "log", up_log_id: log})
            .then((res) => {
                if (res) {
                    // 所有信息
                    setPlugin({...res})
                    // 申请人信息
                    if (res.apply_user_name && res.apply_user_head_img) {
                        setApply({
                            name: res.apply_user_name || "",
                            img: res.apply_user_head_img || "",
                            description: res.logDescription || ""
                        })
                    }
                    // 基础信息
                    let infoData: PluginBaseParamProps = {
                        ScriptName: res.script_name,
                        Help: res.help,
                        RiskType: res.riskType,
                        RiskDetail: {
                            CWEId: res.riskDetail?.cweId || "",
                            RiskType: res.riskDetail?.riskType || "",
                            Description: res.riskDetail?.description || "",
                            CWESolution: res.riskDetail?.solution || ""
                        },
                        RiskAnnotation: res.risk_annotation,
                        Tags: []
                    }
                    try {
                        infoData.Tags = (res.tags || "").split(",") || []
                    } catch (error) {}
                    if (!infoData.RiskType) {
                        infoData.RiskType = undefined
                        infoData.RiskDetail = undefined
                        infoData.RiskAnnotation = undefined
                    }
                    setInfoParams({...infoData})
                    setCacheTags(infoData?.Tags || [])
                    // 配置信息
                    let settingData: PluginSettingParamProps = {
                        Params: convertRemoteToLocalParams(res.params || []).map((item) => {
                            const obj: PluginParamDataProps = {
                                ...item,
                                ExtraSetting: item.ExtraSetting ? JSON.parse(item.ExtraSetting) : undefined
                            }
                            return obj
                        }),
                        EnablePluginSelector: !!res.enable_plugin_selector,
                        PluginSelectorTypes: res.plugin_selector_types,
                        Content: res.content || ""
                    }
                    setSettingParams({...settingData})
                    // 新旧源码
                    setNewCode(res.content)
                    if (res.merge_before_plugins) setOldCode(res.merge_before_plugins.content || "")

                    // 初始时默认展示第二部分
                    setTimeout(() => {
                        setPath("info")
                        document.querySelector("#plugin-details-info")?.scrollIntoView(true)
                    }, 500)
                }
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    useEffect(() => {
        if (pluginUUId && logId) {
            fetchPluginInfo(pluginUUId, logId)
        }
    }, [pluginUUId, logId])

    /** ---------- 页面可见数据操作逻辑块 start ---------- */
    // 页面分块步骤式展示-相关逻辑
    const [path, setPath] = useState<"type" | "info" | "setting">("type")
    const bodyRef = useRef<HTMLDivElement>(null)
    // 各信息块切换事件
    const onViewChange = useMemoizedFn((value: string) => {
        switch (value) {
            case "#plugin-details-info":
                setPath("info")
                return
            case "#plugin-details-setting":
                setPath("setting")
                return

            default:
                setPath("type")
                return
        }
    })

    // 插件类型信息-相关逻辑
    const [typeParams, setTypeParams, getTypeParams] = useGetState<PluginTypeParamProps>({
        Type: "yak",
        Kind: "bug"
    })
    const onType = useMemoizedFn((value: string) => {
        let typeData: PluginTypeParamProps = {...getTypeParams()}
        if (typeData.Type === value) return
        typeData = {...typeData, Type: value}

        // 不同类型对应的基础信息和配置信息的重置
        let infoData: PluginBaseParamProps = {...(fetchInfoData() || getInfoParams())}
        let settingData: PluginSettingParamProps = {...(fetchSettingData() || getSettingParams())}

        if (value === "codec") {
            typeData = {Type: value, Kind: "other"}
            // codec脚本类型 没有 漏洞种类类型
            infoData = {
                ...infoData,
                RiskType: undefined,
                RiskDetail: undefined,
                RiskAnnotation: undefined
            }
        }
        // 切换脚本类型时, 删除DNSLog和HTTP数据包变形代表的tag字段
        infoData = {
            ...infoData,
            Tags: infoData.Tags?.filter((item) => {
                return item !== PluginGV.PluginYakDNSLogSwitch && item !== PluginGV.PluginCodecHttpSwitch
            })
        }
        // 插件类型为port-scan时，填充两个内置参数配置(内置参数信息在变量 PortScanPluginParams)
        if (value === "port-scan") {
            const targetLen = (settingData.Params || []).filter((item) => item.Field === "target").length
            const portLen = (settingData.Params || []).filter((item) => item.Field === "ports").length
            const baseArr: PluginParamDataProps[] = []
            if (targetLen === 0) baseArr.push(PortScanPluginParams["target"])
            if (portLen === 0) baseArr.push(PortScanPluginParams["ports"])

            settingData = {
                ...settingData,
                Params: baseArr.concat(settingData.Params || [])
            }
        } else {
            settingData = {...settingData}
        }

        setTypeParams({...typeData})
        // 不同类型对应的不同默认源码
        setNewCode("")
        setInfoParams({...infoData})
        setSettingParams({...settingData})
    })
    const onKind = useMemoizedFn((value: string) => {
        if (typeParams.Kind === value) return
        setTypeParams({...typeParams, Kind: value})
    })
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
    const [cacheTags, setCacheTags] = useState<string[]>()
    // 删除某些tag 触发  DNSLog和HTTP数据包变形开关的改变
    const onTagsCallback = useMemoizedFn(() => {
        setCacheTags({...fetchInfoData()}?.Tags || [])
    })
    // DNSLog和HTTP数据包变形开关的改变 影响 tag的增删
    const onSwitchToTags = useMemoizedFn((value: string[]) => {
        setInfoParams({
            ...(fetchInfoData() || getInfoParams()),
            Tags: value
        })
        setCacheTags(value)
    })

    // 插件配置信息-相关逻辑
    const settingRef = useRef<PluginSettingRefProps>(null)
    const [settingParams, setSettingParams, getSettingParams] = useGetState<PluginSettingParamProps>({
        Params: [],
        Content: ""
    })
    // 获取配置信息组件内的数据(不考虑验证)
    const fetchSettingData = useMemoizedFn(() => {
        if (settingRef.current) {
            return settingRef.current.onGetValue()
        }
        return undefined
    })
    // 插件源码-相关逻辑
    // 旧源码
    const [oldCode, setOldCode] = useState<string>("")
    // 新源码
    const [newCode, setNewCode] = useState<string>("")
    const [codeModal, setCodeModal] = useState<boolean>(false)
    const onModifyCode = useMemoizedFn((content: string) => {
        if (newCode !== content) setNewCode(content)
        setCodeModal(false)
    })
    /** ---------- 页面可见数据操作逻辑块 end ---------- */

    // 获取插件所有配置参数
    const convertPluginInfo = useMemoizedFn(async () => {
        const data: PluginDataProps = {
            ScriptName: "",
            Type: "",
            Kind: "",
            Content: ""
        }
        if (!getTypeParams().Kind || !getTypeParams().Type) {
            yakitNotify("error", "请选择脚本类型和插件类型")
            return
        }
        data.Type = getTypeParams().Type
        data.Kind = getTypeParams().Kind

        if (!infoRef.current) {
            yakitNotify("error", "未获取到基础信息，请重试")
            return
        }
        const info = await infoRef.current.onSubmit()
        if (!info) {
            document.querySelector("#plugin-details-info")?.scrollIntoView(true)
            return
        } else {
            data.ScriptName = info?.ScriptName || ""
            data.Help = data.Kind === "bug" ? undefined : info?.Help
            data.RiskType = data.Kind === "bug" ? info?.RiskType : undefined
            data.RiskDetail = data.Kind === "bug" ? info?.RiskDetail : undefined
            data.RiskAnnotation = data.Kind === "bug" ? info?.RiskAnnotation : undefined
            data.Tags = (info?.Tags || []).join(",") || undefined
        }

        if (!settingRef.current) {
            yakitNotify("error", "未获取到配置信息，请重试")
            return
        }
        const setting = await settingRef.current.onSubmit()
        if (!setting) {
            document.querySelector("#plugin-details-settingRef")?.scrollIntoView(true)
            return
        } else {
            data.Params = (setting?.Params || []).map((item) => {
                const obj: YakParamProps = {
                    ...item,
                    ExtraSetting: item.ExtraSetting ? JSON.stringify(item.ExtraSetting) : ""
                }
                return obj
            })
            data.EnablePluginSelector = setting?.EnablePluginSelector
            data.PluginSelectorTypes = setting?.PluginSelectorTypes
        }
        // 无参数情况
        if (data.Params.length === 0) data.Params = undefined

        data.Content = newCode

        if (!plugin) return

        const obj = convertRemoteToRemoteInfo(plugin, data)

        return obj
    })

    const [logLoading, setLogLoading] = useState<boolean>(false)
    const onChangeStatus = useMemoizedFn(
        async (
            param: {isPass: boolean; description?: string},
            callback: (value?: API.PluginsAuditDetailResponse) => {}
        ) => {
            const {isPass, description = ""} = param
            if (plugin) {
                const audit: API.PluginsAudit = {
                    listType: "log",
                    status: isPass ? "true" : "false",
                    uuid: plugin.uuid,
                    logDescription: description || undefined,
                    upPluginLogId: plugin.up_log_id || 0
                }
                const data: API.PluginsRequest | undefined = await convertPluginInfo()
                if (!data) {
                    if (callback) callback()
                    return
                }
            } else {
                callback()
            }
        }
    )

    // 基础信息验证是否通过
    const baseVerify = useMemoizedFn(async () => {
        // 判断是否获取到日志信息
        if (!plugin) {
            yakitNotify("error", "未获取到日志详情，请退出后重试")
            return false
        }
        // 获取基础信息
        const data: API.PluginsRequest | undefined = await convertPluginInfo()
        if (!data) return

        if (logLoading) return false

        return true
    })

    // 插件修改不通过原因描述
    const [noPassReason, setNoPassReason] = useState<boolean>(false)
    const onShowNoPassReason = useMemoizedFn(() => {
        if (!baseVerify()) return

        if (noPassReason) return
        setNoPassReason(true)
    })
    // 取消不通过或完成不通过
    const onCallbackReason = useMemoizedFn((isSubmit: boolean, content?: string) => {
        if (isSubmit) {
        } else {
            setTimeout(() => {
                setLogLoading(false)
            }, 200)
        }
        setNoPassReason(false)
    })
    // 通过
    const onPass = useMemoizedFn(() => {
        if (!baseVerify()) return
    })

    return (
        <div className={styles["plugin-edit-details-wrapper"]}>
            <div className={styles["plugin-edit-details-header"]}>
                <div className={styles["header-title"]}>
                    <div className={styles["title-style"]}>插件修改详情</div>
                    {plugin && (
                        <div className={styles["title-extra-wrapper"]}>
                            <YakitTag color={pluginTypeToName[plugin.type]?.color as any}>
                                {pluginTypeToName[plugin.type]?.name || ""}
                            </YakitTag>
                            <div
                                className={classNames(styles["script-name"], "yakit-content-single-ellipsis")}
                                title={plugin.script_name}
                            >
                                {plugin.script_name}
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles["header-path"]}>
                    <Anchor
                        className='plugins-anchor'
                        getContainer={() => {
                            if (bodyRef.current) return bodyRef.current
                            else return window
                        }}
                        affix={false}
                        onChange={onViewChange}
                    >
                        <Link
                            href='#plugin-details-type'
                            title={
                                <YakitButton className={path === "type" ? styles["path-btn"] : undefined} type='text2'>
                                    <OutlineViewgridIcon />
                                    类型选择
                                </YakitButton>
                            }
                        />
                        <Link href='' title={<OutlineChevronrightIcon className={styles["paht-icon"]} />} />
                        <Link
                            href='#plugin-details-info'
                            title={
                                <YakitButton className={path === "info" ? styles["path-btn"] : undefined} type='text2'>
                                    <OutlineIdentificationIcon />
                                    基础信息
                                </YakitButton>
                            }
                        />
                        <Link href='' title={<OutlineChevronrightIcon className={styles["paht-icon"]} />} />
                        <Link
                            href='#plugin-details-setting'
                            title={
                                <YakitButton
                                    className={path === "setting" ? styles["path-btn"] : undefined}
                                    type='text2'
                                >
                                    <OutlineAdjustmentsIcon />
                                    插件配置
                                </YakitButton>
                            }
                        />
                    </Anchor>
                </div>
                <div className={styles["header-extra"]}>
                    <div className={styles["extra-btn"]}>
                        <FuncBtn
                            icon={<SolidBanIcon />}
                            type='outline1'
                            colors='danger'
                            size='large'
                            name={"不通过"}
                            loading={logLoading}
                            onClick={onShowNoPassReason}
                        />

                        <FuncBtn
                            icon={<SolidBadgecheckIcon />}
                            colors='success'
                            size='large'
                            name={"通过"}
                            loading={logLoading}
                            onClick={onPass}
                        />
                    </div>
                </div>
            </div>

            <div ref={bodyRef} className={styles["plugin-edit-details-body"]}>
                <div className={styles["body-wrapper"]}>
                    {/* 类型选择 */}
                    <div id='plugin-details-type' className={styles["body-type-wrapper"]}>
                        <div className={styles["header-wrapper"]}>类型选择</div>
                        <div className={styles["type-body"]}>
                            <div className={styles["body-container"]}>
                                <div className={styles["type-title"]}>脚本类型</div>
                                <div className={styles["type-list"]}>
                                    <div className={styles["list-row"]}>
                                        {DefaultTypeList.slice(0, 3).map((item) => {
                                            return (
                                                <TypeTag
                                                    {...item}
                                                    disabled={true}
                                                    checked={typeParams.Type === item.key}
                                                    setCheck={() => onType(item.key)}
                                                />
                                            )
                                        })}
                                    </div>
                                    <div className={styles["list-row"]}>
                                        {DefaultTypeList.slice(3, 6).map((item) => {
                                            return (
                                                <TypeTag
                                                    {...item}
                                                    disabled={true}
                                                    checked={typeParams.Type === item.key}
                                                    setCheck={() => onType(item.key)}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            {typeParams.Type !== "codec" && (
                                <div className={styles["body-container"]}>
                                    <div className={styles["type-title"]}>插件类型</div>
                                    <div className={styles["type-kind"]}>
                                        {DefaultKindList.map((item) => {
                                            return (
                                                <KindTag
                                                    {...item}
                                                    disabled={true}
                                                    checked={typeParams.Kind === item.key}
                                                    setCheck={() => onKind(item.key)}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* 基础信息 */}
                    <div id='plugin-details-info' className={styles["body-info-wrapper"]}>
                        <div className={styles["header-wrapper"]}>基础信息</div>
                        <div className={styles["info-body"]}>
                            <PluginModifyInfo
                                ref={infoRef}
                                isEdit={true}
                                kind={typeParams.Kind}
                                data={infoParams}
                                tagsCallback={onTagsCallback}
                            />
                        </div>
                    </div>
                    {/* 插件配置 */}
                    <div id='plugin-details-setting' className={styles["body-setting-wrapper"]}>
                        <div className={styles["header-wrapper"]}>插件配置</div>
                        {apply && (
                            <div className={styles["modify-advice"]}>
                                <div className={styles["advice-icon"]}>
                                    <OutlineLightbulbIcon />
                                </div>
                                <div className={styles["advice-body"]}>
                                    <div className={styles["advice-content"]}>
                                        <div className={styles["content-title"]}>修改内容描述</div>
                                        <div className={styles["content-style"]}>{apply?.description || ""}</div>
                                    </div>
                                    <div className={styles["advice-user"]}>
                                        <AuthorImg src={apply?.img || ""} />
                                        {apply?.name || ""}
                                        <ApplicantIcon />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className={styles["setting-body"]}>
                            <PluginModifySetting
                                ref={settingRef}
                                type={typeParams.Type}
                                tags={cacheTags || []}
                                setTags={onSwitchToTags}
                                data={settingParams}
                            />
                            <div className={styles["setting-editor-wrapper"]}>
                                <div className={styles["editor-header"]}>
                                    <div className={styles["header-title"]}>
                                        <span className={styles["title-style"]}>代码对比</span>
                                        <span className={styles["subtitle-style"]}>
                                            可在此定义插件输入原理，并编写输出 UI
                                        </span>
                                    </div>
                                    <YakitButton
                                        type='text2'
                                        icon={<OutlineArrowsexpandIcon />}
                                        onClick={() => setCodeModal(true)}
                                    />
                                </div>
                                <div className={styles["editor-body"]}>
                                    <PluginDiffEditorModal
                                        language={typeParams.Type}
                                        oldCode={oldCode}
                                        newCode={newCode}
                                        visible={codeModal}
                                        setVisible={onModifyCode}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ModifyPluginReason visible={noPassReason} onCancel={onCallbackReason} />
        </div>
    )
}

interface TypeTagProps {
    checked: boolean
    setCheck: () => any
    disabled: boolean
    icon: ReactNode
    name: string
    description: string
}
/** @name 类型标签 */
const TypeTag: React.FC<TypeTagProps> = memo((props) => {
    const {checked, setCheck, disabled, icon, name, description} = props

    return (
        <div
            className={classNames(styles["type-tag-wrapper"], {
                [styles["type-tag-active"]]: checked,
                [styles["type-tag-disabled"]]: disabled
            })}
            onClick={() => {
                if (disabled) return
                setCheck()
            }}
        >
            <div className={styles["type-tag-header"]}>
                {icon}
                <Radio
                    className='plugins-radio-wrapper'
                    disabled={disabled}
                    checked={checked}
                    onClick={(e) => {
                        e.stopPropagation()
                        setCheck()
                    }}
                />
            </div>
            <div className={styles["type-tag-content"]}>
                <div className={styles["content-title"]}>{name}</div>
                <div className={styles["content-body"]}>{description}</div>
            </div>
        </div>
    )
})
interface KindTagProps {
    checked: boolean
    setCheck: () => any
    disabled: boolean
    icon: ReactNode
    name: string
}
/** @name 种类标签 */
const KindTag: React.FC<KindTagProps> = memo((props) => {
    const {checked, setCheck, disabled, icon, name} = props

    return (
        <div
            className={classNames(styles["kind-tag-wrapper"], {
                [styles["kind-tag-active"]]: checked,
                [styles["kind-tag-disabled"]]: disabled
            })}
            onClick={() => {
                if (disabled) return
                setCheck()
            }}
        >
            <div className={styles["opt-title"]}>
                {icon}
                {name}
            </div>
            <Radio
                className='plugins-radio-wrapper'
                disabled={disabled}
                checked={checked}
                onClick={(e) => {
                    e.stopPropagation()
                    setCheck()
                }}
            />
        </div>
    )
})

interface ModifyPluginReasonProps {
    visible: boolean
    onCancel: (isSubmit: boolean, content?: string) => any
}
/** @name 不通过原因描述 */
const ModifyPluginReason: React.FC<ModifyPluginReasonProps> = memo((props) => {
    const {visible, onCancel} = props

    const [content, setContent] = useState<string>("")

    const onSubmit = useMemoizedFn(() => {
        if (!content) {
            yakitNotify("error", "请描述一下修改内容")
            return
        }
        onCancel(true, content)
    })

    useEffect(() => {
        if (visible) setContent("")
    }, [visible])

    return (
        <YakitModal
            title='不通过原因描述'
            type='white'
            width={448}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            onCancel={() => onCancel(false)}
            onOk={onSubmit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["modify-plugin-reason-wrapper"]}>
                <YakitInput.TextArea
                    placeholder='请简单描述一下不通过原因，方便告知修改者...'
                    autoSize={{minRows: 3, maxRows: 3}}
                    showCount
                    value={content}
                    maxLength={150}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>
        </YakitModal>
    )
})
