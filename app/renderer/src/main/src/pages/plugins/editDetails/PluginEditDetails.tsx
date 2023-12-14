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
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginInfoRefProps, PluginSettingRefProps} from "../baseTemplateType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {CodeScoreModal, FuncBtn} from "../funcTemplate"
import {YakScript} from "@/pages/invoker/schema"
import {convertLocalToLocalInfo, convertLocalToRemoteInfo, copyOnlinePlugin, uploadOnlinePlugin} from "./utils"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {PortScanPluginParams} from "./builtInData"
import {PluginModifyInfo, PluginModifySetting} from "../baseTemplate"
import emiter from "@/utils/eventBus/eventBus"
import {toolDelInvalidKV} from "@/utils/tool"
import {useSubscribeClose} from "@/store/tabSubscribe"
import {YakitRoute} from "@/routes/newRoute"
import {DefaultTypeList, PluginGV, pluginTypeToName} from "../builtInData"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {getRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {showModal} from "@/utils/showModal"
import {YakScriptRunner} from "@/pages/invoker/ExecYakScript"
import {YakScriptParamsSetter} from "@/pages/invoker/YakScriptParamsSetter"
import {queryYakScriptList} from "@/pages/yakitStore/network"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import {SolidStoreIcon} from "@/assets/icon/solid"

import "../plugins.scss"
import styles from "./pluginEditDetails.module.scss"
import classNames from "classnames"

const {Link} = Anchor

const {ipcRenderer} = window.require("electron")

/** @name 类型选择-插件类型选项信息 */
const DefaultKindList: {icon: ReactNode; name: string; key: string}[] = [
    {icon: <OutlineBugIcon />, name: "漏洞类", key: "bug"},
    {icon: <OutlineSmviewgridaddIcon />, name: "其他", key: "other"}
]

interface PluginEditDetailsProps {
    id?: number
}

/** 新建|编辑插件成功后的信号传递信息 */
export interface SavePluginInfoSignalProps {
    route: YakitRoute
    isOnline: boolean
    pluginName: string
}

export const PluginEditDetails: React.FC<PluginEditDetailsProps> = (props) => {
    const {id: pluginId} = props

    // 编辑时的旧数据
    const [info, setInfo] = useState<YakScript>()
    // 新建页面时，保存之前点击了调试功能，导致插件先被保存了，从而记录保存插件的id
    const newToDebugId = useRef<number>(0)

    // 通过ID获取插件旧数据
    const fetchPluginInfo = useMemoizedFn((id: number) => {
        ipcRenderer
            .invoke("GetYakScriptById", {Id: id})
            .then((res: YakScript) => {
                console.log("fetch", res)
                setInfo(res)
                setTypeParams({
                    Type: res.Type,
                    Kind: res.RiskType ? "bug" : "other"
                })
                setInfoParams({
                    ScriptName: res.ScriptName,
                    Help: res.Help || res.ScriptName,
                    RiskType: res.RiskType,
                    RiskDetail: res.RiskDetail,
                    RiskAnnotation: res.RiskAnnotation,
                    Tags: !res.Tags || res.Tags === "null" ? [] : (res.Tags || "").split(",")
                })
                setSettingParams({
                    Params: (res.Params || []).map((item) => {
                        const obj: PluginParamDataProps = {...item, ExtraSetting: {double: false, data: []}}
                        try {
                            obj.ExtraSetting = JSON.parse(item.ExtraSetting || "")
                        } catch (error) {}
                        return obj
                    }),
                    EnablePluginSelector: res.EnablePluginSelector,
                    PluginSelectorTypes: res.PluginSelectorTypes,
                    Content: res.Content
                })
                setCode(res.Content)
                // 编辑插件页面-初始时默认展示第二部分
                setTimeout(() => {
                    setPath("info")
                    document.querySelector("#plugin-details-info")?.scrollIntoView(true)
                }, 500)
            })
            .catch((e: any) => {
                yakitNotify("error", "查询插件信息失败:" + e)
            })
    })

    useEffect(() => {
        if (pluginId) {
            fetchPluginInfo(pluginId)
        }
    }, [pluginId])

    const privateDomain = useRef<string>("")
    // 获取私有域地址
    const fetchPrivateDomain = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((value: string) => {
            if (value) {
                try {
                    privateDomain.current = JSON.parse(value)?.BaseUrl
                } catch (error) {}
            }
        })
    })

    const {userInfo} = useStore()
    useEffect(() => {
        if (userInfo.isLogin) fetchPrivateDomain()
    }, [userInfo])

    /** ---------- 页面判断变量和按钮展示逻辑块 start ---------- */
    /** 是否为纯本地插件(未同步过云端的) */
    const isPureLocal = useMemo(() => {
        if (!pluginId) return true
        if (!info) return true

        if (!info.OnlineBaseUrl) return true
        else return false
    }, [pluginId, info])
    /** 是否为同私有域插件 */
    const isSameBaseUrl = useMemo(() => {
        if (!pluginId) return true
        if (!info) return true
        if (!info.OnlineBaseUrl) return true

        if (info.OnlineBaseUrl === privateDomain.current) return true
        else return false
    }, [pluginId, info, privateDomain.current])
    /** 当前插件是否为本人插件 */
    const isUser = useMemo(() => {
        return +(info?.UserId || 0) === userInfo.user_id
    }, [info, userInfo])
    /** 是否是编辑页面 */
    const isModify = useMemo(() => {
        if (!pluginId) return false
        if (!info) return false
        else return true
    }, [pluginId, info])

    // 是否展示复制按钮
    const showCopyBtn = useMemo(() => {
        // 新建不展示
        if (!isModify) return false
        // 本地插件不展示
        if (isPureLocal) return false
        // 非同私有域不展示
        if (!isSameBaseUrl) return false
        // 同作者不展示
        if (isUser) return false
        return true
    }, [isModify, isPureLocal, isSameBaseUrl, isUser])
    // 是否展示提交按钮
    const showSubmitBtn = useMemo(() => {
        // 新建不展示
        if (!isModify) return false
        // 本地插件不展示
        if (isPureLocal) return false
        // 非同私有域不展示
        if (!isSameBaseUrl) return false
        return true
    }, [isModify, isPureLocal, isSameBaseUrl])
    // 是否展示同步按钮
    const showSyncBtn = useMemo(() => {
        // 新建展示
        if (!isModify) return true
        // 本地插件展示
        if (isPureLocal) return true
        // 非同私有域展示
        if (!isSameBaseUrl) return true
        return false
    }, [isModify, isPureLocal, isSameBaseUrl])
    /** ---------- 页面判断变量和按钮展示逻辑块 start ---------- */

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

        data.Content = code

        return toolDelInvalidKV(data)
    })

    // 插件本地保存
    const saveLocal: (modify: PluginDataProps) => Promise<YakScript> = useMemoizedFn((modify) => {
        return new Promise((resolve, reject) => {
            // 新建还是编辑逻辑
            let isModifyState: boolean = false

            // 页面是新建还是编辑
            if (!isModify) {
                isModifyState = false
            } else {
                // 编辑插件是否为纯本地插件
                if (isPureLocal) {
                    isModifyState = true
                } else {
                    // 编辑插件是否改动名字
                    if (modify.ScriptName === info?.ScriptName) {
                        isModifyState = true
                    } else {
                        isModifyState = false
                    }
                }
            }

            const request: localYakInfo = convertLocalToLocalInfo(isModifyState, {info: info, modify: modify})
            if (!pluginId && newToDebugId.current) request.Id = newToDebugId.current
            console.log("local-api", request)
            if (!saveLoading) setSaveLoading(true)
            ipcRenderer
                .invoke("SaveNewYakScript", request)
                .then((data: YakScript) => {
                    yakitNotify("success", "创建 / 保存 插件成功")
                    setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                    onLocalAndOnlineSend(data)
                    resolve(data)
                })
                .catch((e: any) => {
                    reject(e)
                })
        })
    })

    /** 页面右上角的按钮组操作 start */
    const debugPlugin = useMemoizedFn((data: YakScript) => {
        const yakScriptInfo: YakScript = {...data}
        const exec = (extraParams?: YakExecutorParam[]) => {
            if (yakScriptInfo.Params.length <= 0) {
                showModal({
                    title: "立即执行",
                    width: 1000,
                    content: (
                        <>
                            <YakScriptRunner
                                consoleHeight={"200px"}
                                debugMode={true}
                                script={yakScriptInfo}
                                params={[...(extraParams || [])]}
                            />
                        </>
                    )
                })
            } else {
                let m = showModal({
                    title: "确认想要执行的参数",
                    width: "70%",
                    content: (
                        <>
                            <YakScriptParamsSetter
                                {...yakScriptInfo}
                                saveDebugParams={true}
                                onParamsConfirm={(params) => {
                                    m.destroy()
                                    showModal({
                                        title: "立即执行",
                                        width: 1000,
                                        content: (
                                            <>
                                                <YakScriptRunner
                                                    debugMode={true}
                                                    script={yakScriptInfo}
                                                    params={[...params, ...(extraParams || [])]}
                                                />
                                            </>
                                        )
                                    })
                                }}
                            />
                        </>
                    )
                })
            }
        }
        if (yakScriptInfo.EnablePluginSelector) {
            queryYakScriptList(
                yakScriptInfo.PluginSelectorTypes || "mitm,port-scan",
                (i) => {
                    exec([{Key: "__yakit_plugin_names__", Value: i.map((i) => i.ScriptName).join("|")}])
                },
                undefined,
                10,
                undefined,
                undefined,
                undefined,
                () => {
                    exec([{Key: "__yakit_plugin_names__", Value: "no-such-plugin"}])
                }
            )
        } else {
            exec()
        }
    })
    // 调试
    const onDebug = useMemoizedFn(async () => {
        if (saveLoading || onlineLoading || modifyLoading) return
        setSaveLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        // 基础验证未通过
        if (!obj) {
            closeSaveLoading()
            return
        }
        // 出现未知错误，未获取到插件名
        if (!obj.ScriptName) {
            yakitNotify("error", "未获取到插件名，请关闭页面后重试")
            closeSaveLoading()
            return
        }

        saveLocal(obj)
            .then((res) => {
                if (!isModify) {
                    newToDebugId.current = +res.Id || 0
                }
                debugPlugin(res)
            })
            .catch((e) => {
                yakitNotify("error", `调试操作需保存，保存失败: ${e}`)
            })
            .finally(() => {
                closeSaveLoading()
            })
    })

    const [onlineLoading, setOnlineLoading] = useState<boolean>(false)
    // 同步至云端
    const onSyncCloud = useMemoizedFn(async () => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "登录后才可同步至云端")
            return
        }
        if (onlineLoading || modifyLoading || saveLoading) return
        setOnlineLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) {
            setTimeout(() => {
                setOnlineLoading(false)
            }, 200)
            return
        }

        modalTypeRef.current = "close"
        isUpload.current = true
        modifyInfo.current = convertLocalToRemoteInfo(isModify, {info: info, modify: obj})
        setCloudHint({isCopy: false, visible: true})
    })
    // 复制至云端
    const onCopyCloud = useMemoizedFn(async () => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "登录后才可复制至云端")
            return
        }
        if (onlineLoading || modifyLoading || saveLoading) return
        setOnlineLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) {
            setTimeout(() => {
                setOnlineLoading(false)
            }, 200)
            return
        }

        modalTypeRef.current = "close"
        isUpload.current = true
        modifyInfo.current = convertLocalToRemoteInfo(isModify, {info: info, modify: obj})

        setCloudHint({isCopy: true, visible: true})
    })
    const [modifyLoading, setModifyLoading] = useState<boolean>(false)
    // 提交
    const onSubmit = useMemoizedFn(async () => {
        if (!userInfo.isLogin) {
            yakitNotify("error", "登录后才可提交修改")
            return
        }
        if (modifyLoading || onlineLoading || saveLoading) return
        setModifyLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        if (!obj) {
            setTimeout(() => {
                setModifyLoading(false)
            }, 200)
            return
        }

        modalTypeRef.current = "close"
        isUpload.current = false
        modifyInfo.current = convertLocalToRemoteInfo(isModify, {info: info, modify: obj})

        if (info && modifyInfo.current.script_name !== info?.ScriptName) {
            yakitNotify("error", "提交请勿修改插件名")
            setTimeout(() => {
                setModifyLoading(false)
            }, 200)
            return
        }

        // 私密插件只填写描述修改内容
        if (modifyInfo.current.is_private) {
            setModifyReason(true)
        } else {
            // 公开插件先进行评分，在填写描述修改内容
            setPluginTest(true)
        }
    })
    // 保存
    const [saveLoading, setSaveLoading] = useState<boolean>(false)
    const closeSaveLoading = useMemoizedFn(() => {
        setTimeout(() => {
            setSaveLoading(false)
        }, 200)
        onDestroyInstance(false)
    })
    // 按钮的保存功能执行前必须将关闭逻辑设置到"close"
    const onBtnSave = useMemoizedFn(() => {
        modalTypeRef.current = "close"
        onSave()
    })
    const onSave = useMemoizedFn(async () => {
        if (saveLoading || onlineLoading || modifyLoading) return
        setSaveLoading(true)

        const obj: PluginDataProps | undefined = await convertPluginInfo()
        // 基础验证未通过
        if (!obj) {
            closeSaveLoading()
            return
        }
        // 出现未知错误，未获取到插件名
        if (!obj.ScriptName) {
            yakitNotify("error", "未获取到插件名，请关闭页面后重试")
            closeSaveLoading()
            return
        }

        saveLocal(obj)
            .then((res) => {
                onDestroyInstance(true)
            })
            .catch((e) => {
                yakitNotify("error", `保存插件失败: ${e}`)
            })
            .finally(() => {
                closeSaveLoading()
            })
    })

    // 同步&复制云端
    const modifyInfo = useRef<API.PluginsRequest>()
    const [cloudHint, setCloudHint] = useState<{isCopy: boolean; visible: boolean}>({isCopy: false, visible: false})
    const onCloudHintCallback = useMemoizedFn((isCallback: boolean, param?: {type?: string; name?: string}) => {
        // 手动关闭弹窗|没有获取到进行修改的插件信息
        if (!isCallback || !modifyInfo.current) {
            setCloudHint({isCopy: false, visible: false})
            setTimeout(() => {
                // 中断同步|复制至云端按钮的加载状态
                setOnlineLoading(false)
            }, 100)
            if (!modifyInfo.current) yakitNotify("error", "未获取到插件信息，请重试!")
            return
        }

        setTimeout(() => {
            setCloudHint({isCopy: false, visible: false})
        }, 100)

        // 点击弹窗的提交按钮
        if (cloudHint.isCopy) {
            const request: API.CopyPluginsRequest = {
                ...modifyInfo.current,
                script_name: param?.name || modifyInfo.current.script_name,
                is_private: true,
                base_plugin_id: +(info?.OnlineId || 0)
            }
            copyOnlinePlugin(request, (value) => {
                if (value) {
                    if (typeof value !== "boolean") onLocalAndOnlineSend(value, true)
                    onUpdatePageList("owner")
                    onDestroyInstance(true)
                }
                setTimeout(() => {
                    setOnlineLoading(false)
                }, 200)
            })
        } else {
            // 公开的新插件需要走基础检测流程
            if (param && param?.type === "public") {
                modifyInfo.current = {...modifyInfo.current, is_private: false}
                setPluginTest(true)
            }
            // 私密的插件直接保存，不用走基础检测流程
            if (param && param?.type === "private") {
                uploadOnlinePlugin({...modifyInfo.current, is_private: true}, false, (value) => {
                    if (value) {
                        if (typeof value !== "boolean") onLocalAndOnlineSend(value, true)
                        onUpdatePageList("owner")
                        onDestroyInstance(true)
                    }
                    setTimeout(() => {
                        setOnlineLoading(false)
                    }, 200)
                })
            }
        }
    })
    // 插件基础检测
    const [pluginTest, setPluginTest] = useState<boolean>(false)
    // 插件检测后是否执行上传操作
    const isUpload = useRef<boolean>(true)
    const onTestCallback = useMemoizedFn((value: boolean, info?: YakScript) => {
        // 公开插件修改提交时，评分后打开描述修改原因弹窗
        if (!isUpload.current) {
            if (value) {
                setTimeout(() => {
                    setPluginTest(false)
                    setModifyReason(true)
                }, 1000)
            } else {
                setPluginTest(false)
                setTimeout(() => {
                    // 终端提交按钮的加载状态
                    setModifyLoading(false)
                }, 200)
            }
            return
        }

        // 评分并上传后的回调逻辑
        if (value) {
            if (info) {
                if (typeof value !== "boolean") onLocalAndOnlineSend(value, true)
                onUpdatePageList("owner")
                onUpdatePageList("online")
                onDestroyInstance(true)
            }
        }
        setTimeout(() => {
            setPluginTest(false)
            setOnlineLoading(false)
        }, 500)
    })
    // 描述修改插件内容
    const [modifyReason, setModifyReason] = useState<boolean>(false)
    const onModifyReason = useMemoizedFn((isSubmit: boolean, content?: string) => {
        if (isSubmit && modifyInfo.current) {
            uploadOnlinePlugin({...modifyInfo.current, uuid: info?.UUID, logDescription: content}, true, (value) => {
                if (value) {
                    // if (typeof value !== "boolean") onLocalAndOnlineSend(value, true)
                    onUpdatePageList("owner")
                    onUpdatePageList("online")
                    onDestroyInstance(true)
                }
                setTimeout(() => {
                    setModifyLoading(false)
                }, 200)
            })
        }
        if (!isSubmit) {
            setTimeout(() => {
                setModifyLoading(false)
            }, 200)
        }
        setModifyReason(false)
    })

    // 数据重置
    const onReset = useMemoizedFn(() => {
        newToDebugId.current = 0
        setTypeParams({
            Type: "yak",
            Kind: "bug"
        })
        setInfoParams({ScriptName: ""})
        setSettingParams({Params: [], Content: ""})
        setCode(pluginTypeToName["yak"]?.content || "")
    })

    // 注册页面外部操作的二次提示配置信息
    const {setSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    // 二次提示框的实例
    const modalRef = useRef<any>(null)
    // 二次提示框的操作类型
    const modalTypeRef = useRef<string>("close")
    // 在已打开编辑插件页面时，再次触发编辑插件功能时的插件id
    const otherId = useRef<number>(0)
    const setOtherId = useMemoizedFn((id: string) => {
        otherId.current = +id || 0
    })
    // 接收编辑插件的插件Id
    useEffect(() => {
        emiter.on("sendEditPluginId", setOtherId)
        return () => {
            emiter.off("sendEditPluginId", setOtherId)
        }
    }, [])

    useEffect(() => {
        if (pluginId) {
            setSubscribeClose(YakitRoute.ModifyYakitScript, {
                close: {
                    title: "插件未保存",
                    content: "是否要将修改内容保存到本地?",
                    confirmLoading: saveLoading,
                    onOk: (m) => {
                        modalRef.current = m
                        modalTypeRef.current = "close"
                        onSave()
                    },
                    onCancel: () => {
                        closePage("modify")
                    }
                },
                reset: {
                    title: "插件未保存",
                    content: "是否要将修改内容保存到本地，并编辑另一个插件?",
                    confirmLoading: saveLoading,
                    onOk: (m) => {
                        modalRef.current = m
                        modalTypeRef.current = "reset"
                        onSave()
                    },
                    onCancel: () => {
                        if (otherId.current) {
                            fetchPluginInfo(otherId.current)
                        } else {
                            yakitNotify("error", "未获取到编辑插件Id,请重新操作")
                        }
                    }
                }
            })
        } else {
            setSubscribeClose(YakitRoute.AddYakitScript, {
                close: {
                    title: "插件未保存",
                    content: "是否要将插件保存到本地?",
                    confirmLoading: saveLoading,
                    onOk: (m) => {
                        modalRef.current = m
                        modalTypeRef.current = "close"
                        onSave()
                    },
                    onCancel: () => {
                        closePage("new")
                    }
                },
                reset: {
                    title: "插件未保存",
                    content: "是否要将插件保存到本地，并新建插件?",
                    confirmLoading: saveLoading,
                    onOk: (m) => {
                        modalRef.current = m
                        modalTypeRef.current = "reset"
                        onSave()
                    },
                    onCancel: () => {
                        onReset()
                    }
                }
            })
        }

        return () => {
            if (pluginId) {
                removeSubscribeClose(YakitRoute.ModifyYakitScript)
            } else {
                removeSubscribeClose(YakitRoute.AddYakitScript)
            }
        }
    }, [pluginId])
    // 销毁二次提示的实例(新建|编辑 状态放一起处理)
    const onDestroyInstance = useMemoizedFn((state?: boolean) => {
        try {
            if (modalRef.current) modalRef.current.destroy()
        } catch (error) {}
        // 销毁后的额外操作
        if (state) {
            if (modalTypeRef.current === "close") {
                closePage(isModify ? "modify" : "new")
                return
            }

            if (isModify) {
                if (modalTypeRef.current === "reset") {
                    if (otherId.current) {
                        fetchPluginInfo(otherId.current)
                    } else {
                        yakitNotify("error", "未获取到编辑插件Id,请重新操作")
                    }
                }
            } else {
                if (modalTypeRef.current === "reset") onReset()
            }
        }
    })
    // 渲染端通信-关闭页面
    const closePage = useMemoizedFn((type: string) => {
        let route: YakitRoute = YakitRoute.AddYakitScript
        switch (type) {
            case "modify":
                route = YakitRoute.ModifyYakitScript
                break
            case "new":
                route = YakitRoute.AddYakitScript
                break

            default:
                break
        }
        emiter.emit("closePage", JSON.stringify({route: route}))
    })

    const {pages} = usePageInfo((s) => ({pages: s.pages}), shallow)
    // 本地保存成功后的信号发送
    const onLocalAndOnlineSend = useMemoizedFn((info: YakScript, isOnline?: boolean) => {
        let route: YakitRoute = YakitRoute.AddYakitScript
        if (isModify) {
            route = YakitRoute.ModifyYakitScript
        }

        const targetCache: PageNodeItemProps = (pages.get(route)?.pageList || [])[0]
        let parent: YakitRoute | undefined = undefined
        if (targetCache?.pageParamsInfo && targetCache.pageParamsInfo?.pluginInfoEditor) {
            parent = targetCache.pageParamsInfo.pluginInfoEditor.source
        }

        if (parent) {
            const param: SavePluginInfoSignalProps = {
                route: parent,
                isOnline: !!isOnline,
                pluginName: info.ScriptName || ""
            }
            emiter.emit("savePluginInfoSignal", JSON.stringify(param))
        }
    })
    // 保存插件信息后-刷新商店|我的|本地列表数据
    const onUpdatePageList = useMemoizedFn((key: string) => {
        switch (key) {
            case "online":
                emiter.emit("onRefOnlinePluginList", "")
                break
            case "owner":
                emiter.emit("onRefUserPluginList", "")
                break
            case "local":
                emiter.emit("onRefLocalPluginList", "")
                break

            default:
                break
        }
    })

    return (
        <div className={styles["plugin-edit-details-wrapper"]}>
            <div className={styles["plugin-edit-details-header"]}>
                <div className={styles["header-title"]}>
                    <div className={styles["title-style"]}>{pluginId ? "修改插件" : "新建插件"}</div>
                    {!!info && (
                        <div className={styles["title-extra-wrapper"]}>
                            <YakitTag color={pluginTypeToName[info.Type]?.color as any}>
                                {pluginTypeToName[info.Type]?.name || ""}
                            </YakitTag>
                            <div
                                className={classNames(styles["script-name"], "yakit-content-single-ellipsis")}
                                title={info.ScriptName}
                            >
                                {info.ScriptName}
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
                            maxWidth={1100}
                            icon={<OutlineCodeIcon />}
                            type='outline2'
                            size='large'
                            name={"调试"}
                            onClick={onDebug}
                        />

                        {showCopyBtn && (
                            <FuncBtn
                                maxWidth={1100}
                                icon={<OutlineDocumentduplicateIcon />}
                                type='outline2'
                                size='large'
                                name={"复制至云端"}
                                loading={onlineLoading}
                                onClick={onCopyCloud}
                            />
                        )}

                        {showSubmitBtn && (
                            <FuncBtn
                                maxWidth={1100}
                                icon={<OutlinePaperairplaneIcon />}
                                type='outline1'
                                size='large'
                                name={"提交"}
                                loading={modifyLoading}
                                onClick={onSubmit}
                            />
                        )}

                        {showSyncBtn && (
                            <FuncBtn
                                maxWidth={1100}
                                icon={<OutlineClouduploadIcon />}
                                type='outline1'
                                size='large'
                                name={"同步至云端"}
                                loading={onlineLoading}
                                onClick={onSyncCloud}
                            />
                        )}

                        <FuncBtn
                            maxWidth={1100}
                            icon={<SolidStoreIcon />}
                            size='large'
                            name={"保存"}
                            loading={saveLoading}
                            onClick={onBtnSave}
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
                                    <YakitEditor
                                        type={typeParams.Type }
                                        value={code}
                                        setValue={setCode}
                                    />
                                </div>
                            </div>
                        </div>
                        <PluginEditorModal
                            language={typeParams.Type}
                            visible={codeModal}
                            setVisible={onModifyCode}
                            code={code}
                        />
                    </div>
                </div>
            </div>

            <PluginSyncAndCopyModal {...cloudHint} setVisible={onCloudHintCallback} />
            <UploadPluginModal
                isUpload={isUpload.current}
                plugin={modifyInfo.current}
                visible={pluginTest}
                onCancel={onTestCallback}
            />
            <ModifyPluginReason visible={modifyReason} onCancel={onModifyReason} />
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
    /** 源码语言 */
    language?: string
    visible: boolean
    setVisible: (content: string) => any
    code: string
}
/** @name 源码放大版编辑器 */
export const PluginEditorModal: React.FC<PluginEditorModalProps> = memo((props) => {
    const {language = "yak", visible, setVisible, code} = props

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
            subTitle={
                <div className={styles["plugin-editor-modal-subtitle"]}>
                    <span>可在此定义插件输入原理，并编写输出 UI</span>
                    <span>按 Esc 即可退出全屏</span>
                </div>
            }
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
                <YakitEditor type={language} value={content} setValue={setContent} />
            </div>
        </YakitModal>
    )
})

interface PluginDiffEditorModalProps {
    /** 源码语言 */
    language?: string
    /** 原代码 */
    oldCode: string
    /** 对比代码 */
    newCode: string
    visible: boolean
    setVisible: (content: string) => any
}
/** @name 对比器放大版编辑器 */
export const PluginDiffEditorModal: React.FC<PluginDiffEditorModalProps> = memo((props) => {
    const {language = "yak", oldCode, newCode, visible, setVisible} = props

    const [content, setContent] = useState<string>("")
    const [update, setUpdate] = useState<boolean>(false)

    useEffect(() => {
        if (visible) {
            setContent(newCode || "")
            setUpdate(!update)
        } else {
            setContent("")
        }
    }, [visible])

    return (
        <YakitModal
            title='源码'
            subTitle={
                <div className={styles["plugin-editor-modal-subtitle"]}>
                    <span>可在此定义插件输入原理，并编写输出 UI</span>
                    <span>按 Esc 即可退出全屏</span>
                </div>
            }
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
                <YakitDiffEditor
                    leftDefaultCode={oldCode}
                    leftReadOnly={true}
                    rightDefaultCode={content}
                    setRightCode={setContent}
                    triggerUpdate={update}
                    language={language}
                />
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
    isUpload: boolean
    plugin?: API.PluginsEditRequest
    visible: boolean
    /** 关闭弹窗(true:合格|false:不合格) */
    onCancel: (value: boolean, info?: YakScript) => any
}
/** @name 插件源码评分-合格后自动上传 */
const UploadPluginModal: React.FC<UploadPluginModalProps> = memo((props) => {
    const {isUpload, plugin, visible, onCancel} = props

    const onCallback = useMemoizedFn((value: boolean) => {
        if (!isUpload) {
            onCancel(value)
            return
        }
        if (value) {
            if (plugin) {
                uploadOnlinePlugin(plugin, false, (value) => {
                    onCancel(!!value, value)
                })
            } else {
                onCancel(false)
            }
        } else {
            onCancel(value)
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

interface ModifyPluginReasonProps {
    visible: boolean
    onCancel: (isSubmit: boolean, content?: string) => any
}
/** @name 描述修改内容 */
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
            title='描述修改内容'
            type='white'
            width={448}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            onCancel={() => onCancel(false)}
            onOk={onSubmit}
        >
            <div className={styles["modify-plugin-reason-wrapper"]}>
                <YakitInput.TextArea
                    placeholder='请简单描述一下修改内容，方便作者审核...'
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
