import React, {ForwardedRef, forwardRef, memo, useImperativeHandle, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
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
import {pluginConvertLocalToUI} from "../utils/convert"
import {GetPluginLanguage} from "@/pages/plugins/builtInData"
import {DefaultYakitPluginInfo} from "../defaultconstants"
import {yakitNotify} from "@/utils/notification"
import {onCodeToInfo} from "@/pages/plugins/editDetails/utils"

import classNames from "classnames"
import "../../plugins/plugins.scss"
import styles from "./PluginEditor.module.scss"

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
        /** ---------- 全局基础逻辑 End ---------- */

        /** ---------- 插件基础信息组件功能 Start ---------- */
        const baseInfoRef = useRef<EditorInfoFormRefProps>(null)
        /** ---------- 插件基础信息组件功能 End ---------- */

        /** ---------- 插件源码组件功能 Start ---------- */
        const codeInfoRef = useRef<EditorCodeRefProps>(null)
        /** ---------- 插件源码组件功能 End ---------- */

        /** ---------- 按钮组逻辑 Start ---------- */
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
        /** ---------- 按钮组逻辑 End ---------- */

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
                            />
                        )}
                        <HubButton
                            width={wrapperWidth}
                            iconWidth={1000}
                            type='outline1'
                            size='large'
                            icon={<OutlineExitIcon />}
                            name='保存并退出'
                        />
                        <HubButton
                            width={wrapperWidth}
                            iconWidth={1000}
                            size='large'
                            icon={<SolidStoreIcon />}
                            name='保存'
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
            </div>
        )
    })
)
