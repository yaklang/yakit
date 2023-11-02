import React, {ReactNode, memo, useEffect, useMemo, useRef, useState} from "react"
import {Anchor, Radio} from "antd"
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
import {
    PluginBaseParamProps,
    PluginDataProps,
    PluginParamDataProps,
    PluginSettingParamProps,
    PluginTypeParamProps,
    YakParamProps,
    localYakInfo
} from "../pluginsType"
import {useGetState, useMemoizedFn} from "ahooks"
import {PluginModifyInfo, PluginModifySetting, pluginTypeToName} from "../baseTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginInfoRefProps, PluginSettingRefProps} from "../baseTemplateType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {PluginGV} from "../utils"
import {CodeScoreModal, FuncBtn} from "../funcTemplate"
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "@/pages/invoker/schema"
import {convertLocalToLocalInfo, convertLocalToRemoteInfo, uploadOnlinePlugin} from "./utils"
import {API} from "@/services/swagger/resposeType"
import {PortScanPluginParams} from "./builtInData"

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
    info?: YakScript
}

export const PluginEditDetails: React.FC<PluginEditDetailsProps> = (props) => {
    const {info} = props

    useEffect(() => {
        if (info) {
        }
    }, [info])

    // 是否为编辑状态
    const isModify = useMemo(() => !!info, [info])

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
        setCode(pluginTypeToName[value]?.content || "")
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
    // 删除某些tag 触发  DNSLog和HTTP数据包变形开关的改变
    const onTagsCallback = useMemoizedFn(() => {
        setInfoParams({...(fetchInfoData() || getInfoParams())})
    })
    // DNSLog和HTTP数据包变形开关的改变 影响 tag的增删
    const onSwitchToTags = useMemoizedFn((value: string[]) => {
        setInfoParams({
            ...(fetchInfoData() || getInfoParams()),
            Tags: value
        })
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

    // 获取插件所有配置参数
    const convertPluginInfo = useMemoizedFn(async () => {
        setLoading(true)

        const data: PluginDataProps = {
            ScriptName: "",
            Type: "",
            Kind: "",
            Content: ""
        }
        if (!getTypeParams().Kind || !getTypeParams().Type) {
            errorHint("请选择脚本类型和插件类型")
            return
        }
        data.Type = getTypeParams().Type
        data.Kind = getTypeParams().Kind

        if (!infoRef.current) {
            errorHint("未获取到基础信息，请重试")
            return
        }
        const info = await infoRef.current.onSubmit()
        if (!info) {
            document.querySelector("#plugin-details-info")?.scrollIntoView(true)
            return
        } else {
            data.ScriptName = info?.ScriptName
            data.Help = data.Kind === "bug" ? undefined : info?.Help
            data.RiskType = data.Kind === "bug" ? info?.RiskType : undefined
            data.RiskDetail = data.Kind === "bug" ? info?.RiskDetail : undefined
            data.RiskAnnotation = data.Kind === "bug" ? info?.RiskAnnotation : undefined
            data.Tags = (info?.Tags || []).join(",") || undefined
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
            data.Params = (setting?.Params || []).map((item) => {
                const obj: YakParamProps = {
                    ...item,
                    ExtraSetting: item.ExtraSetting ? JSON.stringify(item.ExtraSetting) : ""
                }
                return obj
            })
            data.EnablePluginSelector = setting?.EnablePluginSelector
            data.PluginSelectorTypes = setting?.PluginSelectorTypes || ""
        }

        data.Content = code

        return data
    })
    // 判断本地是否有重名插件
    const checkDuplicatePluginName = useMemoizedFn((name: string, callback: (value: boolean) => any) => {
        if (!name) {
            yakitNotify("error", "插件名错误，请重试!")
            callback(false)
        }

        const newParams: QueryYakScriptRequest = {
            IncludedScriptNames: [name],
            Pagination: {
                Limit: 1,
                Page: 1,
                Order: "desc",
                OrderBy: "updated_at"
            }
        }
        ipcRenderer
            .invoke("QueryYakScript", newParams)
            .then((item: QueryYakScriptsResponse) => {
                if (+item.Total > 0) {
                    yakitNotify("error", "保存插件失败，插件名重复")
                    callback(false)
                } else callback(true)
            })
            .catch((e: any) => {
                yakitNotify("error", "查询插件名重复失败: " + `${e}`)
                callback(false)
            })
    })
    // 插件本地保存
    const saveLocal = useMemoizedFn((modify: PluginDataProps) => {
        const request: localYakInfo = convertLocalToLocalInfo(isModify, {info: info, modify: modify})
        setLoading(true)
        ipcRenderer
            .invoke("SaveLocalPlugin", request)
            .then((data) => {
                yakitNotify("success", "创建 / 保存 插件成功")

                setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
            })
            .catch((e: any) => {
                yakitNotify("error", `保存 Yak 模块失败: ${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    /** 页面右上角的按钮组操作 start */
    // 调试
    const onDebug = useMemoizedFn(() => {})
    // 同步至云端
    const onSyncCloud = useMemoizedFn(async () => {
        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) return
        modifyInfo.current = convertLocalToRemoteInfo(isModify, {info: info, modify: obj})
        console.log(123, modifyInfo.current)
        setCloudHint({isCopy: false, visible: true})
    })
    // 复制至云端
    const onCopyCloud = useMemoizedFn(async () => {
        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) return
        modifyInfo.current = convertLocalToRemoteInfo(isModify, {info: info, modify: obj})
        console.log(123, modifyInfo.current)
        setCloudHint({isCopy: true, visible: true})
    })
    // 提交
    const onSubmit = useMemoizedFn(() => {})
    // 保存
    const onSave = useMemoizedFn(async () => {
        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) return
        console.log("obj", obj)

        if (!isModify)
            checkDuplicatePluginName(obj?.ScriptName || "", (value) => {
                if (value) saveLocal(obj)
            })
        else saveLocal(obj)
    })

    // 同步&复制云端
    const modifyInfo = useRef<API.PluginsEditRequest>()
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
            if (modifyInfo.current) {
                uploadOnlinePlugin(modifyInfo.current, (value) => {
                    console.log("upload", value)
                })
            }
        } else {
            // 公开的新插件需要走基础检测流程
            if (param && param?.type === "public") {
                setPluginTest(true)
                setTimeout(() => {
                    setCloudHint({isCopy: false, visible: false})
                }, 100)
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
                            <YakitTag color={pluginTypeToName[typeParams.Type].color as any}>
                                {pluginTypeToName[typeParams.Type].name}
                            </YakitTag>
                            <div
                                className={classNames(styles["script-name"], "yakit-content-single-ellipsis")}
                                title={infoParams.ScriptName}
                            >
                                {infoParams.ScriptName}
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
                            maxWidth={isModify ? 1100 : 950}
                            icon={<OutlineCodeIcon />}
                            type='outline2'
                            size='large'
                            name={"调试"}
                            onClick={onDebug}
                        />

                        {isModify ? (
                            <>
                                <FuncBtn
                                    maxWidth={1100}
                                    icon={<OutlineDocumentduplicateIcon />}
                                    type='outline2'
                                    size='large'
                                    name={"复制至云端"}
                                    onClick={onCopyCloud}
                                />

                                <FuncBtn
                                    maxWidth={1100}
                                    icon={<OutlinePaperairplaneIcon />}
                                    type='outline1'
                                    size='large'
                                    name={"复制至云端"}
                                    onClick={onSubmit}
                                />
                            </>
                        ) : (
                            <FuncBtn
                                maxWidth={950}
                                icon={<OutlineClouduploadIcon />}
                                type='outline1'
                                size='large'
                                name={"同步至云端"}
                                onClick={onSyncCloud}
                            />
                        )}

                        <FuncBtn
                            maxWidth={isModify ? 1100 : 950}
                            icon={<OutlineStorageIcon />}
                            size='large'
                            name={"保存"}
                            onClick={onSave}
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
                                                    disabled={isModify || item.key === "lua"}
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
                                                    disabled={isModify || item.key === "lua"}
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
                                                    disabled={isModify}
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
                                isEdit={isModify}
                                kind={typeParams.Kind}
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
                                ref={settingRef}
                                type={typeParams.Type}
                                tags={infoParams.Tags || []}
                                setTags={onSwitchToTags}
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
            <UploadPluginModal
                plugin={modifyInfo.current}
                visible={pluginTest}
                onCancel={() => {
                    setPluginTest(false)
                }}
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

interface UploadPluginModalProps {
    plugin?: API.PluginsEditRequest
    visible: boolean
    /** 关闭弹窗(true:合格|false:不合格) */
    onCancel: (value: boolean) => any
}
/** @name 插件源码评分-合格后自动上传 */
const UploadPluginModal: React.FC<UploadPluginModalProps> = memo((props) => {
    const {plugin, visible, onCancel} = props

    console.log("plugin", plugin)

    const onCallback = useMemoizedFn((value: boolean) => {
        onCancel(value)
        if (value) {
            if (plugin) {
                uploadOnlinePlugin(plugin, (value) => {
                    console.log("upload", value)
                })
            }
        }
    })

    return (
        <CodeScoreModal
            type={plugin?.type || ""}
            code={plugin?.content || ""}
            visible={visible}
            onCancel={onCallback}
        />
    )
})
