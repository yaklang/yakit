import React, {memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {Anchor, Form, Radio} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineAdjustmentsIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineChevronrightIcon,
    OutlineClouduploadIcon,
    OutlineCodeIcon,
    OutlineDocumentduplicateIcon,
    OutlineIdentificationIcon,
    OutlinePaperairplaneIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineViewgridIcon
} from "@/assets/icon/outline"
import {
    PluginBaseParamProps,
    PluginDataProps,
    PluginSettingParamProps,
    YakParamProps,
    localYakInfo
} from "../pluginsType"
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PluginInfoRefProps, PluginSettingRefProps} from "../baseTemplateType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {success, yakitNotify} from "@/utils/notification"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {CodeScoreModal, FuncBtn, PluginTypeTag} from "../funcTemplate"
import {YakScript} from "@/pages/invoker/schema"
import {
    ParamsToGroupByGroupName,
    convertLocalToLocalInfo,
    convertLocalToRemoteInfo,
    copyOnlinePlugin,
    getValueByType,
    onCodeToInfo,
    uploadOnlinePlugin
} from "./utils"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {PluginModifyInfo, PluginModifySetting} from "../baseTemplate"
import emiter from "@/utils/eventBus/eventBus"
import {toolDelInvalidKV} from "@/utils/tool"
import {useSubscribeClose} from "@/store/tabSubscribe"
import {YakitRoute} from "@/routes/newRouteConstants"
import {DefaultTypeList, GetPluginLanguage, PluginGV, pluginTypeToName} from "../builtInData"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {getRemoteValue} from "@/utils/kv"
import {CodeGV, RemoteGV} from "@/yakitGV"
import {SolidEyeIcon, SolidEyeoffIcon, SolidStoreIcon} from "@/assets/icon/solid"
import {PluginDebug} from "../pluginDebug/PluginDebug"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitWindow} from "@/components/yakitUI/YakitWindow/YakitWindow"
import {
    ExecuteEnterNodeByPluginParams,
    FormContentItemByType
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {CustomPluginExecuteFormValue} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"

import "../plugins.scss"
import styles from "./pluginEditDetails.module.scss"
import classNames from "classnames"

const {Link} = Anchor
const {YakitPanel} = YakitCollapse

const {ipcRenderer} = window.require("electron")

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

    const [loading, setLoading] = useState<boolean>(false)
    // 编辑时的旧数据
    const [info, setInfo] = useState<YakScript>()

    /** --------------- 旧插件参数迁移提示 Start --------------- */
    const [oldShow, setOldShow] = useState<boolean>(false)
    const oldParamsRef = useRef<string>("")
    const [copyLoading, setCopyLoading] = useState<boolean>(false)
    // 查询插件是否有旧数据需要迁移提示
    const fetchOldData = useMemoizedFn((name: string) => {
        oldParamsRef.current = ""

        ipcRenderer
            .invoke("YaklangGetCliCodeFromDatabase", {ScriptName: name})
            .then((res: {Code: string; NeedHandle: boolean}) => {
                // console.log("是否有旧数据的提示框", res)
                if (res.NeedHandle && !oldShow) {
                    oldParamsRef.current = res.Code
                    if (!oldShow) setOldShow(true)
                }
            })
            .catch((e: any) => {
                yakitNotify("error", "查询旧数据迁移失败: " + e)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })
    const onOldDataOk = useMemoizedFn(() => {
        if (!copyLoading) setCopyLoading(true)
        ipcRenderer.invoke("set-copy-clipboard", oldParamsRef.current)
        setTimeout(() => {
            onOldDataCancel()
            success("复制成功")
            setCopyLoading(false)
        }, 500)
    })
    const onOldDataCancel = useMemoizedFn(() => {
        if (oldShow) setOldShow(false)
    })
    /** --------------- 旧插件参数迁移提示 End --------------- */
    // 数组去重
    const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    /** 通过ID获取插件旧数据 */
    const fetchPluginInfo = useMemoizedFn((id: number) => {
        ipcRenderer
            .invoke("GetYakScriptById", {Id: id})
            .then(async (res: YakScript) => {
                // console.log("编辑插件-获取插件信息", res)
                if (res.Type === "yak") fetchOldData(res.ScriptName)
                let newTags = !res.Tags || res.Tags === "null" ? [] : (res.Tags || "").split(",")
                setInfo(res)
                setPluginType(res.Type || "yak")
                const codeInfo =
                    GetPluginLanguage(res.Type || "yak") === "yak"
                        ? await onCodeToInfo(res.Type || "yak", res.Content)
                        : null
                if (codeInfo && codeInfo.Tags.length > 0) {
                    // 去重
                    newTags = filter([...newTags, ...codeInfo.Tags])
                }
                setInfoParams({
                    ScriptName: res.ScriptName,
                    Help: res.Help || res.ScriptName,
                    RiskDetail: Array.isArray(res.RiskInfo) ? res.RiskInfo : [],
                    Tags: newTags
                })
                setCacheTags(newTags)
                setSettingParams({
                    EnablePluginSelector: res.EnablePluginSelector,
                    PluginSelectorTypes: res.PluginSelectorTypes,
                    Content: res.Content
                })
                setCode(res.Content)
                // 编辑插件页面-初始时默认展示第二部分
                setTimeout(() => {
                    if (res.Type !== "yak") {
                        setLoading(false)
                    }
                    setPath("setting")
                    document.querySelector("#plugin-details-setting")?.scrollIntoView(true)
                }, 500)
            })
            .catch((e: any) => {
                yakitNotify("error", "查询插件信息失败:" + e)
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    useEffect(() => {
        if (pluginId) {
            setLoading(true)
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
        fetchPrivateDomain()
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
    // 插件类型
    const [pluginType, setPluginType] = useState<string>("yak")
    const fetchPluginType = useMemoizedFn(() => {
        return pluginType
    })
    const onType = useMemoizedFn((value: string) => {
        if (pluginType === value) return

        // 不同类型对应的基础信息和配置信息的重置
        let infoData: PluginBaseParamProps = {...(fetchInfoData() || getInfoParams())}

        // 切换脚本类型时, 删除DNSLog和HTTP数据包变形代表的tag字段
        infoData = {
            ...infoData,
            Tags: infoData.Tags?.filter((item) => {
                return item !== PluginGV.PluginYakDNSLogSwitch && item !== PluginGV.PluginCodecHttpSwitch
            })
        }

        setPluginType(value)
        // 不同类型对应的不同默认源码
        setCode(pluginTypeToName[value]?.content || "")
        setInfoParams({...infoData})
        setSettingParams({Content: ""})
    })
    // 插件基础信息-相关逻
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
    const onTagsCallback = useMemoizedFn((v: string[]) => {
        setCacheTags(v || [])
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
    const [settingParams, setSettingParams] = useState<PluginSettingParamProps>({
        Content: ""
    })
    // 插件源码-相关逻辑
    const [code, setCode] = useState<string>(pluginTypeToName["yak"]?.content || "")
    // 源码全屏框
    const [codeModal, setCodeModal] = useState<boolean>(false)
    const onOpenCodeModal = useMemoizedFn(() => {
        if (codeModal) return
        setCodeModal(true)
        if (previewParamsShow) setPreviewParamsShow(false)
    })
    const onModifyCode = useMemoizedFn((content: string) => {
        if (code !== content) setCode(content)
        setCodeModal(false)
    })
    // 源码全屏版-预览参数去调试
    const onCodeModalToDegbug = useMemoizedFn((params: YakParamProps[], code: string) => {
        const baseInfo: PluginBaseParamProps = fetchInfoData() || getInfoParams()
        const info: PluginDataProps = {
            ScriptName: baseInfo.ScriptName,
            Type: pluginType,
            Params: params,
            Content: code
        }
        setDebugPlugin({...info})
        onModifyCode(code)
        setDebugShow(true)
    })
    /** ---------- 页面可见数据操作逻辑块 end ---------- */

    /** --------------- 预览参数逻辑 Start --------------- */
    const [previewParams, setPreviewParams] = useState<YakParamProps[]>([])
    const [previewParamsShow, setPreviewParamsShow, getPreviewParamsShow] = useGetState<boolean>(false)

    /** 预览参数框内容在更新代码后的联动更新预览参数 */
    useDebounceEffect(
        () => {
            if (!getPreviewParamsShow()) return
            else {
                onCodeToInfo(fetchPluginType(), code)
                    .then((value) => {
                        if (value) setPreviewParams(value.CliParameter)
                    })
                    .catch(() => {})
            }
        },
        [code],
        {wait: 500}
    )
    const onOpenPreviewParams = useMemoizedFn(async () => {
        const info = await onCodeToInfo(fetchPluginType(), code)
        if (!info) return
        setPreviewParams(info.CliParameter)
        if (!previewParamsShow) setPreviewParamsShow(true)
    })

    const paramsForm = useRef<PreviewParamsRefProps>()
    const [previewCloseLoading, setPreviewCloseLoading] = useState<boolean>(false)
    // 去调试
    const onPreviewToDebug = useMemoizedFn(() => {
        if (previewCloseLoading) return
        setPreviewCloseLoading(true)

        if (paramsForm && paramsForm.current) {
            const formValue: Record<string, any> = paramsForm.current?.onGetValue() || {}
            let paramsList: YakParamProps[] = []
            for (let el of previewParams) {
                paramsList.push({
                    ...el,
                    Value: formValue[el.Field]
                })
            }
            const baseInfo: PluginBaseParamProps = fetchInfoData() || getInfoParams()
            const info: PluginDataProps = {
                ScriptName: baseInfo.ScriptName,
                Type: pluginType,
                Params: paramsList,
                Content: code
            }

            setDebugPlugin({...info})
            onCancelPreviewParams()
            setDebugShow(true)
        }
        setTimeout(() => {
            setPreviewCloseLoading(false)
        }, 200)
    })
    // 结束预览
    const onCancelPreviewParams = useMemoizedFn(() => {
        if (previewParamsShow) {
            if (paramsForm && paramsForm.current) paramsForm.current.onReset()
            setPreviewParamsShow(false)
        }
    })
    /** --------------- 预览参数逻辑 End --------------- */

    // 获取插件所有配置参数
    const convertPluginInfo = useMemoizedFn(async () => {
        if (!pluginType) {
            yakitNotify("error", "请选择脚本类型")
            return
        }

        const data: PluginDataProps = {
            ScriptName: "",
            Type: pluginType,
            Content: code
        }

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
            data.Help = info?.Help
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
            data.EnablePluginSelector = setting?.EnablePluginSelector
            data.PluginSelectorTypes = setting?.PluginSelectorTypes
        }

        const codeInfo = GetPluginLanguage(data.Type) === "yak" ? await onCodeToInfo(data.Type, data.Content) : null
        let newTags = data.Tags || ""
        if (codeInfo && codeInfo.Tags.length > 0) {
            newTags += `,${codeInfo.Tags.join(",")}`
            // 去重
            newTags = filter(newTags.split(",")).join(",")
        }
        data.Tags = newTags
        // yak类型才解析参数和风险
        if (data.Type === "yak" && codeInfo) {
            data.RiskDetail = codeInfo.RiskInfo.filter((item) => item.Level && item.CVE && item.TypeVerbose)
            data.Params = codeInfo.CliParameter
        }

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
                        // 编辑插件改名字算新建
                        isModifyState = false
                    }
                }
            }

            const request: localYakInfo = convertLocalToLocalInfo(isModifyState, {info: info, modify: modify})
            // console.log("grpc-SaveNewYakScript", JSON.stringify(request))
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

    /** --------------- 插件调试 Start --------------- */
    const [debugPlugin, setDebugPlugin] = useState<PluginDataProps>()
    const [debugShow, setDebugShow] = useState<boolean>(false)

    const onCancelDebug = useMemoizedFn(() => {
        if (debugShow) setDebugShow(false)
    })
    const onMerge = useMemoizedFn((v: string) => {
        setCode(v)
        setDebugShow(false)
        setDebugPlugin(undefined)
    })

    // 将页面数据转化为插件调试信息
    const convertDebug = useMemoizedFn(() => {
        return new Promise(async (resolve, reject) => {
            setDebugPlugin(undefined)
            try {
                const paramsList = pluginType === "yak" ? await onCodeToInfo(pluginType, code) : {CliParameter: []}
                if (!paramsList) {
                    resolve("false")
                    return
                }
                const baseInfo: PluginBaseParamProps = fetchInfoData() || getInfoParams()
                const info: PluginDataProps = {
                    ScriptName: baseInfo.ScriptName,
                    Type: pluginType,
                    Params: paramsList.CliParameter,
                    Content: code
                }
                setDebugPlugin({...info})

                resolve("true")
            } catch (error) {
                resolve("false")
            }
        })
    })

    // 调试
    const onDebug = useMemoizedFn(async () => {
        if (saveLoading || onlineLoading || modifyLoading) return
        if (debugShow) return

        const result = await convertDebug()
        // 获取插件信息错误
        if (result === "false") return
        setDebugShow(true)
    })
    /** --------------- 插件调试 End --------------- */

    /** 页面右上角的按钮组操作 start */
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
        oldParamsRef.current = ""

        setPluginType("yak")
        setInfoParams({ScriptName: ""})
        setCacheTags([])
        setSettingParams({Content: ""})
        setCode(pluginTypeToName["yak"]?.content || "")

        setPreviewParams([])
        setDebugPlugin(undefined)
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
                    maskClosable: false,
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
                    maskClosable: false,
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
                    maskClosable: false,
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
                    maskClosable: false,
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

    const divRef = useRef<HTMLDivElement>(null)

    return (
        <div ref={divRef} className={styles["plugin-edit-details-wrapper"]}>
            <YakitSpin spinning={loading}>
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
                                    <YakitButton
                                        className={path === "type" ? styles["path-btn"] : undefined}
                                        type='text2'
                                    >
                                        <OutlineViewgridIcon />
                                        类型选择
                                    </YakitButton>
                                }
                            />
                            <Link href='' title={<OutlineChevronrightIcon className={styles["paht-icon"]} />} />
                            <Link
                                href='#plugin-details-info'
                                title={
                                    <YakitButton
                                        className={path === "info" ? styles["path-btn"] : undefined}
                                        type='text2'
                                    >
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
                                                    <PluginTypeTag
                                                        {...item}
                                                        disabled={isModify || item.key === "lua"}
                                                        checked={pluginType === item.key}
                                                        setCheck={() => onType(item.key)}
                                                    />
                                                )
                                            })}
                                        </div>
                                        <div className={styles["list-row"]}>
                                            {DefaultTypeList.slice(3, 6).map((item) => {
                                                return (
                                                    <PluginTypeTag
                                                        {...item}
                                                        disabled={isModify || item.key === "lua"}
                                                        checked={pluginType === item.key}
                                                        setCheck={() => onType(item.key)}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* 基础信息 */}
                        <div id='plugin-details-info' className={styles["body-info-wrapper"]}>
                            <div className={styles["header-wrapper"]}>基础信息</div>
                            <div className={styles["info-body"]}>
                                <PluginModifyInfo ref={infoRef} data={infoParams} tagsCallback={onTagsCallback} />
                            </div>
                        </div>
                        {/* 插件配置 */}
                        <div id='plugin-details-setting' className={styles["body-setting-wrapper"]}>
                            <div className={styles["header-wrapper"]}>
                                插件配置
                                <div
                                    className={styles["subtitle-help-wrapper"]}
                                    onClick={() => {
                                        ipcRenderer.invoke("open-url", CodeGV.PluginParamsHelp)
                                    }}
                                >
                                    <span className={styles["text-style"]}>帮助文档</span>
                                    <OutlineQuestionmarkcircleIcon />
                                </div>
                            </div>
                            <div className={styles["setting-body"]}>
                                <PluginModifySetting
                                    ref={settingRef}
                                    type={pluginType}
                                    tags={cacheTags || []}
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
                                        <div className={styles["header-extra"]}>
                                            {pluginType === "yak" && !previewParamsShow && (
                                                <YakitButton icon={<SolidEyeIcon />} onClick={onOpenPreviewParams}>
                                                    参数预览
                                                </YakitButton>
                                            )}
                                            <YakitButton
                                                type='text2'
                                                icon={<OutlineArrowsexpandIcon />}
                                                onClick={onOpenCodeModal}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles["editor-body"]}>
                                        <YakitEditor type={pluginType} value={code} setValue={setCode} />
                                    </div>
                                </div>
                            </div>
                            <PluginEditorModal
                                getContainer={divRef.current || undefined}
                                language={pluginType}
                                visible={codeModal}
                                setVisible={onModifyCode}
                                code={code}
                                onPreview={onCodeModalToDegbug}
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

                {debugShow && (
                    <PluginDebug
                        getContainer={divRef.current || undefined}
                        plugin={debugPlugin}
                        visible={debugShow}
                        onClose={onCancelDebug}
                        onMerge={onMerge}
                    />
                )}
            </YakitSpin>

            <YakitHint
                getContainer={divRef.current || undefined}
                wrapClassName={styles["old-data-hint-wrapper"]}
                visible={oldShow}
                title='旧数据迁移提示'
                content='由于参数设计升级，检测到数据库存储参数与插件源码里参数不同，使用会有问题，请点击“复制代码”将参数复制到插件源码中。'
                okButtonText='复制代码'
                cancelButtonText='忽略'
                okButtonProps={{loading: copyLoading}}
                onOk={onOldDataOk}
                onCancel={onOldDataCancel}
            />

            {previewParamsShow && (
                <PreviewParams
                    getContainer={divRef.current || undefined}
                    visible={previewParamsShow}
                    confirmLoading={previewCloseLoading}
                    onDebug={onPreviewToDebug}
                    onCancel={onCancelPreviewParams}
                    onOk={onCancelPreviewParams}
                    ref={paramsForm}
                    params={previewParams}
                />
            )}
        </div>
    )
}

interface PluginEditorModalProps {
    /** 指定弹窗挂载的节点，默认为body节点 */
    getContainer?: HTMLElement
    /** 源码语言 */
    language?: string
    visible: boolean
    setVisible: (content: string) => any
    code: string
    /** 预览参数回调 */
    onPreview: (params: YakParamProps[], code: string) => any
}
/** @name 插件编辑页面-源码全屏版 */
const PluginEditorModal: React.FC<PluginEditorModalProps> = memo((props) => {
    const {getContainer, language = "yak", visible, setVisible, code, onPreview} = props

    const [content, setContent] = useState<string>("")

    useEffect(() => {
        if (visible) {
            setContent(code || "")
            return () => {
                setContent("")
                setPreviewShow(false)
                setPreviewParams([])
                setPreviewCloseLoading(false)
            }
        }
    }, [visible])

    const fetchPluginType = useMemoizedFn(() => {
        return language
    })

    const [previewParams, setPreviewParams] = useState<YakParamProps[]>([])
    const [previewShow, setPreviewShow] = useState<boolean>(false)
    /** 预览参数框内容在更新代码后的联动更新预览参数 */
    useDebounceEffect(
        () => {
            if (!previewShow) return
            else {
                onCodeToInfo(fetchPluginType(), content)
                    .then((value) => {
                        if (value) setPreviewParams(value.CliParameter)
                    })
                    .catch(() => {})
            }
        },
        [content, previewShow],
        {wait: 500}
    )
    const onOpenPreviewParams = useMemoizedFn(async () => {
        const info = await onCodeToInfo(fetchPluginType(), content)
        if (!info) return
        setPreviewParams(info.CliParameter)
        if (!previewShow) setPreviewShow(true)
    })
    const paramsForm = useRef<PreviewParamsRefProps>()
    const [previewCloseLoading, setPreviewCloseLoading] = useState<boolean>(false)
    // 去调试
    const onPreviewToDebug = useMemoizedFn(() => {
        if (previewCloseLoading) return
        setPreviewCloseLoading(true)
        if (paramsForm && paramsForm.current) {
            const formValue: Record<string, any> = paramsForm.current?.onGetValue() || {}
            let paramsList: YakParamProps[] = []
            for (let el of previewParams) {
                paramsList.push({
                    ...el,
                    Value: formValue[el.Field] || undefined
                })
            }
            onPreview(paramsList, content)
        }
    })
    // 结束预览
    const onCancelPreviewParams = useMemoizedFn(() => {
        if (previewShow) {
            if (paramsForm && paramsForm.current) paramsForm.current.onReset()
            setPreviewShow(false)
        }
    })

    return (
        <>
            <YakitModal
                getContainer={getContainer}
                wrapClassName={styles["plugin-edit-page-modal"]}
                mask={false}
                title='源码'
                subTitle={
                    <div className={styles["plugin-editor-modal-subtitle"]}>
                        <span>可在此定义插件输入原理，并编写输出 UI</span>
                        <div className={styles["extra-wrapper"]}>
                            {language === "yak" && !previewShow && (
                                <YakitButton icon={<SolidEyeIcon />} onClick={onOpenPreviewParams}>
                                    参数预览
                                </YakitButton>
                            )}
                            <span>按 Esc 即可退出全屏</span>
                        </div>
                    </div>
                }
                type='white'
                width='100%'
                centered={true}
                maskClosable={false}
                closable={true}
                closeIcon={<OutlineArrowscollapseIcon className={styles["plugin-editor-modal-close-icon"]} />}
                footer={null}
                visible={visible}
                onCancel={() => setVisible(content)}
                bodyStyle={{padding: 0, flex: 1, overflow: "hidden"}}
            >
                <div className={styles["plugin-editor-modal-body"]}>
                    <YakitEditor type={language} value={content} setValue={setContent} />
                </div>
            </YakitModal>

            {previewShow && (
                <PreviewParams
                    getContainer={getContainer}
                    visible={previewShow}
                    confirmLoading={previewCloseLoading}
                    onDebug={onPreviewToDebug}
                    onCancel={onCancelPreviewParams}
                    onOk={onCancelPreviewParams}
                    ref={paramsForm}
                    params={previewParams}
                />
            )}
        </>
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
            bodyStyle={{padding: 0}}
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
            bodyStyle={{padding: 0}}
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

interface PreviewParamsRefProps {
    onGetValue: () => CustomPluginExecuteFormValue
    onReset: () => any
}
interface PreviewParamsProps {
    // yakit-window属性
    getContainer?: HTMLElement
    visible: boolean
    confirmLoading?: boolean
    onDebug: () => any
    onCancel: () => any
    onOk: () => any
    // 预览参数表单属性
    params: YakParamProps[]
    ref?: React.MutableRefObject<PreviewParamsRefProps | undefined>
}
/** @name 预览参数内容 */
const PreviewParams: React.FC<PreviewParamsProps> = memo(
    React.forwardRef((props, ref) => {
        const {getContainer, visible, confirmLoading, onDebug, onCancel, onOk, params = []} = props

        const [form] = Form.useForm()

        // 更新表单内容
        useEffect(() => {
            initFormValue()
        }, [params])

        // 获取当前表单数据
        const getValues = useMemoizedFn(() => {
            return form.getFieldsValue()
        })

        useImperativeHandle(
            ref,
            () => ({
                onGetValue: getValues,
                onReset: () => {
                    form?.resetFields()
                }
            }),
            [form]
        )

        /** 必填参数 */
        const requiredParams = useMemo(() => {
            return params.filter((item) => !!item.Required) || []
        }, [params])
        /** 选填参数 */
        const groupParams = useMemo(() => {
            const arr = params.filter((item) => !item.Required) || []
            return ParamsToGroupByGroupName(arr)
        }, [params])
        const defaultActiveKey = useMemo(() => {
            return groupParams.map((ele) => ele.group)
        }, [groupParams])

        const initFormValue = useMemoizedFn(() => {
            let newFormValue: CustomPluginExecuteFormValue = {}
            params.forEach((ele) => {
                const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
                newFormValue = {
                    ...newFormValue,
                    [ele.Field]: value
                }
            })
            // console.log("预览参数-更新源码后的配置更新", newFormValue)

            form.setFieldsValue({...newFormValue})
        })

        return (
            <YakitWindow
                getContainer={getContainer}
                title='参数预览'
                subtitle={
                    <div style={{width: "100%", overflow: "hidden"}} className={"yakit-content-single-ellipsis"}>
                        不可操作，仅供实时预览
                    </div>
                }
                layout='topRight'
                visible={visible}
                contentStyle={{padding: 0}}
                footerStyle={{flexDirection: "row-reverse", justifyContent: "center"}}
                cancelButtonText='插件调试'
                cancelButtonProps={{
                    loading: !!confirmLoading,
                    icon: <OutlineCodeIcon />,
                    onClick: onDebug
                }}
                onCancel={onCancel}
                okButtonText='结束预览'
                okButtonProps={{colors: "danger", icon: <SolidEyeoffIcon />}}
                onOk={onOk}
                // cacheSizeKey='plugin-preview-params'
            >
                <Form form={form} className={styles["preview-params-wrapper"]} layout='vertical'>
                    <div className={styles["required-params-wrapper"]}>
                        <ExecuteEnterNodeByPluginParams
                            paramsList={requiredParams}
                            pluginType='yak'
                            isExecuting={false}
                        />
                    </div>
                    {groupParams.length > 0 && (
                        <>
                            <div className={styles["additional-params-divider"]}>
                                <div className={styles["text-style"]}>额外参数 (非必填)</div>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <YakitCollapse
                                defaultActiveKey={defaultActiveKey}
                                className={styles["extra-group-params-wrapper"]}
                                bordered={false}
                            >
                                {groupParams.map((item, index) => (
                                    <YakitPanel key={`${item.group}`} header={`参数组：${item.group}`}>
                                        {item.data?.map((formItem, index) => (
                                            <React.Fragment key={`${formItem.Field}${formItem.FieldVerbose}${index}`}>
                                                <FormContentItemByType item={formItem} pluginType='yak' />
                                            </React.Fragment>
                                        ))}
                                    </YakitPanel>
                                ))}
                            </YakitCollapse>
                            <div className={styles["to-end"]}>已经到底啦～</div>
                        </>
                    )}
                </Form>
            </YakitWindow>
        )
    })
)
