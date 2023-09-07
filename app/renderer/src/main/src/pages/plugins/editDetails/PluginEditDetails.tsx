import React, {ReactNode, memo, useEffect, useMemo, useRef, useState} from "react"
import {Anchor, Radio, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineAdjustmentsIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineBugIcon,
    OutlineChevronrightIcon,
    OutlineClouduploadIcon,
    OutlineCodeIcon,
    OutlineDocumentduplicateIcon,
    OutlineIdentificationIcon,
    OutlinePaperairplaneIcon,
    OutlineSmviewgridaddIcon,
    OutlineStorageIcon,
    OutlineViewgridIcon
} from "@/assets/icon/outline"
import {SolidExclamationIcon} from "@/assets/icon/solid"
import {
    PluginBaseParamProps,
    PluginDataProps,
    PluginParamDataProps,
    PluginSettingParamProps,
    PluginTypeParamProps
} from "../pluginsType"
import {useGetState, useMemoizedFn} from "ahooks"
import {PluginModifyInfo, PluginModifySetting, pluginTypeToName} from "../baseTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {CodeGV} from "@/yakitGV"
import {PluginInfoRefProps, PluginSettingRefProps} from "../baseTemplateType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {SmokingEvaluateResponse} from "@/pages/pluginDebugger/SmokingEvaluate"
import {PluginTestErrorIcon} from "../icon"

import "../plugins.scss"
import styles from "./pluginEditDetails.module.scss"
import classNames from "classnames"

const {Link} = Anchor

const {ipcRenderer} = window.require("electron")

// 插件脚本类型信息
const DefaultTypeList: {icon: ReactNode; name: string; description: string; key: string}[] = [
    {...pluginTypeToName["yak"], key: "yak"},
    {...pluginTypeToName["mitm"], key: "mitm"},
    {...pluginTypeToName["port-scan"], key: "port-scan"},
    {...pluginTypeToName["codec"], key: "codec"},
    {...pluginTypeToName["lua"], key: "lua"},
    {...pluginTypeToName["nuclei"], key: "nuclei"}
]
// 插件种类类型信息
const DefaultKindList: {icon: ReactNode; name: string; key: string}[] = [
    {icon: <OutlineBugIcon />, name: "漏洞类", key: "bug"},
    {icon: <OutlineSmviewgridaddIcon />, name: "其他", key: "other"}
]

interface PluginEditDetailsProps {
    info?: any
}

export const PluginEditDetails: React.FC<PluginEditDetailsProps> = (props) => {
    const {info} = props

    // 是否为编辑状态
    const isModify = useMemo(() => !!info, [info])

    // 页面分块步骤式展示-相关逻辑
    const [path, setPath] = useState<"type" | "info" | "setting">("type")
    const bodyRef = useRef<HTMLDivElement>(null)
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
        type: "yak",
        kind: "bug"
    })
    const onType = useMemoizedFn((value: string) => {
        let typeData: PluginTypeParamProps = {...getTypeParams()}
        if (typeData.type === value) return
        typeData = {...typeData, type: value}

        // 不同类型对应的基础信息和配置信息的重置
        let infoData: PluginBaseParamProps = {...(fetchInfoData() || getInfoParams())}
        let settingData: PluginSettingParamProps = {...(fetchSettingData() || getSettingParams())}

        if (value === "codec") {
            typeData = {type: value, kind: "other"}
            // codec脚本类型 没有 漏洞种类类型
            infoData = {
                ...infoData,
                bug: undefined,
                bugHelp: undefined,
                bugFix: undefined,
                commnt: undefined
            }
        }
        // 切换脚本类型时, 删除DNSLog和HTTP数据包变形代表的tag字段
        infoData = {
            ...infoData,
            tags: infoData.tags?.filter((item) => {
                return item !== CodeGV.PluginYakDNSLogSwitch && item !== CodeGV.PluginCodecHttpSwitch
            })
        }

        if (value === "port-scan") {
            const baseArr: PluginParamDataProps[] = [
                {
                    value: "target",
                    label: "扫描的目标",
                    type: "string",
                    required: true
                },
                {value: "ports", label: "端口", type: "string", required: false, defaultValue: "80"}
            ]
            settingData = {
                ...settingData,
                params: baseArr.concat(settingData.params || [])
            }
        } else {
            settingData = {...settingData}
        }

        setTypeParams({...typeData})
        // 不同类型对应的不同默认源码
        setCode(pluginTypeToName[value]?.content || "")
        setInfoParams({...infoData})
        setSettingParams({...settingData})
    })
    const onKind = useMemoizedFn((value: string) => {
        if (typeParams.kind === value) return
        setTypeParams({...typeParams, kind: value})
    })
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
    // 插件源码-相关逻辑
    const [code, setCode] = useState<string>(pluginTypeToName["yak"]?.content || "")
    const [codeModal, setCodeModal] = useState<boolean>(false)
    const onModifyCode = useMemoizedFn((content: string) => {
        if (code !== content) setCode(content)
        setCodeModal(false)
    })

    // 错误信息提示
    const errorHint = useMemoizedFn((value: string) => {
        yakitNotify("error", value)
        setTimeout(() => {
            setLoading(false)
        }, 200)
        return
    })

    const [loading, setLoading] = useState<boolean>(false)
    const convertPluginInfo = useMemoizedFn(async () => {
        setLoading(true)

        const data: PluginDataProps = {
            ScriptName: "",
            Type: "",
            Kind: "",
            content: ""
        }
        if (!getTypeParams().kind || !getTypeParams().type) {
            errorHint("请选择脚本类型和插件类型")
            return
        }
        data.Type = getTypeParams().type
        data.Kind = getTypeParams().kind

        if (!infoRef.current) {
            errorHint("未获取到基础信息，请重试")
            return
        }
        const info = await infoRef.current.onSubmit()
        if (!info) {
            document.querySelector("#plugin-details-info")?.scrollIntoView(true)
            return
        } else {
            data.ScriptName = info?.name
            data.Help = info?.help || undefined
            data.Bug = info?.bug || undefined
            data.BugHelp = info?.bugHelp || undefined
            data.BugFix = info?.bugFix || undefined
            data.BugCommnt = info?.commnt || undefined
            data.Tags = (info?.tags || []).join(",") || undefined
        }

        if (!settingRef.current) {
            errorHint("未获取到配置信息，请重试")
            return
        }
        const setting = await settingRef.current.onSubmit()
        if (!setting) {
            document.querySelector("#plugin-details-settingRef")?.scrollIntoView(true)
            return
        } else {
            data.Params = setting?.params || []
            data.EnablePluginSelector = setting?.EnablePluginSelector
            data.PluginSelectorTypes = setting?.PluginSelectorTypes || ""
        }

        data.content = code

        return data
    })

    const onDebug = useMemoizedFn(() => {})
    const onSyncCloud = useMemoizedFn(async () => {
        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) return

        setCloudHint({isCopy: false, visible: true})
    })
    const onCopyCloud = useMemoizedFn(async () => {
        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) return

        setCloudHint({isCopy: true, visible: true})
    })
    const onSubmit = useMemoizedFn(() => {})
    const onSave = useMemoizedFn(async () => {
        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) return
    })

    // 同步&复制云端
    const [cloudHint, setCloudHint] = useState<{isCopy: boolean; visible: boolean}>({isCopy: false, visible: false})
    const onCloudHintCallback = useMemoizedFn((isCallback: boolean, param?: {type?: string; name?: string}) => {
        // 手动关闭弹窗
        if (!isCallback) {
            setCloudHint({isCopy: false, visible: false})
            return
        }

        // 点击弹窗的提交按钮
        if (cloudHint.isCopy) {
            // 复制的插件直接为私密，不走基础检测流程
        } else {
            // 公开的新插件需要走基础检测流程
            if (param && param?.type === "public") {
                setCloudHint({isCopy: false, visible: false})
                setPluginTest(true)
            }
            // 私密的插件直接保存，不用走基础检测流程
        }
    })
    // 插件基础检测
    const [pluginTest, setPluginTest] = useState<boolean>(false)
    const onTestCallback = useMemoizedFn((value: boolean) => {
        if (value) {
        } else {
            setPluginTest(false)
        }
    })

    return (
        <div className={styles["plugin-edit-details-wrapper"]}>
            <div className={styles["plugin-edit-details-header"]}>
                <div className={styles["header-title"]}>
                    <div className={styles["title-style"]}>{isModify ? "修改插件" : "新建插件"}</div>
                    {isModify && (
                        <div className={styles["title-extra-wrapper"]}>
                            <YakitTag color={pluginTypeToName[typeParams.type].color as any}>
                                {pluginTypeToName[typeParams.type].name}
                            </YakitTag>
                            <div
                                className={classNames(styles["script-name"], "yakit-content-single-ellipsis")}
                                title={infoParams.name}
                            >
                                {infoParams.name}
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
                        <YakitButton
                            className={isModify ? styles["edit-btn-content"] : styles["new-btn-content"]}
                            size='large'
                            type='outline2'
                            onClick={onDebug}
                        >
                            <OutlineCodeIcon />
                            调试
                        </YakitButton>
                        <Tooltip title='调试' overlayClassName='plugins-tooltip'>
                            <YakitButton
                                className={isModify ? styles["edit-btn-icon"] : styles["new-btn-icon"]}
                                size='large'
                                type='outline2'
                                icon={<OutlineCodeIcon />}
                                onClick={onDebug}
                            />
                        </Tooltip>

                        {!isModify && (
                            <>
                                <YakitButton
                                    className={styles["new-btn-content"]}
                                    size='large'
                                    type='outline1'
                                    onClick={onSyncCloud}
                                >
                                    <OutlineClouduploadIcon />
                                    同步至云端
                                </YakitButton>
                                <Tooltip title='同步至云端' overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        className={styles["new-btn-icon"]}
                                        size='large'
                                        type='outline1'
                                        icon={<OutlineClouduploadIcon />}
                                        onClick={onSyncCloud}
                                    />
                                </Tooltip>
                            </>
                        )}

                        {isModify && (
                            <>
                                <YakitButton
                                    className={styles["edit-btn-content"]}
                                    size='large'
                                    type='outline2'
                                    onClick={onCopyCloud}
                                >
                                    <OutlineDocumentduplicateIcon />
                                    复制至云端
                                </YakitButton>
                                <Tooltip title='复制至云端' overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        className={styles["edit-btn-icon"]}
                                        size='large'
                                        type='outline2'
                                        icon={<OutlineDocumentduplicateIcon />}
                                        onClick={onCopyCloud}
                                    />
                                </Tooltip>

                                <YakitButton
                                    className={styles["edit-btn-content"]}
                                    size='large'
                                    type='outline1'
                                    onClick={onSubmit}
                                >
                                    <OutlinePaperairplaneIcon />
                                    提交
                                </YakitButton>
                                <Tooltip title='提交' overlayClassName='plugins-tooltip'>
                                    <YakitButton
                                        className={styles["edit-btn-icon"]}
                                        size='large'
                                        type='outline1'
                                        icon={<OutlinePaperairplaneIcon />}
                                        onClick={onSubmit}
                                    />
                                </Tooltip>
                            </>
                        )}

                        <YakitButton
                            className={isModify ? styles["edit-btn-content"] : styles["new-btn-content"]}
                            size='large'
                            onClick={onSave}
                        >
                            <OutlineStorageIcon />
                            保存
                        </YakitButton>
                        <Tooltip title='保存' overlayClassName='plugins-tooltip'>
                            <YakitButton
                                className={isModify ? styles["edit-btn-icon"] : styles["new-btn-icon"]}
                                size='large'
                                icon={<OutlineStorageIcon />}
                                onClick={onSave}
                            />
                        </Tooltip>
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
                                                    disabled={isModify || item.key === "lua"}
                                                    checked={typeParams.type === item.key}
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
                                                    disabled={isModify || item.key === "lua"}
                                                    checked={typeParams.type === item.key}
                                                    setCheck={() => onType(item.key)}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            {typeParams.type !== "codec" && (
                                <div className={styles["body-container"]}>
                                    <div className={styles["type-title"]}>插件类型</div>
                                    <div className={styles["type-kind"]}>
                                        {DefaultKindList.map((item) => {
                                            return (
                                                <KindTag
                                                    {...item}
                                                    disabled={isModify}
                                                    checked={typeParams.kind === item.key}
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
                                isEdit={isModify}
                                kind={typeParams.kind}
                                data={infoParams}
                                tagsCallback={onTagsCallback}
                            />
                        </div>
                    </div>
                    {/* 插件配置 */}
                    <div id='plugin-details-setting' className={styles["body-setting-wrapper"]}>
                        <div className={styles["header-wrapper"]}>插件配置</div>
                        <div className={styles["setting-body"]}>
                            <PluginModifySetting
                                type={typeParams.type}
                                tags={infoParams.tags || []}
                                setTags={(value) => setInfoParams({...getInfoParams(), tags: value})}
                                ref={settingRef}
                                data={settingParams}
                            />
                            <div className={styles["setting-editor-wrapper"]}>
                                <div className={styles["editor-header"]}>
                                    <div className={styles["header-title"]}>
                                        <span className={styles["title-style"]}>源码</span>
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
                                    <YakitEditor type='yak' value={code} setValue={setCode} />
                                </div>
                            </div>
                        </div>
                        <PluginEditorModal visible={codeModal} setVisible={onModifyCode} code={code} />
                    </div>
                </div>
            </div>

            <PluginSyncAndCopyModal {...cloudHint} setVisible={onCloudHintCallback} />
            <PluginBaseInspect
                type={getTypeParams().type}
                code={code}
                visible={pluginTest}
                setVisible={onTestCallback}
            />
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

interface PluginEditorModalProps {
    visible: boolean
    setVisible: (content: string) => any
    code: string
}
/** @name 源码放大版编辑器 */
const PluginEditorModal: React.FC<PluginEditorModalProps> = memo((props) => {
    const {visible, setVisible, code} = props

    const [content, setContent] = useState<string>("")

    useEffect(() => {
        if (visible) {
            setContent(code || "")
        } else {
            setContent("")
        }
    }, [visible])

    return (
        <YakitModal
            title='源码'
            subTitle='可在此定义插件输入原理，并编写输出 UI'
            type='white'
            width='80%'
            centered={true}
            maskClosable={false}
            closable={true}
            closeIcon={<OutlineArrowscollapseIcon className={styles["plugin-editor-modal-close-icon"]} />}
            footer={null}
            visible={visible}
            onCancel={() => setVisible(content)}
        >
            <div className={styles["plugin-editor-modal-body"]}>
                <YakitEditor type='yak' value={content} setValue={setContent} />
            </div>
        </YakitModal>
    )
})

interface PluginSyncAndCopyModalProps {
    isCopy: boolean
    visible: boolean
    setVisible: (isCallback: boolean, param?: {type?: string; name?: string}) => any
}
/** @name 插件同步&复制云端 */
const PluginSyncAndCopyModal: React.FC<PluginSyncAndCopyModalProps> = memo((props) => {
    const {isCopy, visible, setVisible} = props

    const [type, setType] = useState<"private" | "public">("private")
    const [name, setName] = useState<string>("")

    const onSubmit = useMemoizedFn(() => {
        if (isCopy && !name) {
            yakitNotify("error", "请输入复制插件的名称")
            return
        }
        setVisible(true, {type: isCopy ? undefined : type, name: isCopy ? name : undefined})
    })

    return (
        <YakitModal
            title={isCopy ? "复制至云端" : "同步至云端"}
            type='white'
            width={isCopy ? 506 : 448}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            onCancel={() => setVisible(false)}
            onOk={onSubmit}
        >
            {isCopy ? (
                <div className={styles["plugin-sync-and-copy-body"]}>
                    <div className={styles["copy-header"]}>
                        复制插件并同步到自己的私密插件，无需作者同意，即可保存修改内容至云端
                    </div>
                    <div className={styles["copy-wrapper"]}>
                        <div className={styles["title-style"]}>插件名称 : </div>
                        <YakitInput placeholder='请输入...' value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                </div>
            ) : (
                <div className={styles["plugin-sync-and-copy-body"]}>
                    <div className={styles["sycn-wrapper"]}>
                        <Radio
                            className='plugins-radio-wrapper'
                            checked={type === "private"}
                            onClick={(e) => {
                                if (type === "private") return
                                setType("private")
                            }}
                        >
                            私密(仅自己可见)
                        </Radio>
                        <Radio
                            className='plugins-radio-wrapper'
                            checked={type === "public"}
                            onClick={(e) => {
                                if (type === "public") return
                                setType("public")
                            }}
                        >
                            公开(审核通过后，将上架到插件商店)
                        </Radio>
                    </div>
                </div>
            )}
        </YakitModal>
    )
})

interface PluginBaseInspectProps {
    type: string
    code: string
    visible: boolean
    setVisible: (value: boolean) => any
}
/** @name 插件基础检测 */
const PluginBaseInspect: React.FC<PluginBaseInspectProps> = memo((props) => {
    const {type, code, visible, setVisible} = props

    const [loading, setLoading] = useState<boolean>(true)
    const [response, setResponse] = useState<SmokingEvaluateResponse>()

    useEffect(() => {
        if (visible) {
            onTest()
        } else {
            setLoading(true)
            setResponse(undefined)
        }
    }, [visible])

    const onTest = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("SmokingEvaluatePlugin", {PluginType: type, Code: code})
            .then((rsp: SmokingEvaluateResponse) => {
                if (!visible) return
                setResponse(rsp)
            })
            .catch((e) => {
                yakitNotify("error", `插件基础测试失败: ${e}`)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    return (
        <YakitModal
            title='插件基础检测'
            type='white'
            width={506}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            okButtonProps={{style: {display: "none"}}}
            footer={loading ? undefined : null}
            onCancel={() => setVisible(false)}
        >
            <div className={styles["plugin-base-inspect-body"]}>
                <div className={styles["header-wrapper"]}>
                    <div className={styles["title-style"]}>检测项包含：</div>
                    <div className={styles["header-body"]}>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>1</div>
                            基础编译测试，判断语法是否符合规范，是否存在不正确语法；
                        </div>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>2</div>
                            把基础防误报服务器作为测试基准，防止条件过于宽松导致的误报；
                        </div>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>3</div>
                            检查插件执行过程是否会发生崩溃。
                        </div>
                    </div>
                </div>
                {loading && (
                    <div className={styles["loading-wrapper"]}>
                        <div className={styles["loading-body"]}>
                            <div className={styles["loading-icon"]}>
                                <YakitSpin spinning={true} />
                            </div>
                            <div className={styles["loading-title"]}>
                                <div className={styles["title-style"]}>检测中，请耐心等待...</div>
                                <div className={styles["subtitle-style"]}>
                                    一般来说，检测将会在 <span className={styles["active-style"]}>10-20s</span> 内结束
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {!loading && (
                    <div className={styles["loading-wrapper"]}>
                        <div className={styles["error-list"]}>
                            {response && (
                                <div className={styles["list-body"]}>
                                    {(response?.Results || []).map((item) => {
                                        return (
                                            <div className={styles["list-opt"]}>
                                                <div className={styles["opt-header"]}>
                                                    <PluginTestErrorIcon />
                                                    {item.Item}
                                                </div>
                                                <div className={styles["opt-content"]}>{item.Suggestion}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            {response && (response?.Results || []).length > 0 && (
                                <div className={styles["opt-danger"]}>
                                    <SolidExclamationIcon />
                                    <div className={styles["content-style"]}>（上传失败，请修复后再上传）</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </YakitModal>
    )
})
