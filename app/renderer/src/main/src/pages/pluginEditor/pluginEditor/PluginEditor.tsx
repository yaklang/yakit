import React, {
    Dispatch,
    ForwardedRef,
    SetStateAction,
    forwardRef,
    memo,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from "react"
import {useDebounceFn, useMemoizedFn} from "ahooks"
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
import {YakitPluginBaseInfo, YakitPluginInfo} from "../base"
import cloneDeep from "lodash/cloneDeep"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {YakScript} from "@/pages/invoker/schema"
import {pluginConvertLocalToUI, pluginConvertUIToLocal, pluginConvertUIToOnline} from "../utils/convert"
import {GetPluginLanguage} from "@/pages/plugins/builtInData"
import {DefaultYakitPluginInfo} from "../defaultconstants"
import {yakitNotify} from "@/utils/notification"
import {onCodeToInfo} from "@/pages/plugins/editDetails/utils"

import classNames from "classnames"
import "../../plugins/plugins.scss"
import styles from "./PluginEditor.module.scss"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {useStore} from "@/store"
import {ModifyPluginReason, PluginSyncAndCopyModal} from "@/pages/plugins/editDetails/PluginEditDetails"
import {API} from "@/services/swagger/resposeType"
import {CodeScoreModal} from "@/pages/plugins/funcTemplate"
import {httpUploadPluginToOnline} from "@/pages/pluginHub/utils/http"
import {localYakInfo} from "@/pages/plugins/pluginsType"
import {APIFunc} from "@/pages/pluginHub/utils/apiType"

const {ipcRenderer} = window.require("electron")

const wrapperId = ""

export interface PluginEditorRefProps {
    setOnlineAndLocalInfo: (online?: YakitPluginOnlineDetail, local?: YakScript) => void
}

interface PluginEditorProps {
    ref?: ForwardedRef<PluginEditorRefProps>
    title?: string
}

export const PluginEditor: React.FC<PluginEditorProps> = memo(
    forwardRef((props, ref) => {
        const {title = "新建插件"} = props

        const userinfo = useStore((s) => s.userInfo)
        const isLogin = useMemo(() => userinfo.isLogin, [userinfo])

        useImperativeHandle(
            ref,
            () => ({
                setOnlineAndLocalInfo: handleSetOnlineAndLocalInfo
            }),
            []
        )
        const handleSetOnlineAndLocalInfo = useMemoizedFn((online?: YakitPluginOnlineDetail, local?: YakScript) => {
            onlinePlugin.current = online
            localPlugin.current = local
            if (!!local && !!online) setIsOnline(true)
            else setIsOnline(false)
            if (!!online) setIsAuthors(!!online.isAuthor)
            if (!!local) {
                const base: YakitPluginBaseInfo = cloneDeep(pluginConvertLocalToUI(local))
                if (!base) return
                setInitBaseInfo(base)
            }
        })

        /** ---------- 插件详情数据 Start ---------- */
        const onlinePlugin = useRef<YakitPluginOnlineDetail>()
        const localPlugin = useRef<YakScript>()
        // 是否线上存在
        const [isOnline, setIsOnline] = useState<boolean>(false)
        // 是否为线上本人的插件
        const [isAuthors, setIsAuthors] = useState<boolean>(false)
        /** ---------- 插件详情数据  End ---------- */

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

        // 刷新插件菜单信息
        const handleRefreshMenu = useDebounceFn(
            useMemoizedFn(() => {
                ipcRenderer.invoke("change-main-menu")
            }),
            {wait: 300}
        ).run
        /** ---------- 全局基础逻辑 End ---------- */

        /** ---------- 插件基础信息组件功能 Start ---------- */
        const baseInfoRef = useRef<EditorInfoFormRefProps>(null)
        /** ---------- 插件基础信息组件功能 End ---------- */

        /** ---------- 插件源码组件功能 Start ---------- */
        const codeInfoRef = useRef<EditorCodeRefProps>(null)
        /** ---------- 插件源码组件功能 End ---------- */

        /** ---------- 按钮组逻辑 Start ---------- */
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
                return
            } else {
                data.Type = base.Type
                data.ScriptName = base.ScriptName
                data.Tags = base.Tags
                data.Notes = base.Notes
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
            let newTags = data.Tags
            if (codeAnalysis && codeAnalysis.Tags.length > 0) {
                newTags = newTags.concat(codeAnalysis.Tags)
                newTags = newTags.filter((item, index, self) => {
                    return self.indexOf(item) === index
                })
            }
            data.Tags = cloneDeep(newTags)
            if (data.Type === "yak" && codeAnalysis) {
                data.RiskDetail = codeAnalysis.RiskInfo.filter((item) => item.Level && item.CVE && item.TypeVerbose)
                data.Params = codeAnalysis.CliParameter || []
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

        // 保存按钮
        const onBtnLocalSave = useMemoizedFn(async () => {
            if (localLoading) return
            setLocalLoading(true)

            const plugin = await handleGetPluginInfo()
            if (!plugin) {
                handleTimeLoadingToFalse(setLocalLoading)
                return
            }

            const request = pluginConvertUIToLocal(plugin, localPlugin.current)

            handleLocalSave(request)
                .then((res) => {
                    yakitNotify("success", "保存插件成功")
                    // [todo] 保存成功后是否要刷新插件详情和列表里对应的数据
                })
                .catch((err) => {})
                .finally(() => {
                    handleTimeLoadingToFalse(setLocalLoading)
                })
        })
        // 保存并退出
        const onBtnLocalSaveAndExit = useMemoizedFn(async () => {
            if (localLoading) return
            setLocalLoading(true)

            const plugin = await handleGetPluginInfo()
            if (!plugin) {
                handleTimeLoadingToFalse(setLocalLoading)
                return
            }

            const request = pluginConvertUIToLocal(plugin, localPlugin.current)

            handleLocalSave(request)
                .then((res) => {
                    yakitNotify("success", "保存插件成功")
                    // [todo] 保存成功后是否要刷新插件详情和列表里对应的数据
                    handleClosePage()
                })
                .catch((err) => {})
                .finally(() => {
                    handleTimeLoadingToFalse(setLocalLoading)
                })
        })
        // 同步至云端
        const onBtnOnlineSave = useMemoizedFn(async () => {
            if (onlineLoading) return
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

            const localRequest = pluginConvertUIToLocal(plugin, localPlugin.current)
            const onlineRequest = pluginConvertUIToOnline(plugin, localPlugin.current)

            // 先本地保存
            handleLocalSave(localRequest)
                .then((res) => {
                    if (syncCopyHint) {
                        handleTimeLoadingToFalse(setOnlineLoading)
                        return
                    }
                    syncCopyPlugin.current = onlineRequest
                    syncOrCopy.current = true
                    setSyncCopyHint(true)
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

            const onlineRequest = pluginConvertUIToOnline(plugin, localPlugin.current)

            if (syncCopyHint) {
                handleTimeLoadingToFalse(setOnlineLoading)
                return
            }
            syncCopyPlugin.current = onlineRequest
            syncOrCopy.current = false
            setSyncCopyHint(true)
        })
        /** ---------- 按钮组逻辑 End ---------- */

        /** ---------- 同步复制弹窗 & 插件评分弹框 & 修改意见弹框 Start ---------- */
        // 同步和复制操作的插件信息
        const syncCopyPlugin = useRef<API.PluginsRequest>()
        // 同步还是复制-true为同步|false为复制
        const syncOrCopy = useRef<boolean>(true)
        const [syncCopyHint, setSyncCopyHint] = useState<boolean>(false)
        const handleResetSyncCopyHint = useMemoizedFn(() => {
            syncOrCopy.current = true
            setSyncCopyHint(false)
        })
        const onSyncCopyHintCallback = useMemoizedFn((isCallback: boolean, param?: {type: string; name: string}) => {
            // 手动关闭弹窗|没有获取到进行修改的插件信息
            if (!isCallback || !syncCopyPlugin.current) {
                handleResetSyncCopyHint()
                handleTimeLoadingToFalse(setOnlineLoading)
                if (!syncCopyPlugin.current) yakitNotify("error", "操作未获取到插件信息，请重试!")
                return
            }

            setTimeout(() => {
                setSyncCopyHint(false)
            }, 100)

            // 点击弹窗的提交按钮
            if (!syncOrCopy.current) {
                const request: API.CopyPluginsRequest = {
                    ...syncCopyPlugin.current,
                    script_name: param?.name || syncCopyPlugin.current.script_name,
                    is_private: true,
                    base_plugin_id: +(onlinePlugin.current?.uuid || 0)
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
                if (param && param.type === "public") {
                    if (pluginTest) {
                        handleTimeLoadingToFalse(setOnlineLoading)
                        return
                    }
                    syncCopyPlugin.current = {...syncCopyPlugin.current, is_private: false}
                    isNewOnline.current = true
                    setPluginTest(true)
                }
                // 私密的插件直接保存，不用走基础检测流程
                if (param && param.type === "private") {
                    httpUploadPluginToOnline({...syncCopyPlugin.current, is_private: true})
                        .then((res) => {
                            // [todo] 同步至云端成功后需要刷新什么东西
                        })
                        .catch((err) => {})
                        .finally(() => {
                            handleTimeLoadingToFalse(setOnlineLoading)
                        })
                }
            }
        })

        // 插件评分弹框
        const isNewOnline = useRef<boolean>(true)
        const [pluginTest, setPluginTest] = useState<boolean>(false)
        const onTestCallback = useMemoizedFn((value: boolean) => {
            if (!syncCopyPlugin.current) {
                handleTimeLoadingToFalse(setOnlineLoading)
                yakitNotify("error", "操作未获取到插件信息，请重试!")
                return
            }

            if (isNewOnline.current) {
                httpUploadPluginToOnline(syncCopyPlugin.current)
                    .then((res) => {
                        // [todo] 同步至云端成功后需要刷新什么东西
                    })
                    .catch((err) => {})
                    .finally(() => {
                        setTimeout(() => {
                            setPluginTest(false)
                            setOnlineLoading(false)
                        }, 200)
                    })
            } else {
                if (value) {
                    setTimeout(() => {
                        setPluginTest(false)
                        setModifyReason(true)
                    }, 1000)
                } else {
                    setTimeout(() => {
                        setPluginTest(false)
                        // 终端提交按钮的加载状态
                        setModifyLoading(false)
                    }, 200)
                }
            }
        })

        //修改意见弹框
        const [modifyReason, setModifyReason] = useState<boolean>(false)
        const onModifyReason = useMemoizedFn((isSubmit: boolean, content?: string) => {
            if (!isSubmit) {
                setTimeout(() => {
                    setModifyReason(false)
                    setModifyLoading(false)
                }, 200)
            }

            if (!syncCopyPlugin.current) {
                setTimeout(() => {
                    setModifyReason(false)
                    setModifyLoading(false)
                }, 200)
                yakitNotify("error", "操作未获取到插件信息，请重试!")
                return
            }

            if (isSubmit) {
                httpUploadPluginToOnline({
                    ...syncCopyPlugin.current,
                    uuid: onlinePlugin.current?.uuid,
                    logDescription: content
                })
                    .then((res) => {
                        // [todo] 提交至云端成功后需要刷新什么东西
                    })
                    .catch((err) => {})
                    .finally(() => {
                        handleTimeLoadingToFalse(setModifyLoading)
                    })
            }
        })
        /** ---------- 同步复制弹窗 & 插件评分弹框 & 修改意见弹框 End ---------- */

        // 新建功能专属，关闭页面逻辑
        const handleClosePage = useMemoizedFn(() => {
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AddYakitScript}))
        })

        return (
            <div className={styles["plugin-editor"]}>
                <div className={styles["plugin-editor-header"]}>
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
                                type='outline2'
                                size='large'
                                icon={<OutlineDocumentduplicateIcon />}
                                name='复制至云端'
                                onClick={onBtnCopyOnline}
                            />
                        )}
                        {isOnline && (
                            <HubButton
                                width={wrapperWidth}
                                iconWidth={1000}
                                type='outline1'
                                size='large'
                                icon={<OutlinePaperairplaneIcon />}
                                name='提交并保存'
                            />
                        )}
                        {!isOnline && (
                            <HubButton
                                width={wrapperWidth}
                                iconWidth={1000}
                                type='outline1'
                                size='large'
                                icon={<OutlineClouduploadIcon />}
                                name='同步至云端'
                                onClick={onBtnOnlineSave}
                            />
                        )}
                        <HubButton
                            width={wrapperWidth}
                            iconWidth={1000}
                            type='outline1'
                            size='large'
                            icon={<OutlineExitIcon />}
                            name='保存并退出'
                            onClick={onBtnLocalSaveAndExit}
                        />
                        <HubButton
                            width={wrapperWidth}
                            iconWidth={1000}
                            size='large'
                            icon={<SolidStoreIcon />}
                            name='保存'
                            onClick={onBtnLocalSave}
                        />
                    </div>
                </div>

                <div className={styles["plugin-editor-body"]}>
                    <EditorInfo
                        ref={baseInfoRef}
                        expand={expand}
                        onExpand={setExpand}
                        data={initBaseInfo}
                        initType='yak'
                        setType={setType}
                        setName={setName}
                    />

                    <div className={styles["editor-code-container"]}>
                        <EditorCode
                            ref={codeInfoRef}
                            expand={expand}
                            onExpand={setExpand}
                            isEdit={!!localPlugin.current}
                            type={type}
                            name={name}
                            code={localPlugin.current?.Content || ""}
                        />
                    </div>
                </div>

                <PluginSyncAndCopyModal
                    isCopy={!syncOrCopy.current}
                    visible={syncCopyHint}
                    setVisible={onSyncCopyHintCallback}
                />
                <CodeScoreModal
                    type={syncCopyPlugin.current?.type || ""}
                    code={syncCopyPlugin.current?.content || ""}
                    visible={pluginTest}
                    onCancel={onTestCallback}
                />
                <ModifyPluginReason visible={modifyReason} onCancel={onModifyReason} />
            </div>
        )
    })
)
