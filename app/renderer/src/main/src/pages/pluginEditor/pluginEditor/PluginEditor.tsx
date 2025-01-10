import React, {
    Dispatch,
    ForwardedRef,
    ReactNode,
    SetStateAction,
    forwardRef,
    memo,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from "react"
import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {
    OutlineClouduploadIcon,
    OutlineDocumentduplicateIcon,
    OutlineExitIcon,
    OutlinePaperairplaneIcon,
    OutlineQuestionmarkcircleIcon
} from "@/assets/icon/outline"
import {SolidStoreIcon} from "@/assets/icon/solid"
import {HubButton} from "@/pages/pluginHub/hubExtraOperate/funcTemplate"
import {WebsiteGV} from "@/enums/website"
import {EditorInfo, EditorInfoFormRefProps} from "../editorInfo/EditorInfo"
import {EditorCode, EditorCodeRefProps} from "../editorCode/EditorCode"
import {KeyParamsFetchPluginDetail, YakitPluginBaseInfo, YakitPluginInfo} from "../base"
import cloneDeep from "lodash/cloneDeep"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {YakScript} from "@/pages/invoker/schema"
import {
    checkPluginIsModify,
    pluginConvertLocalToUI,
    pluginConvertUIToLocal,
    pluginConvertUIToOnline
} from "../utils/convert"
import {GetPluginLanguage, pluginTypeToName} from "@/pages/plugins/builtInData"
import {DefaultYakitPluginInfo} from "../defaultconstants"
import {yakitNotify} from "@/utils/notification"
import {onCodeToInfo} from "@/pages/plugins/editDetails/utils"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {useStore} from "@/store"
import {API} from "@/services/swagger/resposeType"
import {httpCopyPluginToOnline} from "@/pages/pluginHub/utils/http"
import {localYakInfo} from "@/pages/plugins/pluginsType"
import {grpcDownloadOnlinePlugin, grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {apiFetchOnlinePluginInfo} from "@/pages/plugins/utils"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AddYakitScriptPageInfoProps} from "@/store/pageInfo"
import {YakitSystem} from "@/yakitGVDefine"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {useSubscribeClose} from "@/store/tabSubscribe"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {APIFunc} from "@/apiUtils/type"
import {PluginUploadModal} from "@/pages/pluginHub/pluginUploadModal/PluginUploadModal"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {setClipboardText} from "@/utils/clipboard"
import yaml from "js-yaml"

import classNames from "classnames"
import "../../plugins/plugins.scss"
import styles from "./PluginEditor.module.scss"

const {ipcRenderer} = window.require("electron")

export interface PluginEditorRefProps {
    setEditPlugin: (request: KeyParamsFetchPluginDetail) => void
    setNewPlugin: (value: AddYakitScriptPageInfoProps) => void
    onCheckUnSaved: () => Promise<boolean>
    onSaveAndExit: (onEnd?: (flag?: ModifyPluginCallback) => void) => void
}

export interface ModifyPluginCallback {
    /**
     * 操作类型:
     * 保存-save
     * 保存并退出-saveAndExit
     * 同步-upload
     * 提交-submit
     * 复制-copy
     */
    opType: "save" | "saveAndExit" | "upload" | "submit" | "copy"
    /** 插件更新关键信息 s */
    info: KeyParamsFetchPluginDetail
}
interface PluginEditorProps {
    ref?: ForwardedRef<PluginEditorRefProps>
    title?: string
    headerExtra?: ReactNode
    onEditCancel?: (data: ModifyPluginCallback) => void
}

export const PluginEditor: React.FC<PluginEditorProps> = memo(
    forwardRef((props, ref) => {
        const {title = "新建插件", headerExtra, onEditCancel} = props

        const userinfo = useStore((s) => s.userInfo)
        const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

        useImperativeHandle(
            ref,
            () => ({
                setEditPlugin: handleFetchPluginDetail,
                setNewPlugin: handleNewPluginInitValue,
                onCheckUnSaved: handleCheckUnSaved,
                onSaveAndExit: onHintLocalSaveAndExit
            }),
            []
        )

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
            setClipboardText(oldParamsRef.current, {
                finalCallback: () => {
                    setTimeout(() => {
                        onOldDataCancel()
                        setCopyLoading(false)
                    }, 200)
                }
            })
        })
        const onOldDataCancel = useMemoizedFn(() => {
            if (oldShow) setOldShow(false)
        })
        /** --------------- 旧插件参数迁移提示 End --------------- */

        /** ---------- 获取插件详情信息 Start ---------- */
        // 是否为编辑状态
        const [isEdit, setIsEdit, getIsEdit] = useGetSetState<boolean>(false)
        const [loading, setLoading] = useState<boolean>(false)

        /** 编辑功获取插件详情的请求信息 */
        const editPlugin = useRef<KeyParamsFetchPluginDetail>()
        /** 编辑功能-线上插件详情 */
        const initOnlinePlugin = useRef<YakitPluginOnlineDetail>()
        /** 编辑功能-本地插件详情 */
        const initLocalPlugin = useRef<YakScript>()
        // 是否线上存在
        const [isOnline, setIsOnline] = useState<boolean>(false)
        // 是否为线上本人的插件
        const [isAuthors, setIsAuthors] = useState<boolean>(false)

        /** 每次本地保存后的记录插件信息 */
        const savedPluginInfo = useRef<YakScript>()

        // 获取插件线上信息
        const fetchOnlinePlugin: () => Promise<API.PluginsDetail> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                apiFetchOnlinePluginInfo({uuid: editPlugin.current?.uuid}, true)
                    .then(resolve)
                    .catch(reject)
            })
        })
        // 获取插件本地信息
        const fetchLocalPlugin: () => Promise<YakScript> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                grpcFetchLocalPluginDetail(
                    {Name: editPlugin.current?.name || "", UUID: editPlugin.current?.uuid || undefined},
                    true
                )
                    .then(resolve)
                    .catch(reject)
            })
        })

        const onFetchPlugin = useMemoizedFn(() => {
            if (!editPlugin.current) {
                yakitNotify("error", "获取插件详情异常，请求为空")
                return
            }
            const {name, uuid} = editPlugin.current
            if (!name && !uuid) {
                yakitNotify("error", "获取插件详情异常，请求插件名为空")
                return
            }

            setLoading(true)
            const promises: Promise<any>[] = [fetchOnlinePlugin(), fetchLocalPlugin()]
            Promise.allSettled(promises)
                .then(async (res) => {
                    setIsEdit(true)
                    const [online, local] = res

                    if (online.status === "fulfilled") {
                        initOnlinePlugin.current = {...online.value}
                        setIsAuthors(!!online.value?.isAuthor)
                        setIsOnline(true)
                    }
                    if (local.status === "fulfilled") {
                        initLocalPlugin.current = {...local.value}
                        savedPluginInfo.current = {...local.value}
                        if (local.value.Type === "yak") fetchOldData(local.value.ScriptName)
                        setInitBaseInfo(await pluginConvertLocalToUI(local.value))
                        setType(local.value.Type)
                        setName(local.value.ScriptName)
                        setInitCode(local.value.Content)
                    }
                })
                .catch((err) => {
                    yakitNotify("error", `获取插件详情异常: ${err}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        })

        const handleFetchPluginDetail = useMemoizedFn((request: KeyParamsFetchPluginDetail) => {
            initOnlinePlugin.current = undefined
            initLocalPlugin.current = undefined
            savedPluginInfo.current = undefined
            editPlugin.current = request
            onFetchPlugin()
        })

        // 新建插件时有初始值
        const handleNewPluginInitValue = useMemoizedFn((init: AddYakitScriptPageInfoProps) => {
            const codeObjectInfo = init?.codeObject?.info || {}
            setInitBaseInfo({
                Type: init.pluginType || "yak",
                ScriptName: codeObjectInfo.name || "",
                Help: codeObjectInfo.description || "",
                Tags: []
            })
            setType(init.pluginType || "yak")
            setInitCode(init.code || pluginTypeToName[init.pluginType || "yak"]?.content || "")
        })
        // 自动解析yaml获取基础信息
        const handleParsingYaml = useMemoizedFn((content: string) => {
            let codeObject: {info: Record<string, any>} = {info: {}}
            try {
                codeObject = yaml.load(content)
                if (typeof codeObject !== "object") {
                    codeObject = {info: {}}
                }
            } catch (e) {}
            const codeObjectInfo = codeObject?.info || {}
            const scriptName = codeObjectInfo?.name || ""
            setInitBaseInfo({
                ...initBaseInfo,
                ScriptName: scriptName.slice(0, 100),
                Help: codeObjectInfo?.description || ""
            } as YakitPluginBaseInfo)
        })

        // 检查退出时是否有未保存的情况(暂时只能给编辑使用)
        const handleCheckUnSaved = useMemoizedFn(async () => {
            // 已保存数据生成
            if (!savedPluginInfo.current) return false
            const old = await pluginConvertLocalToUI(savedPluginInfo.current)
            if (!old) return false
            const oldPlugin: YakitPluginInfo = {...old, Content: savedPluginInfo.current.Content}
            // 未保存数据生成
            const newPlugin = await handleGetPluginInfo()
            if (!newPlugin) return true

            return checkPluginIsModify(newPlugin, oldPlugin)
        })

        // 数据重置
        const onReset = useMemoizedFn(() => {
            editPlugin.current = undefined
            initOnlinePlugin.current = undefined
            initLocalPlugin.current = undefined
            savedPluginInfo.current = undefined
            setIsEdit(false)
            setIsOnline(false)
            setIsAuthors(false)
            setInitBaseInfo({
                Type: "yak",
                ScriptName: "",
                Tags: []
            })
            setType("yak")
            setInitCode(pluginTypeToName["yak"]?.content || "")
        })
        /** ---------- 获取插件详情信息 End ---------- */

        /** ---------- 通信监听 Start ---------- */
        // 切换私有域成功后的操作
        const afterForSwitchPrivateDomain = useMemoizedFn(() => {
            if (!getIsEdit()) return
            apiFetchOnlinePluginInfo({uuid: editPlugin.current?.uuid}, true)
                .then((res) => {
                    initOnlinePlugin.current = {...res}
                    setIsOnline(true)
                    setIsAuthors(!!res.isAuthor)
                })
                .catch(() => {
                    initOnlinePlugin.current = undefined
                    setIsOnline(false)
                    setIsAuthors(false)
                })
        })

        useEffect(() => {
            emiter.on("onSwitchPrivateDomain", afterForSwitchPrivateDomain)
            return () => {
                emiter.off("onSwitchPrivateDomain", afterForSwitchPrivateDomain)
            }
        }, [])
        useUpdateEffect(() => {
            if (getIsEdit()) {
                if (isLogin) {
                    setIsAuthors(userinfo.user_id === initOnlinePlugin.current?.user_id)
                } else {
                    setIsAuthors(false)
                }
            }
        }, [isLogin])
        /** ---------- 通信监听 Start ---------- */

        const wrapperWidth = useListenWidth(document.body)

        // 打开帮助文档
        const handleOpenHelp = useMemoizedFn((e) => {
            e.stopPropagation()
            ipcRenderer.invoke("open-url", WebsiteGV.PluginParamsHelp)
        })

        /** ---------- 全局基础逻辑 Start ---------- */
        const [expand, setExpand] = React.useState<boolean>(true)

        // 插件初始基础信息
        const [initBaseInfo, setInitBaseInfo] = useState<YakitPluginBaseInfo>()
        // 插件类型
        const [type, setType] = useState<string>("yak")
        // 插件名字
        const [name, setName] = useState<string>("")
        // 初始源码
        const [initCode, setInitCode] = useState<string>("")

        // 切换脚本类型时更新源码内容
        const handleSwitchTypeUpdateCode = useMemoizedFn((type: string) => {
            setType(type)
            setInitCode(pluginTypeToName[type || "yak"]?.content || "")
        })

        // 刷新插件菜单信息
        const handleRefreshMenu = useDebounceFn(
            useMemoizedFn(() => {
                ipcRenderer.invoke("change-main-menu")
            }),
            {wait: 300}
        ).run

        // 获取操作系统
        const system = useRef<YakitSystem>("Windows_NT")
        const handleFetchSystem = useMemoizedFn(async () => {
            const systemName: YakitSystem = await ipcRenderer.invoke("fetch-system-name")
            system.current = systemName
        })
        // 注册保存快捷键
        const wrapperRef = useRef<HTMLDivElement>(null)
        useEffect(() => {
            handleFetchSystem()
            const onKeydownSave = (e: KeyboardEvent) => {
                const {code, ctrlKey, metaKey} = e
                if (system.current === "Darwin") {
                    if (code === "KeyS" && metaKey) {
                        onBtnLocalSave()
                    }
                } else {
                    if (code === "KeyS" && ctrlKey) {
                        onBtnLocalSave()
                    }
                }
            }

            if (wrapperRef.current) {
                wrapperRef.current.addEventListener("keydown", onKeydownSave)
            }
            return () => {
                if (wrapperRef.current) {
                    wrapperRef.current.removeEventListener("keydown", onKeydownSave)
                }
            }
        }, [])
        /** ---------- 全局基础逻辑 End ---------- */

        // 插件基础信息组件 ref
        const baseInfoRef = useRef<EditorInfoFormRefProps>(null)
        // 插件源码组件功能 ref
        const codeInfoRef = useRef<EditorCodeRefProps>(null)

        /** ---------- 按钮组逻辑 Start ---------- */
        // 编辑状态-操作成功后的回调
        const handleEditSuccessCallback = useMemoizedFn((data: ModifyPluginCallback) => {
            if (onEditCancel) onEditCancel(data)
        })

        const [localLoading, setLocalLoading] = useState<boolean>(false)
        const [onlineLoading, setOnlineLoading] = useState<boolean>(false)
        const [modifyLoading, setModifyLoading] = useState<boolean>(false)
        // 延时设置 loading 为 false 状态
        const handleTimeLoadingToFalse = useMemoizedFn((func: Dispatch<SetStateAction<boolean>>, wait?: number) => {
            setTimeout(() => {
                func(false)
            }, wait || 200)
        })

        // 获取插件信息
        const handleGetPluginInfo = useMemoizedFn(async () => {
            const data: YakitPluginInfo = cloneDeep(DefaultYakitPluginInfo)

            if (!baseInfoRef.current) {
                yakitNotify("error", "未获取到基础信息，请重试 ")
                return
            }
            const base = await baseInfoRef.current.onSubmit()
            if (!base) {
                setExpand(true)
                return
            } else {
                data.Type = base.Type
                data.ScriptName = base.ScriptName
                data.Help = base.Help
                data.Tags = base.Tags
                data.EnablePluginSelector = base.EnablePluginSelector
                data.PluginSelectorTypes = base.PluginSelectorTypes
            }

            if (!codeInfoRef.current) {
                yakitNotify("error", "未获取到代码信息，请重试 ")
                return
            }
            const code = await codeInfoRef.current.onSubmit()
            data.Content = code || ""

            const codeAnalysis =
                GetPluginLanguage(data.Type) === "yak"
                    ? await onCodeToInfo({type: data.Type, code: data.Content})
                    : null
            // 源码-获取 tag 信息
            let newTags = data.Tags
            if (codeAnalysis && codeAnalysis.Tags.length > 0) {
                newTags = newTags.concat(codeAnalysis.Tags)
                newTags = newTags.filter((item, index, self) => {
                    return self.indexOf(item) === index
                })
            }
            data.Tags = cloneDeep(newTags)
            // 源码-获取漏洞详情信息
            if (GetPluginLanguage(data.Type) === "yak" && codeAnalysis) {
                data.RiskDetail = codeAnalysis.RiskInfo.filter((item) => item.Level && item.CVE && item.TypeVerbose)
            }
            // 源码-获取参数信息
            if (["yak", "mitm", "codec"].includes(data.Type) && codeAnalysis) {
                data.Params = codeAnalysis.CliParameter || []
                data.PluginEnvKey = codeAnalysis.PluginEnvKey || []
            }

            return data
        })

        // 本地保存逻辑
        const handleLocalSave: APIFunc<localYakInfo, YakScript> = useMemoizedFn((data, hiddenError) => {
            return new Promise((resolve, reject) => {
                // 未知错误处理
                if (!data.ScriptName) {
                    if (!hiddenError) yakitNotify("error", `插件名字不能为空`)
                    reject("插件名字不能为空")
                    return
                }

                ipcRenderer
                    .invoke("SaveNewYakScript", data)
                    .then((res: YakScript) => {
                        handleRefreshMenu()
                        resolve(res)
                    })
                    .catch((err) => {
                        if (!hiddenError) yakitNotify("error", `保存插件失败: ${err}`)
                        reject(err)
                    })
            })
        })

        // 编辑退出-未保存提示-保存功能
        const onHintLocalSaveAndExit = useMemoizedFn(async (onEnd?: (data?: ModifyPluginCallback) => void) => {
            if (localLoading) return
            setLocalLoading(true)

            const plugin = await handleGetPluginInfo()
            if (!plugin) {
                handleTimeLoadingToFalse(setLocalLoading)
                if (onEnd) onEnd()
                return
            }

            const request = pluginConvertUIToLocal(plugin, savedPluginInfo.current)

            handleLocalSave(request)
                .then((res) => {
                    yakitNotify("success", "保存插件成功")
                    const info: KeyParamsFetchPluginDetail = {
                        id: Number(res.Id) || 0,
                        name: res.ScriptName,
                        uuid: res.UUID || ""
                    }
                    emiter.emit("editorLocalSaveToLocalList", JSON.stringify(info))
                    if (onEnd) onEnd({opType: "saveAndExit", info: info})
                })
                .catch((err) => {
                    if (onEnd) onEnd()
                })
                .finally(() => {
                    handleTimeLoadingToFalse(setLocalLoading)
                })
        })

        // 保存按钮
        const onBtnLocalSave = useDebounceFn(
            useMemoizedFn(async () => {
                if (localLoading) return
                setLocalLoading(true)

                const plugin = await handleGetPluginInfo()
                if (!plugin) {
                    handleTimeLoadingToFalse(setLocalLoading)
                    return
                }

                const request = pluginConvertUIToLocal(plugin, savedPluginInfo.current)
                handleLocalSave(request)
                    .then((res) => {
                        savedPluginInfo.current = cloneDeep(res)
                        yakitNotify("success", "保存插件成功")

                        const info: KeyParamsFetchPluginDetail = {
                            id: Number(res.Id) || Number(savedPluginInfo.current?.Id) || 0,
                            name: res.ScriptName,
                            uuid: res.UUID || ""
                        }
                        if (isEdit) {
                            emiter.emit("editorLocalSaveToLocalList", JSON.stringify(info))
                            handleEditSuccessCallback({
                                opType: "save",
                                info: info
                            })
                        } else {
                            emiter.emit("editorLocalNewToLocalList", JSON.stringify(info))
                        }
                    })
                    .catch((err) => {})
                    .finally(() => {
                        handleTimeLoadingToFalse(setLocalLoading)
                    })
            }),
            {wait: 300}
        ).run
        // 保存并退出
        const onBtnLocalSaveAndExit = useMemoizedFn(async () => {
            if (localLoading) return
            setLocalLoading(true)

            const plugin = await handleGetPluginInfo()
            if (!plugin) {
                handleTimeLoadingToFalse(setLocalLoading)
                return
            }

            const request = pluginConvertUIToLocal(plugin, savedPluginInfo.current)

            handleLocalSave(request)
                .then((res) => {
                    savedPluginInfo.current = cloneDeep(res)
                    yakitNotify("success", "保存插件成功")

                    const info: KeyParamsFetchPluginDetail = {
                        id: Number(res.Id) || Number(savedPluginInfo.current?.Id) || 0,
                        name: res.ScriptName,
                        uuid: res.UUID || ""
                    }
                    if (isEdit) {
                        emiter.emit("editorLocalSaveToLocalList", JSON.stringify(info))
                        handleEditSuccessCallback({
                            opType: "saveAndExit",
                            info: info
                        })
                    } else {
                        emiter.emit("editorLocalNewToLocalList", JSON.stringify(info))
                        try {
                            if (modalRef.current) modalRef.current.destroy()
                        } catch (error) {}
                        if (modalTypeRef.current === "reset") {
                            onReset()
                            modalTypeRef.current = "close"
                        } else {
                            handleClosePage()
                        }
                    }
                })
                .catch(() => {})
                .finally(() => {
                    handleTimeLoadingToFalse(setLocalLoading)
                })
        })

        // 同步至云端
        const onBtnOnlineSave = useMemoizedFn(async () => {
            if (onlineLoading) return
            if (showUploadPlugin) return
            if (!isLogin) {
                yakitNotify("error", "登录后才可同步至云端")
                return
            }
            setOnlineLoading(true)

            const plugin = await handleGetPluginInfo()
            if (!plugin) {
                handleTimeLoadingToFalse(setOnlineLoading)
                return
            }

            const localRequest = pluginConvertUIToLocal(plugin, savedPluginInfo.current)

            // 先本地保存
            handleLocalSave(localRequest)
                .then((res) => {
                    savedPluginInfo.current = cloneDeep(res)
                    const info: KeyParamsFetchPluginDetail = {
                        id: Number(res.Id) || Number(savedPluginInfo.current?.Id) || 0,
                        name: res.ScriptName,
                        uuid: res.UUID || ""
                    }
                    emiter.emit("editorLocalSaveToLocalList", JSON.stringify(info))
                    if (isEdit) {
                        handleEditSuccessCallback({
                            opType: "save",
                            info: info
                        })
                    }

                    uploadType.current = "upload"
                    uploadPlugin.current = cloneDeep(res)
                    setShowUploadPlugin(true)
                })
                .catch((err) => {
                    handleTimeLoadingToFalse(setOnlineLoading)
                    return
                })
        })
        // 复制至云端
        const onBtnCopyOnline = useMemoizedFn(async () => {
            if (onlineLoading) return
            if (!isLogin) {
                yakitNotify("error", "登录后才可复制至云端")
                return
            }
            setOnlineLoading(true)

            const plugin = await handleGetPluginInfo()
            if (!plugin) {
                handleTimeLoadingToFalse(setOnlineLoading)
                return
            }

            const onlineRequest = pluginConvertUIToOnline(plugin, initLocalPlugin.current)

            if (copyHint) {
                handleTimeLoadingToFalse(setOnlineLoading)
                return
            }
            onlineOPPlugin.current = onlineRequest
            setCopyHint(true)
        })
        // 提交至云端
        const onBtnSubmitOnline = useMemoizedFn(async () => {
            if (modifyLoading) return
            if (showUploadPlugin) return
            if (!isLogin) {
                yakitNotify("error", "登录后才可提交至云端")
                return
            }
            setModifyLoading(true)

            const plugin = await handleGetPluginInfo()
            if (!plugin) {
                handleTimeLoadingToFalse(setModifyLoading)
                return
            }

            const localRequest = pluginConvertUIToLocal(plugin, savedPluginInfo.current)
            // 先本地保存
            handleLocalSave(localRequest)
                .then((res) => {
                    savedPluginInfo.current = cloneDeep(res)
                    const info: KeyParamsFetchPluginDetail = {
                        id: Number(res.Id) || Number(savedPluginInfo.current?.Id) || 0,
                        name: res.ScriptName,
                        uuid: res.UUID || ""
                    }
                    emiter.emit("editorLocalSaveToLocalList", JSON.stringify(info))
                    if (isEdit) {
                        handleEditSuccessCallback({
                            opType: "save",
                            info: info
                        })
                    }

                    // 插件线上详情不存在，则操作失败
                    if (!initOnlinePlugin.current) {
                        yakitNotify("error", "未获取到线上信息，操作失败")
                        handleTimeLoadingToFalse(setModifyLoading)
                        return
                    }

                    uploadType.current = "submit"
                    uploadPlugin.current = cloneDeep(res)
                    setShowUploadPlugin(true)
                })
                .catch((err) => {
                    handleTimeLoadingToFalse(setModifyLoading)
                    return
                })
        })
        /** ---------- 按钮组逻辑 End ---------- */

        /** ---------- 上传/提交插件弹框 Start ---------- */
        const uploadType = useRef<"upload" | "submit">("upload")
        // 同步和提交按钮的弹框依赖信息
        const uploadPlugin = useRef<YakScript>()
        const [showUploadPlugin, setShowUploadPlugin] = useState<boolean>(false)
        const handleShowUploadPluginCallback = useMemoizedFn(
            (result: boolean, plugin?: YakScript, onlinePlugin?: API.PostPluginsResponse) => {
                if (uploadType.current === "upload" && result) {
                    if (plugin) {
                        const info: KeyParamsFetchPluginDetail = {
                            id: Number(plugin.Id) || Number(savedPluginInfo.current?.Id) || 0,
                            name: plugin.ScriptName,
                            uuid: plugin.UUID || ""
                        }
                        if (isEdit) {
                            handleEditSuccessCallback({
                                opType: "upload",
                                info: info
                            })
                            emiter.emit("editorLocalSaveToLocalList", JSON.stringify(info))
                        } else {
                            emiter.emit("editorLocalNewToLocalList", JSON.stringify(info))
                            handleClosePage()
                        }
                    }
                }

                if (uploadType.current === "submit" && result) {
                    // 提交操作只存在编辑页面，新建无该操作
                    if (!isEdit) return

                    if (plugin) {
                        const info: KeyParamsFetchPluginDetail = {
                            id: Number(plugin.Id) || Number(savedPluginInfo.current?.Id) || 0,
                            name: plugin.ScriptName,
                            uuid: plugin.UUID || ""
                        }
                        handleEditSuccessCallback({
                            opType: "submit",
                            info: info
                        })
                        emiter.emit("editorLocalNewToLocalList", JSON.stringify(info))
                    } else {
                        if (onlinePlugin) {
                            handleEditSuccessCallback({
                                opType: "submit",
                                info: {
                                    id: Number(uploadPlugin.current?.Id) || 0,
                                    name: onlinePlugin.script_name,
                                    uuid: onlinePlugin.uuid
                                }
                            })
                        }
                    }
                }

                if (uploadType.current === "upload") {
                    handleTimeLoadingToFalse(setOnlineLoading)
                }
                if (uploadType.current === "submit") {
                    handleTimeLoadingToFalse(setModifyLoading)
                }
                setShowUploadPlugin(false)
            }
        )
        /** ---------- 上传/提交插件弹框 End ---------- */

        /** ---------- 复制弹窗 Start ---------- */
        // 复制的插件信息
        const onlineOPPlugin = useRef<API.PluginsRequest>()
        const [copyHint, setCopyHint] = useState<boolean>(false)
        const handleResetCopyHint = useMemoizedFn(() => {
            setCopyHint(false)
        })
        const onCopyHintCallback = useMemoizedFn((isCallback: boolean, name?: string) => {
            // 手动关闭弹窗|没有获取到进行修改的插件信息
            if (!isCallback || !onlineOPPlugin.current) {
                handleResetCopyHint()
                handleTimeLoadingToFalse(setOnlineLoading)
                if (!onlineOPPlugin.current) yakitNotify("error", "操作未获取到插件信息，请重试!")
                return
            }

            setTimeout(() => {
                handleResetCopyHint()
            }, 100)

            // 复制插件
            if (!name) {
                yakitNotify("error", "未获取到复制的新插件名")
                handleTimeLoadingToFalse(setOnlineLoading)
                return
            }
            const request: API.CopyPluginsRequest = {
                ...onlineOPPlugin.current,
                script_name: name,
                is_private: true,
                base_plugin_id: +(initOnlinePlugin.current?.id || 0)
            }
            httpCopyPluginToOnline(request)
                .then((onlineRes) => {
                    // 复制操作只存在编辑页面，新建不存在该操作
                    // 下载复制的插件
                    grpcDownloadOnlinePlugin({uuid: onlineRes.uuid})
                        .then((localRes) => {
                            yakitNotify("success", "插件复制至云端成功, 并已下载至本地")
                            if (isEdit) {
                                // 刷新我的列表
                                emiter.emit("onRefreshOwnPluginList")
                                const info: KeyParamsFetchPluginDetail = {
                                    id: Number(localRes.Id) || Number(savedPluginInfo.current?.Id) || 0,
                                    name: localRes.ScriptName,
                                    uuid: localRes.UUID || ""
                                }
                                handleEditSuccessCallback({
                                    opType: "copy",
                                    info: info
                                })
                                emiter.emit("editorLocalSaveToLocalList", JSON.stringify(info))
                            }
                        })
                        .catch(() => {})
                })
                .catch(() => {})
                .finally(() => {
                    handleTimeLoadingToFalse(setOnlineLoading)
                })
        })

        /** ---------- 同步复制弹窗 End ---------- */

        /** ---------- 新建功能页关闭时的二次确认 Start ---------- */
        // 注册页面外部操作的二次提示配置信息
        const {setSubscribeClose, removeSubscribeClose} = useSubscribeClose()
        // 二次提示框的实例
        const modalRef = useRef<any>(null)
        // 二次提示框的操作类型
        const modalTypeRef = useRef<string>("close")
        useEffect(() => {
            setSubscribeClose(YakitRoute.AddYakitScript, {
                close: async () => {
                    // const unsaved = await handleCheckUnSaved()
                    // if (!unsaved) return
                    return {
                        title: "插件未保存",
                        content: "是否要将插件保存到本地?",
                        confirmLoading: localLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            modalTypeRef.current = "close"
                            onBtnLocalSaveAndExit()
                        },
                        onCancel: () => {
                            handleClosePage()
                        }
                    }
                },
                reset: async () => {
                    // const unsaved = await handleCheckUnSaved()
                    // if (!unsaved) return
                    return {
                        title: "插件未保存",
                        content: "是否要将插件保存到本地，并新建插件?",
                        confirmLoading: localLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            modalTypeRef.current = "reset"
                            onBtnLocalSaveAndExit()
                        },
                        onCancel: () => {
                            onReset()
                        }
                    }
                }
            })

            return () => {
                removeSubscribeClose(YakitRoute.AddYakitScript)
            }
        }, [])
        /** ---------- 新建功能页关闭时的二次确认 End ---------- */

        // 新建功能专属，关闭页面逻辑
        const handleClosePage = useMemoizedFn(() => {
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AddYakitScript}))
        })

        return (
            <div ref={wrapperRef} tabIndex={0} className={styles["plugin-editor"]}>
                <YakitSpin spinning={loading} tip='获取插件详情中...'>
                    <div className={styles["plugin-editor-wrapper"]}>
                        <div
                            className={classNames(styles["plugin-editor-header"], {
                                [styles["plugin-editor-modify-header"]]: isEdit
                            })}
                        >
                            <div className={styles["header-title"]}>
                                {title}
                                <div className={styles["header-subtitle"]} onClick={handleOpenHelp}>
                                    <span className={classNames(styles["subtitle-style"])}>帮助文档</span>
                                    <OutlineQuestionmarkcircleIcon />
                                </div>
                            </div>

                            <div className={styles["header-btn-group"]}>
                                {isOnline && !isAuthors && (
                                    <HubButton
                                        width={wrapperWidth}
                                        iconWidth={1000}
                                        loading={onlineLoading}
                                        type='outline2'
                                        size={isEdit ? "middle" : "large"}
                                        icon={<OutlineDocumentduplicateIcon />}
                                        name='复制至云端'
                                        onClick={onBtnCopyOnline}
                                    />
                                )}
                                {isOnline && (
                                    <HubButton
                                        width={wrapperWidth}
                                        iconWidth={1000}
                                        loading={modifyLoading}
                                        type='outline1'
                                        size={isEdit ? "middle" : "large"}
                                        icon={<OutlinePaperairplaneIcon />}
                                        name='提交并保存'
                                        onClick={onBtnSubmitOnline}
                                    />
                                )}
                                {!isOnline && (
                                    <HubButton
                                        width={wrapperWidth}
                                        iconWidth={1000}
                                        loading={onlineLoading}
                                        type='outline1'
                                        size={isEdit ? "middle" : "large"}
                                        icon={<OutlineClouduploadIcon />}
                                        name='同步至云端'
                                        onClick={onBtnOnlineSave}
                                    />
                                )}
                                <HubButton
                                    width={wrapperWidth}
                                    iconWidth={1000}
                                    loading={localLoading}
                                    type='outline1'
                                    size={isEdit ? "middle" : "large"}
                                    icon={<OutlineExitIcon />}
                                    name='保存并退出'
                                    onClick={onBtnLocalSaveAndExit}
                                />
                                <HubButton
                                    width={wrapperWidth}
                                    iconWidth={1000}
                                    loading={localLoading}
                                    size={isEdit ? "middle" : "large"}
                                    icon={<SolidStoreIcon />}
                                    name='保存'
                                    onClick={onBtnLocalSave}
                                />

                                {headerExtra}
                            </div>
                        </div>

                        <div className={styles["plugin-editor-body"]}>
                            <EditorInfo
                                ref={baseInfoRef}
                                expand={expand}
                                onExpand={setExpand}
                                isEdit={isEdit}
                                data={initBaseInfo}
                                initType='yak'
                                setType={handleSwitchTypeUpdateCode}
                                setName={setName}
                            />

                            <div className={styles["editor-code-container"]}>
                                <EditorCode
                                    ref={codeInfoRef}
                                    expand={expand}
                                    onExpand={setExpand}
                                    isEdit={isEdit}
                                    type={type}
                                    name={name}
                                    code={initCode}
                                    handleParsingYaml={handleParsingYaml}
                                />
                            </div>
                        </div>

                        <PluginCopyModal visible={copyHint} setVisible={onCopyHintCallback} />

                        <YakitHint
                            getContainer={wrapperRef.current || undefined}
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

                        {/* 单个插件上传 */}
                        <PluginUploadModal
                            isLogin={isLogin}
                            info={uploadPlugin.current}
                            visible={showUploadPlugin}
                            callback={handleShowUploadPluginCallback}
                        />
                    </div>
                </YakitSpin>
            </div>
        )
    })
)

interface PluginCopyModalProps {
    visible: boolean
    setVisible: (isCallback: boolean, name?: string) => any
}
/** @name 插件复制云端 */
const PluginCopyModal: React.FC<PluginCopyModalProps> = memo((props) => {
    const {visible, setVisible} = props

    const [name, setName] = useState<string>("")

    const onSubmit = useMemoizedFn(() => {
        if (!name) {
            yakitNotify("error", "请输入复制插件的名称")
            return
        }
        if (name.length > 100) {
            yakitNotify("error", "插件名最长100位")
            return
        }
        setVisible(true, name)
    })
    const onCancel = useMemoizedFn(() => {
        setVisible(false)
    })

    return (
        <YakitModal
            title='复制至云端'
            type='white'
            width={506}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            onCancel={onCancel}
            onOk={onSubmit}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["plugin-copy-body"]}>
                <div className={styles["copy-header"]}>
                    复制插件并同步到自己的私密插件，无需作者同意，即可保存修改内容至云端
                </div>
                <div className={styles["copy-wrapper"]}>
                    <div className={styles["title-style"]}>插件名称 : </div>
                    <YakitInput placeholder='请输入...' value={name} onChange={(e) => setName(e.target.value)} />
                </div>
            </div>
        </YakitModal>
    )
})
