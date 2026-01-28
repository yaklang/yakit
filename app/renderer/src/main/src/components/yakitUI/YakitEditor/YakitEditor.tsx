import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react"
import {
    useDebounceFn,
    useGetState,
    useKeyPress,
    useMemoizedFn,
    useThrottleFn,
    useUpdateEffect,
    useInViewport,
    useDebounceEffect
} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import MonacoEditor, {monaco} from "react-monaco-editor"
// 编辑器 注册
// import "@/utils/monacoSpec/theme"
import "@/utils/monacoSpec/fuzzHTTPMonacoSpec"
import "@/utils/monacoSpec/yakEditor"
import "@/utils/monacoSpec/html"

import {
    YakitIMonacoEditor,
    YakitEditorProps,
    YakitITextModel,
    KeyboardToFuncProps,
    YakitIModelDecoration,
    OperationRecord,
    OtherMenuListProps,
    OperationRecordRes
} from "./YakitEditorType"
import {showByRightContext} from "../YakitMenu/showByRightContext"
import {ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult} from "@/utils/editorMarkers"
import {StringToUint8Array} from "@/utils/str"
import {baseMenuLists, extraMenuLists} from "./contextMenus"
import {EditorMenu, EditorMenuItemDividerProps, EditorMenuItemProps, EditorMenuItemType} from "./EditorMenu"
import cloneDeep from "lodash/cloneDeep"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"

import classNames from "classnames"
import styles from "./YakitEditor.module.scss"
import "./StaticYakitEditor.scss"
import {queryYakScriptList} from "@/pages/yakitStore/network"
import {YakScript} from "@/pages/invoker/schema"
import {failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {v4 as uuidv4} from "uuid"
import {editor as newEditor} from "monaco-editor"
import IModelDecoration = newEditor.IModelDecoration
import {
    CountDirectionProps,
    HTTPFuzzerClickEditorMenu,
    HTTPFuzzerRangeEditorMenu,
    HTTPFuzzerRangeReadOnlyEditorMenu
} from "@/pages/fuzzer/HTTPFuzzerEditorMenu"
import {QueryFuzzerLabelResponseProps} from "@/pages/fuzzer/StringFuzzer"
import {insertFileFuzzTag, insertTemporaryFileFuzzTag} from "@/pages/fuzzer/InsertFileFuzzTag"
import {monacoEditorWrite} from "@/pages/fuzzer/fuzzerTemplates"
import {onInsertYakFuzzer, showDictsAndSelect} from "@/pages/fuzzer/HTTPFuzzerPage"
import {openExternalWebsite} from "@/utils/openWebsite"
import emiter from "@/utils/eventBus/eventBus"
import {GetPluginLanguage} from "@/pages/plugins/builtInData"
import {createRoot} from "react-dom/client"
import {setEditorContext, YaklangMonacoSpec} from "@/utils/monacoSpec/yakEditor"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {useStore} from "@/store/editorState"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {IconSolidAIIcon, IconSolidAIWhiteIcon} from "@/assets/icon/colors"
import {PluginSwitchToTag} from "@/pages/pluginEditor/defaultconstants"
import {SyntaxFlowMonacoSpec} from "@/utils/monacoSpec/syntaxflowEditor"
import {
    getStorageYakEditorShortcutKeyEvents,
    getYakEditorShortcutKeyEvents,
    isPageOrGlobalShortcut,
    isYakEditorDefaultShortcut,
    isYakEditorShortcut
} from "@/utils/globalShortcutKey/events/page/yakEditor"
import ShortcutKeyFocusHook from "@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook"
import useFocusContextStore from "@/utils/globalShortcutKey/shortcutKeyFocusHook/hooks/useStore"
import {ShortcutKeyFocusType} from "@/utils/globalShortcutKey/events/global"
import {
    convertKeyboardToUIKey,
    convertKeyEventToKeyCombination,
    sortKeysCombination
} from "@/utils/globalShortcutKey/utils"
import {YakitKeyBoard, YakitKeyMod} from "@/utils/globalShortcutKey/keyboard"
import {applyYakitMonacoTheme} from "@/utils/monacoSpec/theme"
import {useTheme} from "@/hook/useTheme"
import {keepSearchNameMapStore, useKeepSearchNameMap} from "@/store/keepSearchName"
import type {IEvent} from "monaco-editor"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {fontSizeOptions, useEditorFontSize} from "@/store/editorFontSize"
import { JSONParseLog } from "@/utils/tool"

export interface CodecTypeProps {
    key?: string
    verbose: string
    subTypes?: CodecTypeProps[]
    params?: YakParamProps[]
    help?: React.ReactNode
    isYakScript?: boolean
}

export interface contextMenuProps {
    key: string
    value: string
    isAiPlugin: boolean
}

interface IFindReplaceState {
    isRevealed: boolean
    searchString: string
    change(update: {searchString: string}, moveCursor: boolean): void
    onFindReplaceStateChange: IEvent<() => void>
}

interface IFindController extends monaco.editor.IStandaloneCodeEditor {
    getState(): IFindReplaceState
    start(opts?: {
        forceRevealReplace?: boolean
        seedSearchStringFromSelection?: boolean
        shouldFocus?: boolean
        seedSearchStringFromGlobalClipboard?: boolean
    }): void
}

const {ipcRenderer} = window.require("electron")

/** @name 字体key值对应字体大小 */
const keyToFontSize: Record<string, number> = {
    "font-size-small": 12,
    "font-size-middle": 16,
    "font-size-large": 20
}

/** 编辑器右键默认菜单 - 顶部 */
const DefaultMenuTop: (t: (text: string) => string, nowFontsize: number) => EditorMenuItemType[] = (t, nowFontsize) => {
    return [
        {
            key: "font-size",
            label: t("YakitEditor.fontSize"),
            children: fontSizeOptions.map((val)=> ({ key: val+'', label: `${val}${(nowFontsize === val ? '\u00A0\u00A0\u00A0√': '')}` }))
        }
    ]
}

/** 编辑器右键默认菜单 - 底部 */
const DefaultMenuBottom: (t: (text: string) => string) => EditorMenuItemType[] = (t) => {
    return [
        {key: "cut", label: t("YakitEditor.cut")},
        {key: "copy", label: t("YakitEditor.copy")},
        {key: "paste", label: t("YakitEditor.paste")}
    ]
}

function openFind(editor: YakitIMonacoEditor, keyword: string) {
    // editor.focus()
    const findController = editor.getContribution<IFindController>("editor.contrib.findController")
    const state = findController?.getState()
    if (!state?.isRevealed) {
        findController?.start({
            seedSearchStringFromSelection: false,
            shouldFocus: true
        })
    }

    if (state?.searchString !== keyword) {
        state?.change({searchString: keyword}, false)
    }
}

export const YakitEditor: React.FC<YakitEditorProps> = React.memo((props) => {
    const {
        forceRenderMenu = false,
        menuType = [],
        value,
        setValue,
        type,
        theme = "kurior",
        keepSearchName,
        editorDidMount,
        contextMenu = {},
        onContextMenu,
        readOnly = false,
        disabled = false,
        noWordWrap = false,
        noMiniMap = false,
        noLineNumber = false,
        renderValidationDecorations,
        lineNumbersMinChars = 5,
        fontSize = 12,
        showLineBreaks = false,
        editorOperationRecord,
        isShowSelectRangeMenu = false,
        selectNode,
        rangeNode,
        overLine = 3,
        editorId,
        highLightText = [],
        highLightClass,
        highLightFind = [],
        highLightFindClass,
        isPositionHighLightCursor,
        fixContentType,
        originalContentType,
        fixContentTypeHoverMessage,
        onChange,
        // 此处 添加 propsTheme 字段是因为类 弹窗 / 抽屉组件是在 root 节点之外，provider包裹的入口节点就无法实时获取到theme
        propsTheme
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi"])

    const isInitRef = useRef<boolean>(false)
    const {shortcutIds} = useFocusContextStore()
    const [focusIds, setFocusIds] = useState<string[]>([`${ShortcutKeyFocusType.Monaco}-${uuidv4()}`])

    const [editor, setEditor] = useState<YakitIMonacoEditor>()
    const preWidthRef = useRef<number>(0)
    const preHeightRef = useRef<number>(0)

    // 获取查找的关键字
    const keepSearchNameMap = useKeepSearchNameMap()

    /** 编辑器语言 */
    const language = useMemo(() => {
        if (type) {
            return GetPluginLanguage(type)
        }
    }, [type])

    useMemo(() => {
        if (editor) {
            setEditorContext(editor, "plugin", props.type || "")
        }
    }, [props.type, editor])

    const inspectTokens = () => {
        if (editor) {
            editor?.getAction("editor.action.inspectTokens")?.run()
        }
    }

    /** @name 记录右键菜单组信息 */
    const {fontSize: nowFontsize, setFontSize: setNowFontsize, initFontSize } = useEditorFontSize()
    const DefaultMenuTopArr = useMemo(() => DefaultMenuTop(t,nowFontsize), [i18n.language,nowFontsize])
    const DefaultMenuBottomArr = useMemo(() => DefaultMenuBottom(t), [i18n.language])
    const rightContextMenu = useRef<EditorMenuItemType[]>([...DefaultMenuTopArr, ...DefaultMenuBottomArr])
    /** @name 记录右键菜单组内的快捷键对应菜单项的key值 */
    const keyBindingRef = useRef<KeyboardToFuncProps>({})
    /** @name 记录右键菜单关系[菜单组key值-菜单组内菜单项key值数组] */
    const keyToOnRunRef = useRef<Record<string, string[]>>({})

    const [showBreak, setShowBreak, getShowBreak] = useGetState<boolean>(showLineBreaks)
    const {theme: themeGlobal} = useTheme()

    const disableUnicodeDecodeRef = useRef(props.disableUnicodeDecode)

    useLayoutEffect(() => {
        applyYakitMonacoTheme(propsTheme ?? themeGlobal)
    }, [themeGlobal, editor, propsTheme])

    useEffect(() => {
        // 控制编辑器失焦
        if (disabled) {
            const fakeInput = document.createElement("input")
            document.body.appendChild(fakeInput)
            fakeInput.focus()
            document.body.removeChild(fakeInput)
        }
    }, [disabled])

    useEffect(()=>{
        initFontSize()
    },[])

    // 阻止编辑器点击URL默认打开行为 自定义外部系统默认浏览器打开URL
    useEffect(() => {
        monaco.editor.registerLinkOpener({
            open: (link) => {
                // 在系统默认浏览器中打开链接
                openExternalWebsite(link.toString())
                return true
            }
        })
    }, [])

    // 修改主题颜色

    useUpdateEffect(() => {
        if (fontSize) {
            setNowFontsize(fontSize)
            onOperationRecord("fontSize", fontSize)
        }
    }, [fontSize])

    useUpdateEffect(() => {
        setShowBreak(showLineBreaks)
        onOperationRecord("showBreak", showLineBreaks)
    }, [showLineBreaks])

    useUpdateEffect(() => {
        onOperationRecord("noWordWrap", noWordWrap)
    }, [noWordWrap])

    // 自定义HTTP数据包变形处理
    const {customHTTPMutatePlugin, contextMenuPlugin, setCustomHTTPMutatePlugin, setContextMenuPlugin} = useStore()
    const searchCodecCustomHTTPMutatePlugin = useMemoizedFn(() => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total === 0) {
                    return
                }
                setCustomHTTPMutatePlugin(
                    i.map((script) => {
                        return {
                            key: script.ScriptName,
                            verbose: "CODEC 社区插件: " + script.ScriptName,
                            isYakScript: true
                        } as CodecTypeProps
                    })
                )
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            [PluginSwitchToTag.PluginCodecHttpSwitch]
        )
    })

    // 插件扩展
    const searchCodecCustomContextMenuPlugin = useMemoizedFn(() => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total === 0) {
                    return
                }
                setContextMenuPlugin(
                    i.map((script) => {
                        const isAiPlugin: boolean = script.Tags.includes("AI工具")
                        return {
                            key: script.ScriptName,
                            value: script.ScriptName,
                            isAiPlugin
                        } as contextMenuProps
                    })
                )
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            [PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch]
        )
    })

    const ref = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(ref)

    useEffect(() => {
        if (inViewport && menuType.length > 0) {
            searchCodecCustomHTTPMutatePlugin()
            searchCodecCustomContextMenuPlugin()
        }
    }, [inViewport])

    const onRefreshPluginCodecMenu = useMemoizedFn(() => {
        if (inViewport && menuType.length > 0) {
            searchCodecCustomHTTPMutatePlugin()
            searchCodecCustomContextMenuPlugin()
        }
    })

    useEffect(() => {
        emiter.on("onRefPluginCodecMenu", onRefreshPluginCodecMenu)
        return () => {
            emiter.off("onRefPluginCodecMenu", onRefreshPluginCodecMenu)
        }
    }, [])

    // 菜单数组去重
    const menuReduce = useMemoizedFn((array: any[]) => {
        let newArr: any[] = []
        let arr: string[] = []
        array.forEach((item) => {
            if (!arr.includes(item.key)) {
                arr.push(item.key)
                newArr.push(item)
            }
        })
        return newArr
    })

    /**
     * 整理右键菜单的对应关系
     * 菜单组的key值对应的组内菜单项的key值数组
     */
    const extraMenuListsObj = useMemo(() => extraMenuLists(t), [i18n.language])
    const baseMenuListsObj = useMemo(() => baseMenuLists(t), [i18n.language])
    useEffect(() => {
        // 往菜单组中注入codec插件
        try {
            const httpMenu = extraMenuListsObj["http"].menu[0] as EditorMenuItemProps
            const newHttpChildren = menuReduce([
                ...(httpMenu?.children || []),
                ...customHTTPMutatePlugin.map((item) => {
                    return {
                        key: item.key,
                        label: item.key,
                        // 自定义HTTP数据包变形标记
                        isCustom: true
                    } as EditorMenuItemProps
                })
            ])
            // 自定义HTTP数据包变形
            ;(extraMenuListsObj["http"].menu[0] as EditorMenuItemProps).children = newHttpChildren

            // 插件扩展（为保持key值唯一性，添加 plugin- ）
            const newCustomContextMenu = contextMenuPlugin.map((item) => {
                return {
                    key: `plugin-${item.value}`,
                    label: (
                        <>
                            {item.isAiPlugin && (
                                <>
                                    <IconSolidAIIcon className={"ai-plugin-menu-icon-default"} />
                                    <IconSolidAIWhiteIcon className={"ai-plugin-menu-icon-hover"} />
                                </>
                            )}
                            {item.key}
                        </>
                    ),
                    isAiPlugin: item.isAiPlugin
                } as EditorMenuItemProps
            })
            ;(extraMenuListsObj["customcontextmenu"].menu[0] as EditorMenuItemProps).children =
                newCustomContextMenu.length > 0
                    ? newCustomContextMenu
                    : [
                          {
                              key: "Get*plug-in",
                              label: (
                                  <>
                                      <CloudDownloadIcon style={{marginRight: 4}} />
                                      {t("YakitEditor.getPlugin")}
                                  </>
                              ),
                              isGetPlugin: true
                          } as EditorMenuItemProps
                      ]
            // AI插件（为保持key值唯一性，添加 aiplugin- ）
            const newAiPlugin = contextMenuPlugin
                .filter((item) => item.isAiPlugin)
                .map((item) => {
                    return {
                        key: `aiplugin-${item.value}`,
                        label: item.key,
                        isAiPlugin: item.isAiPlugin
                    } as EditorMenuItemProps
                })
            ;(extraMenuListsObj["aiplugin"].menu[0] as EditorMenuItemProps).children =
                newAiPlugin.length > 0
                    ? newAiPlugin
                    : [
                          {
                              key: "aiplugin-Get*plug-in",
                              label: (
                                  <>
                                      <CloudDownloadIcon style={{marginRight: 4}} />
                                      {t("YakitEditor.getPlugin")}
                                  </>
                              ),
                              isGetPlugin: true
                          } as EditorMenuItemProps
                      ]
        } catch (e) {
            failed(`get custom plugin failed: ${e}`)
        }

        const keyToRun: Record<string, string[]> = {}
        const allMenu = {...baseMenuListsObj, ...extraMenuListsObj, ...contextMenu}
        for (let key in allMenu) {
            const keys: string[] = []
            for (let item of allMenu[key].menu) {
                if ((item as EditorMenuItemProps)?.key) keys.push((item as EditorMenuItemProps)?.key)
            }
            keyToRun[key] = keys
        }

        keyToOnRunRef.current = {...keyToRun}
    }, [contextMenu, customHTTPMutatePlugin, contextMenuPlugin, extraMenuListsObj, baseMenuListsObj])

    const {getCurrentSelectPageId} = usePageInfo((s) => ({getCurrentSelectPageId: s.getCurrentSelectPageId}), shallow)

    /** 菜单功能点击处理事件 */
    const {run: menuItemHandle} = useDebounceFn(
        useMemoizedFn((key: string, keyPath: string[]) => {
            if (!editor) return
            /** 是否执行过方法(onRightContextMenu) */
            let executeFunc = false

            if (keyPath.length === 2) {
                const menuName = keyPath[1]
                const menuItemName = keyPath[0]
                for (let name in keyToOnRunRef.current) {
                    if (keyToOnRunRef.current[name].includes(menuName)) {
                        const allMenu = {...baseMenuListsObj, ...extraMenuListsObj, ...contextMenu}
                        let pageId: string | undefined
                        let data: any = undefined
                        // 自定义右键执行携带额外参数
                        if (keyPath.includes("customcontextmenu") || keyPath.includes("aiplugin")) {
                            // 获取页面唯一标识符
                            pageId = getCurrentSelectPageId(YakitRoute.HTTPFuzzer)
                            // 获取是否为ai插件
                            try {
                                // @ts-ignore
                                allMenu[name].menu[0]?.children.map((item) => {
                                    if (item.key === menuItemName && item.isAiPlugin) {
                                        data = true
                                    }
                                    if (item.key === menuItemName && item.isGetPlugin) {
                                        data = "isGetPlugin"
                                    }
                                })
                            } catch (error) {}
                        }
                        if (keyPath.includes("http")) {
                            // 获取是否为自定义HTTP数据包变形标记
                            try {
                                // @ts-ignore
                                allMenu[name].menu[0]?.children.map((item) => {
                                    if (item.key === menuItemName && item.isCustom) {
                                        data = true
                                    }
                                })
                            } catch (error) {}
                        }

                        allMenu[name].onRun(editor, menuItemName, pageId, data)
                        executeFunc = true
                        onRightContextMenu(menuItemName)
                        break
                    }
                }
            }
            // 只有一层时 屏蔽 customcontextmenu 点击
            if (keyPath.length === 1) {
                if (keyPath.includes("customcontextmenu") || keyPath.includes("aiplugin")) return
                const menuName = keyPath[0]
                for (let name in keyToOnRunRef.current) {
                    if (keyToOnRunRef.current[name].includes(menuName)) {
                        const allMenu = {...baseMenuListsObj, ...extraMenuListsObj, ...contextMenu}
                        allMenu[name].onRun(editor, menuName)
                        executeFunc = true
                        onRightContextMenu(menuName)
                        break
                    }
                }
            }

            if (!executeFunc) onRightContextMenu(key)
            return
        }),
        {wait: 300}
    )

    useEffect(() => {
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord).then((data) => {
                try {
                    if (!data) return
                    let obj: OperationRecordRes = JSONParseLog(data, {page:"YakitEditor"})
                    if (typeof obj?.showBreak === "boolean") {
                        setShowBreak(obj?.showBreak)
                    }
                } catch (error) {}
            })
        }
    }, [])

    /** 操作记录存储 */
    const onOperationRecord = (type: "fontSize" | "showBreak" | "noWordWrap", value: number | boolean) => {
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord).then((data) => {
                if (!data) {
                    let obj: OperationRecord = {
                        [type]: value
                    }
                    setRemoteValue(editorOperationRecord, JSON.stringify(obj))
                } else {
                    try {
                        let obj: OperationRecord = JSONParseLog(data, {page:"YakitEditor", fun: "onOperationRecord"})
                        obj[type] = value
                        setRemoteValue(editorOperationRecord, JSON.stringify(obj))
                    } catch (error) {}
                }
            })
        }
    }

    /** 右键菜单功能点击回调事件 */
    const onRightContextMenu = useMemoizedFn((key: string) => {
        /** 获取 ITextModel 实例 */
        const model = editor?.getModel()

        const fontSize = parseInt(key)
        if (!isNaN(fontSize) && fontSizeOptions.includes(fontSize)) {
            if (editor?.updateOptions) {
                onOperationRecord("fontSize", fontSize)
                if (editorId) {
                    emiter.emit(
                        "refreshEditorOperationRecord",
                        JSON.stringify({
                            editorId,
                            fontSize: fontSize
                        })
                    )
                } else {
                    setNowFontsize(fontSize)
                }
            }
            return
        }

        switch (key) {
            case "http-show-break":
                onOperationRecord("showBreak", getShowBreak())
                if (editorId) {
                    emiter.emit(
                        "refreshEditorOperationRecord",
                        JSON.stringify({
                            editorId,
                            showBreak: !getShowBreak()
                        })
                    )
                } else {
                    setShowBreak(!getShowBreak())
                }
                return
            case "yak-formatter":
                if (!model) return
                if (editor) yakCompileAndFormat.run(editor, model)
                return

            default:
                if (onContextMenu && editor) onContextMenu(editor, key)
                return
        }
    })

    /** 菜单自定义快捷键渲染处理事件 */
    const contextMenuKeybindingHandle = useMemoizedFn((parentKey: string, data: EditorMenuItemType[]) => {
        const menus: EditorMenuItemType[] = []
        for (let item of data) {
            /** 屏蔽菜单分割线选项 */
            if (typeof (data as any as EditorMenuItemDividerProps)["type"] !== "undefined") {
                const info: EditorMenuItemDividerProps = {type: "divider"}
                menus.push(info)
            } else {
                /** 处理带快捷键的菜单项 */
                const info = {...item} as EditorMenuItemProps
                if (info.children && info.children.length > 0) {
                    info.children = contextMenuKeybindingHandle(info.key, info.children)
                } else {
                    if (info.key === "cut" && info.label === t("YakitEditor.cut")) {
                        const keysContent = convertKeyboardToUIKey([YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_X])

                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>{t("YakitEditor.cut")}</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }
                    if (info.key === "copy" && info.label === t("YakitEditor.copy")) {
                        const keysContent = convertKeyboardToUIKey([YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_C])
                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>{t("YakitEditor.copy")}</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }
                    if (info.key === "paste" && info.label === t("YakitEditor.paste")) {
                        const keysContent = convertKeyboardToUIKey([YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_V])
                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>{t("YakitEditor.paste")}</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }

                    if (info.keybindings && info.keybindings.length > 0) {
                        const keyArr = getYakEditorShortcutKeyEvents()[info.keybindings].keys
                        const keysContent = convertKeyboardToUIKey(keyArr)
                        // 记录自定义快捷键映射按键的回调事件
                        if (keysContent) {
                            let sortKeys = sortKeysCombination(keyArr)
                            keyBindingRef.current[sortKeys.join("-")] = parentKey ? [info.key, parentKey] : [info.key]
                        }

                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>{info.label}</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }
                }
                menus.push(info)
            }
        }
        return menus
    })

    const sortMenuFun = useMemoizedFn((dataSource, sortData) => {
        const result = sortData.reduce(
            (acc, item) => {
                if (item.order >= 0) {
                    acc.splice(item.order, 0, ...item.menu)
                } else {
                    acc.push(...item.menu)
                }
                return acc
            },
            [...dataSource]
        )
        return result
    })
    /** yak后缀文件中，右键菜单增加'Yak 代码格式化'功能 */
    useEffect(() => {
        /**
         * @description 使用下方的判断逻辑，将导致后续的(额外菜单变动)无法在右键菜单再渲染中生效
         */
        // if (isInitRef.current) return
        rightContextMenu.current = [...DefaultMenuTopArr]
        keyBindingRef.current = {}

        if (type === "http") {
            rightContextMenu.current = rightContextMenu.current.concat([
                {
                    key: "http-show-break",
                    label: getShowBreak() ? t("YakitEditor.hideLineBreaks") : t("YakitEditor.showLineBreaks")
                }
            ])
        }
        if (language === "yak") {
            rightContextMenu.current = rightContextMenu.current.concat([
                {type: "divider"},
                {key: "yak-formatter", label: t("YakitEditor.yakCodeFormat")}
            ])
        }
        if (menuType.length > 0) {
            const types = Array.from(new Set(menuType))
            for (let key of types) {
                const obj = {...extraMenuListsObj[key].menu[0]}
                rightContextMenu.current = rightContextMenu.current.concat([{type: "divider"}, obj])
            }
        }
        // 缓存需要排序的自定义菜单
        let sortContextMenu: OtherMenuListProps[] = []
        for (let menus in contextMenu) {
            /* 需要排序项 */
            if (typeof contextMenu[menus].order === "number") {
                sortContextMenu = sortContextMenu.concat(cloneDeep(contextMenu[menus]) as any as OtherMenuListProps[])
            } else {
                /** 当cloneDeep里面存在reactnode时，执行会产生性能问题 */
                rightContextMenu.current = rightContextMenu.current.concat(cloneDeep(contextMenu[menus].menu))
            }
        }

        // 底部默认菜单
        rightContextMenu.current = rightContextMenu.current.concat([...DefaultMenuBottomArr])

        // 当存在order项则需要排序
        if (sortContextMenu.length > 0) {
            rightContextMenu.current = sortMenuFun(rightContextMenu.current, sortContextMenu)
        }
        rightContextMenu.current = contextMenuKeybindingHandle("", rightContextMenu.current)

        if (!forceRenderMenu) isInitRef.current = true
    }, [forceRenderMenu, menuType, contextMenu, contextMenuPlugin, customHTTPMutatePlugin, extraMenuListsObj])

    /**
     * editor编辑器的额外渲染功能:
     * 1、每行的换行符进行可视字符展示
     */
    const pasteWarning = useThrottleFn(
        () => {
            failed(t("YakitEditor.pasteTooFast"))
        },
        {wait: 500}
    )

    const rafIdRef = useRef<number | null>(null) // RAF ID
    const deltaDecorationsRef = useRef<() => any>()
    const highLightTextFun = useMemoizedFn(() => highLightText)
    const highLightFindFun = useMemoizedFn(() => highLightFind)
    const fixContentTypeFun = useMemoizedFn(() => fixContentType)
    const originalContentTypeFun = useMemoizedFn(() => originalContentType)
    const fixContentTypeHoverMessageFun = useMemoizedFn(() => fixContentTypeHoverMessage)
    const privacyFun = useMemoizedFn(() => props.privacy)
    // 存储当前的隐私遮挡范围信息
    const privacyMaskRangesRef = useRef<{id: string, range: monaco.Range}[]>([])
    // 跟踪 model 是否已被释放
    const isModelDisposedRef = useRef<boolean>(false)
    useEffect(() => {
        if (!editor) {
            return
        }
        const model = editor.getModel()
        if (!model) {
            return
        }
        isModelDisposedRef.current = false

        let current: string[] = []

        /** 随机上下文ID */
        const randomStr = randomString(10)
        /** 对于需要自定义命令的快捷键生成对应的上下文ID */
        let yakitEditor = editor.createContextKey(randomStr, false)
        // @ts-ignore
        yakitEditor.set(true)
        /* limited paste by interval */
        let lastPasteTime = 0
        let pasteLimitInterval = 80
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
            () => {
                const current = new Date().getTime()
                const currentInterval = current - lastPasteTime
                if (currentInterval < pasteLimitInterval) {
                    pasteWarning.run()
                } else {
                    lastPasteTime = current
                    editor.trigger("keyboard", "editor.action.clipboardPasteAction", {})
                }
            },
            randomStr
        )
        const generateDecorations = (): YakitIModelDecoration[] => {
            // 检查 model 是否已被释放
            if (!model || isModelDisposedRef.current) return []
            try {
                const endsp = model.getPositionAt(1800)
            const dec: YakitIModelDecoration[] = []
            const text =
                endsp.lineNumber === 1
                    ? model.getValueInRange({
                          startLineNumber: 1,
                          startColumn: 1,
                          endLineNumber: 1,
                          endColumn: endsp.column
                      })
                    : model.getValueInRange({
                          startLineNumber: 1,
                          startColumn: 1,
                          endLineNumber: endsp.lineNumber,
                          endColumn: endsp.column
                      })

            if (props.type === "http") {
                ;(() => {
                    try {
                        //http
                        ;[{regexp: /\nContent-Length:\s*?\d+/, classType: "content-length"}].map((detail) => {
                            // handle content-length
                            const match = detail.regexp.exec(text)
                            if (!match) {
                                return
                            }
                            const start = model.getPositionAt(match.index)
                            const end = model.getPositionAt(match.index + match[0].indexOf(":"))
                            dec.push({
                                id: detail.classType + match.index,
                                ownerId: 0,
                                range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                options: {
                                    afterContentClassName: `${detail.classType} lang-${i18n.language}`
                                }
                            } as YakitIModelDecoration)
                        })
                    } catch (e) {}
                })()
                ;(() => {
                    try {
                        const hostRegex = /\nHost:\s*?([^\r\n]+)/
                        const hostMatch = hostRegex.exec(text)
                        if (!hostMatch) return
                        
                        const fullMatch = hostMatch[0]
                        const hostColonIndex = hostMatch.index + fullMatch.indexOf(":")
                        const hostLabelStart = model.getPositionAt(hostMatch.index)
                        const hostLabelEnd = model.getPositionAt(hostColonIndex + 1)
                        
                        // 添加 Host 标签装饰器（? 标记）
                        dec.push({
                            id: `host-label-${hostMatch.index}`,
                            ownerId: 0,
                            range: new monaco.Range(
                                hostLabelStart.lineNumber,
                                hostLabelStart.column,
                                hostLabelEnd.lineNumber,
                                hostLabelEnd.column
                            ),
                            options: {
                                afterContentClassName: `host lang-${i18n.language}`
                            }
                        } as YakitIModelDecoration)
                        
                        if (!privacyFun()) return
                        
                        // 提取并处理 Host 值
                        const hostValue = hostMatch[1].trim()
                        if (!hostValue) return
                        
                        const colonIndex = hostValue.indexOf(":")
                        const hostname = colonIndex > 0 ? hostValue.substring(0, colonIndex) : hostValue
                        if (!hostname) return
                        
                        // 构建搜索模式（hostname、hostname:port、不带www的域名）
                        const patterns = [hostname]
                        if (colonIndex > 0) patterns.push(hostValue)
                        if (hostname.toLowerCase().startsWith("www.")) {
                            const withoutWww = hostname.substring(4)
                            if (withoutWww) patterns.push(withoutWww)
                        }
                        
                        // 使用正则一次性查找所有匹配
                        const fullText = model.getValue()
                        const escapedPatterns = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                        const searchRegex = new RegExp(escapedPatterns.join('|'), 'g')
                        
                        const matches: {index: number, length: number}[] = []
                        let match: RegExpExecArray | null
                        while ((match = searchRegex.exec(fullText)) !== null) {
                            matches.push({index: match.index, length: match[0].length})
                        }
                        
                        // 去重重叠匹配（保留较长的）
                        const filtered = matches.sort((a, b) => 
                            a.index !== b.index ? a.index - b.index : b.length - a.length
                        ).filter((curr, idx, arr) => 
                            idx === 0 || curr.index >= arr[idx - 1].index + arr[idx - 1].length
                        )
                        
                        // 获取光标位置用于判断是否显示遮罩
                        const cursorPos = editor.getPosition()
                        const newPrivacyRanges: {id: string, range: monaco.Range}[] = []
                        
                        filtered.forEach((m, idx) => {
                            const start = model.getPositionAt(m.index)
                            const end = model.getPositionAt(m.index + m.length)
                            const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column)
                            const decorationId = `host-privacy-${idx}`
                            
                            newPrivacyRanges.push({id: decorationId, range})
                            
                            // 光标在范围内则不显示遮罩
                            const isCursorIn = cursorPos?.lineNumber === start.lineNumber &&
                                cursorPos.column >= start.column &&
                                cursorPos.column <= end.column
                            
                            if (!isCursorIn) {
                                dec.push({
                                    id: decorationId,
                                    ownerId: 0,
                                    range,
                                    options: {
                                        inlineClassName: `host-privacy-mask-hidden lang-${i18n.language}`,
                                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                                    }
                                } as YakitIModelDecoration)
                            }
                        })
                        
                        privacyMaskRangesRef.current = newPrivacyRanges
                    } catch (e) {}
                })()
            }
            const needDecode = props.type && ["html", "http", "json"].includes(props.type)
            if (needDecode && !disableUnicodeDecodeRef.current) {
                ;(() => {
                    // http html json
                    const text = model.getValue()
                    let match
                    const regex = /(\\u[\dabcdef]{4})+/gi

                    while ((match = regex.exec(text)) !== null) {
                        const start = model.getPositionAt(match.index)
                        const end = model.getPositionAt(match.index + match[0].length)
                        const decoded = match[0]
                            .split("\\u")
                            .filter(Boolean)
                            .map((hex) => String.fromCharCode(parseInt(hex, 16)))
                            .join("")
                        dec.push({
                            id: "decode" + match.index,
                            ownerId: 1,
                            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                            options: {
                                className: "unicode-decode",
                                hoverMessage: {value: decoded},
                                afterContentClassName: "unicode-decode",
                                after: {content: decoded, inlineClassName: "unicode-decode-after"}
                            }
                        } as IModelDecoration)
                    }
                })()
            }

            ;(() => {
                const targetValue = fixContentTypeFun()
                if (!targetValue) return
                const text = model.getValue()
                let match

                // 匹配 Content-Type: 后面的值
                const regex = /Content-Type:\s*([^\r\n]*)/gi

                while ((match = regex.exec(text)) !== null) {
                    const contentTypeValue = match[1].trim() // 获取 Content-Type 后的值并去除多余空格
                    if (contentTypeValue === targetValue) {
                        // 计算 Content-Type: 后具体值的起始位置，避免空格问题
                        const textBeforeMatch = text.substring(match.index, regex.lastIndex) // 获取匹配到的完整文本
                        const contentStartIndex = match.index + textBeforeMatch.indexOf(contentTypeValue) // 确保起始位置精确匹配

                        const start = model.getPositionAt(contentStartIndex)
                        const end = model.getPositionAt(match.index + match[0].length)

                        dec.push({
                            id: "decode" + match.index,
                            ownerId: 1,
                            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                            options: {
                                className: "unicode-decode",
                                hoverMessage: {value: fixContentTypeHoverMessageFun()},
                                afterContentClassName: "unicode-decode",
                                after: {
                                    content:
                                        originalContentTypeFun() === ""
                                            ? t("YakitEditor.emptyContentTypeAutoDetected")
                                            : originalContentTypeFun(),
                                    inlineClassName: "unicode-decode-after"
                                }
                            }
                        } as IModelDecoration)
                    }
                }
            })()
            ;(() => {
                // all
                const keywordRegExp = /\r?\n/g
                let match
                let count = 0
                while ((match = keywordRegExp.exec(text)) !== null) {
                    count++
                    const start = model.getPositionAt(match.index)
                    const className: "crlf" | "lf" = match[0] === "\r\n" ? "crlf" : "lf"
                    const end = model.getPositionAt(match.index + match[0].length)
                    dec.push({
                        id: "keyword" + match.index,
                        ownerId: 2,
                        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                        options: {beforeContentClassName: className}
                    } as YakitIModelDecoration)
                    if (count > 19) {
                        return
                    }
                }
            })()

            function highLightRange(item) {
                const {
                    startOffset = 0,
                    highlightLength = 0,
                    startLineNumber,
                    startColumn,
                    endLineNumber,
                    endColumn
                } = item
                let range = {
                    startLineNumber: 0,
                    startColumn: 0,
                    endLineNumber: 0,
                    endColumn: 0
                }
                if (typeof startLineNumber === "number") {
                    range.startLineNumber = startLineNumber
                    range.startColumn = startColumn
                    range.endLineNumber = endLineNumber
                    range.endColumn = endColumn
                } else {
                    if (model) {
                        // 获取偏移量对应的位置
                        const startPosition = model.getPositionAt(Number(startOffset))
                        const endPosition = model.getPositionAt(Number(startOffset) + Number(highlightLength))
                        range.startLineNumber = startPosition.lineNumber
                        range.startColumn = startPosition.column
                        range.endLineNumber = endPosition.lineNumber
                        range.endColumn = endPosition.column
                    }
                }
                return range
            }

            ;(() => {
                //all
                highLightTextFun().forEach((item) => {
                    const range = highLightRange(item)
                    // 创建装饰选项
                    dec.push({
                        id:
                            "hight-light-text_" +
                            range.startLineNumber +
                            "_" +
                            range.startColumn +
                            "_" +
                            range.endLineNumber +
                            "_" +
                            range.endColumn,
                        ownerId: 3,
                        range: new monaco.Range(
                            range.startLineNumber,
                            range.startColumn,
                            range.endLineNumber,
                            range.endColumn
                        ),
                        options: {
                            isWholeLine: false,
                            className: highLightClass ? highLightClass : "hight-light-default-bg-color",
                            hoverMessage: [{value: item.hoverVal, isTrusted: true}]
                        }
                    } as IModelDecoration)
                })

                highLightFindFun().forEach((item) => {
                    const range = highLightRange(item)
                    // 创建装饰选项
                    dec.push({
                        id:
                            "hight-light-find_" +
                            range.startLineNumber +
                            "_" +
                            range.startColumn +
                            "_" +
                            range.endLineNumber +
                            "_" +
                            range.endColumn,
                        ownerId: 3,
                        range: new monaco.Range(
                            range.startLineNumber,
                            range.startColumn,
                            range.endLineNumber,
                            range.endColumn
                        ),
                        options: {
                            isWholeLine: false,
                            className: highLightFindClass ? highLightFindClass : "hight-light-find-default-bg-color",
                            hoverMessage: [{value: "", isTrusted: true}]
                        }
                    } as IModelDecoration)
                })
            })()

                return dec
            } catch (e) {
                // model 可能已被释放
                return []
            }
        }

        const scheduleDecorations = () => {
            // 取消之前排队的 rAF
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current)
            }

            // 只保留最新一次触发
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null
                if (!model || model.isDisposed()) return
                try {
                    current = model.deltaDecorations(current, generateDecorations())
                } catch (e) {}
            })
        }

        deltaDecorationsRef.current = () => {
            scheduleDecorations()
        }

        let lastValue = model.getValue()
        editor.onDidChangeModelContent((e) => {
            const newValue = model.getValue()
            if (newValue === lastValue) {
                return
            }
            lastValue = newValue
            try {
                current = model.deltaDecorations(current, generateDecorations())
            } catch (e) {}
        })
        scheduleDecorations()
        
        // 监听光标位置变化，用于隐私模式的动态显示/隐藏
        const cursorPositionDisposable = editor.onDidChangeCursorPosition(() => {
            if (props.type === "http") {
                scheduleDecorations()
            }
        })

        // 监听查找面板变化
        const findController = editor.getContribution<IFindController>("editor.contrib.findController")
        const state = findController?.getState()
        state?.onFindReplaceStateChange(() => {
            if (!keepSearchName) return
            if (state.isRevealed) {
                keepSearchNameMapStore.setKeepSearchNameMap(keepSearchName, state.searchString || "")
            } else {
                keepSearchNameMapStore.removeKeepSearchNameMap(keepSearchName)
            }
        })

        // 添加点击事件处理，用于临时解除 Host 值的打码
        let isHandlingPrivacyClick = false
        const handleHostPrivacyClick = (e: monaco.editor.IEditorMouseEvent) => {
            if (!e.event.leftButton || props.type !== "http" || isHandlingPrivacyClick) {
                return
            }
            
            const clickPosition = e.target.position
            if (!clickPosition) {
                return
            }
            
            // 获取当前光标位置
            const currentCursorPosition = editor.getPosition()
            
            // 使用存储的隐私遮挡范围来检测点击
            const clickedPrivacyRange = privacyMaskRangesRef.current.find((item) => {
                const range = item.range
                // 检查点击位置是否在遮挡范围内
                return (
                    clickPosition.lineNumber === range.startLineNumber &&
                    clickPosition.column >= range.startColumn &&
                    clickPosition.column <= range.endColumn
                )
            })
            
            if (clickedPrivacyRange) {
                const range = clickedPrivacyRange.range
                
                // 检查光标是否已经在这个区域内（遮挡已解除）
                // 如果是，则不需要再设置光标位置
                if (currentCursorPosition) {
                    const isCursorAlreadyInRange = (
                        currentCursorPosition.lineNumber === range.startLineNumber &&
                        currentCursorPosition.column >= range.startColumn &&
                        currentCursorPosition.column <= range.endColumn
                    )
                    if (isCursorAlreadyInRange) {
                        return // 光标已在区域内，不处理
                    }
                }
                
                isHandlingPrivacyClick = true
                // 将光标移动到隐私区域之后，触发临时解除
                // 光标位置变化会自动通过 onDidChangeCursorPosition 触发装饰器更新
                editor.setPosition({
                    lineNumber: range.endLineNumber,
                    column: range.endColumn
                })
                editor.focus()
                // 使用 setTimeout 重置标志，避免连续触发
                setTimeout(() => {
                    isHandlingPrivacyClick = false
                }, 100)
            }
        }
        
        const mouseDownDisposable = editor.onMouseDown(handleHostPrivacyClick)
        return () => {
            try {
                isModelDisposedRef.current = true
                cursorPositionDisposable.dispose()
                mouseDownDisposable.dispose()
                editor.dispose()
            } catch (e) {}
        }
    }, [editor])
    useEffect(() => {
        if (deltaDecorationsRef.current) {
            disableUnicodeDecodeRef.current = props.disableUnicodeDecode
            deltaDecorationsRef.current()
        }
    }, [
        JSON.stringify(highLightText),
        JSON.stringify(highLightFind),
        props.disableUnicodeDecode,
        props.fixContentType,
        props.originalContentType,
        props.fixContentTypeHoverMessage,
        i18n.language,
        props.privacy
    ])
    // 定位高亮光标位置
    useDebounceEffect(
        () => {
            try {
                if (editor && isPositionHighLightCursor && highLightFind?.length) {
                    const model = editor.getModel()
                    if ("startOffset" in highLightFind[0]) {
                        const startPosition = model?.getPositionAt(Number(highLightFind[0].startOffset))
                        if (startPosition) {
                            editor.revealPositionInCenter(startPosition)
                        }
                    } else if ("startLineNumber" in highLightFind[0]) {
                        editor.revealPositionInCenter({
                            lineNumber: highLightFind[0].startLineNumber,
                            column: highLightFind[0].startColumn
                        })
                    }
                }
            } catch (error) {}
        },
        [editor, isPositionHighLightCursor, JSON.stringify(highLightFind)],
        {wait: 300}
    )

    /** 右键菜单-重渲染换行符功能是否显示的开关文字内容 */
    useEffect(() => {
        const flag = rightContextMenu.current.filter((item) => {
            return (item as EditorMenuItemProps)?.key === "http-show-break"
        })
        if (flag.length > 0 && type === "http") {
            for (let item of rightContextMenu.current) {
                const info = item as EditorMenuItemProps
                if (info?.key === "http-show-break")
                    info.label = getShowBreak() ? t("YakitEditor.hideLineBreaks") : t("YakitEditor.showLineBreaks")
            }
        }
    }, [showBreak])

    const showContextMenu = useMemoizedFn(() => {
        showByRightContext(
            <EditorMenu
                size='rightMenu'
                data={[...rightContextMenu.current]}
                onClick={({key, keyPath}) => menuItemHandle(key, keyPath)}
            />
        )
    })

    /** 计算编辑器的高度 有点问题，为什么用state记录而不是ref记录，测试过后删除该问题 */
    const handleEditorMount = (editor: YakitIMonacoEditor, monaco: any) => {
        editor.onDidChangeModelDecorations(() => {
            updateEditorHeight() // typing
            /**
             * @description 浏览器自带函数(IE9以上版本特性)，自动获取屏幕刷新率，计算出计时器的执行时间，并触发传入的回调函数
             */
            requestAnimationFrame(updateEditorHeight) // folding
        })

        const updateEditorHeight = () => {
            const editorElement = editor.getDomNode()

            if (!editorElement) {
                return
            }

            const padding = 40

            const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
            const lineCount = editor.getModel()?.getLineCount() || 1
            const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight + padding

            if (preHeightRef.current !== height) {
                preHeightRef.current = height
                // setPreHeight(height)
                editorElement.style.height = `${height}px`
                editor.layout()
            }
        }
    }

    /** Yak 代码格式化功能实现 */
    const yakCompileAndFormat = useDebounceFn(
        useMemoizedFn((editor: YakitIMonacoEditor, model: YakitITextModel) => {
            const allContent = model.getValue()
            ipcRenderer
                .invoke("YaklangCompileAndFormat", {Code: allContent})
                .then((e: {Errors: YakStaticAnalyzeErrorResult[]; Code: string}) => {
                    if (e.Code !== "") {
                        model.setValue(e.Code)
                    }

                    /** 编辑器中错误提示的标记 */
                    if (e && e.Errors.length > 0) {
                        const markers = e.Errors.map(ConvertYakStaticAnalyzeErrorToMarker)
                        monaco.editor.setModelMarkers(model, "owner", markers)
                    } else {
                        monaco.editor.setModelMarkers(model, "owner", [])
                    }
                })
                .catch((e) => {
                    console.info(e)
                })
        }),
        {wait: 500, leading: true, trailing: false}
    )

    const AnalyzeSessionIDRef = useRef<string>(uuidv4())
    /** Yak语言 代码错误检查并显示提示标记 */
    const yakStaticAnalyze = useDebounceFn(
        useMemoizedFn((editor: YakitIMonacoEditor, model: YakitITextModel) => {
            if (language === YaklangMonacoSpec || language === SyntaxFlowMonacoSpec) {
                const allContent = model.getValue()
                ipcRenderer
                    .invoke("StaticAnalyzeError", {Code: StringToUint8Array(allContent), PluginType: type, SessionID: AnalyzeSessionIDRef.current})
                    .then((e: {Result: YakStaticAnalyzeErrorResult[]}) => {
                        if (e && e.Result.length > 0) {
                            const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
                            monaco.editor.setModelMarkers(model, "owner", markers)
                        } else {
                            monaco.editor.setModelMarkers(model, "owner", [])
                        }
                    })
            } else {
                monaco.editor.setModelMarkers(model, "owner", [])
            }
        }),
        {wait: 300}
    )

    const downPosY = useRef<number>()
    const upPosY = useRef<number>()
    const onScrollTop = useRef<number>()
    // 编辑器信息(长宽等)
    const editorInfo = useRef<any>()
    useEffect(() => {
        if (editor && isShowSelectRangeMenu) {
            editerMenuFun(editor)
        }
    }, [editor, isShowSelectRangeMenu])
    // 定时消失的定时器
    const fizzSelectTimeoutId = useRef<NodeJS.Timeout>()
    const fizzRangeTimeoutId = useRef<NodeJS.Timeout>()
    // 编辑器菜单
    const editerMenuFun = (editor: YakitIMonacoEditor) => {
        // 编辑器点击弹窗的唯一Id
        const selectId: string = `monaco.fizz.select.widget-${uuidv4()}`
        // 编辑器选中弹窗的唯一Id
        const rangeId: string = `monaco.fizz.range.widget-${uuidv4()}`
        // 插入标签
        const insertLabelFun = (v: QueryFuzzerLabelResponseProps) => {
            if (v.Label) {
                editor && editor.trigger("keyboard", "type", {text: v.Label})
            } else if (v.DefaultDescription === "插入文件-fixed") {
                editor && insertFileFuzzTag((i) => monacoEditorWrite(editor, i), "file:line")
            } else if (v.DefaultDescription === "插入字典-fixed") {
                editor &&
                    showDictsAndSelect((i) => {
                        monacoEditorWrite(editor, i, editor.getSelection())
                    })
            } else if (v.DefaultDescription === "插入临时字典-fixed") {
                editor && insertTemporaryFileFuzzTag((i) => monacoEditorWrite(editor, i))
            }
        }
        const toOpenAiChat = (scriptName: string) => {
            if (scriptName === "aiplugin-Get*plug-in") {
                emiter.emit("onOpenFuzzerModal", JSON.stringify({scriptName, isAiPlugin: "isGetPlugin"}))
                closeFizzRangeWidget()
                return
            }

            if (editor) {
                const selectedText = editor.getModel()?.getValueInRange(editor.getSelection() as any) || value
                emiter.emit("onOpenFuzzerModal", JSON.stringify({text: selectedText, scriptName, isAiPlugin: true}))
                closeFizzRangeWidget()
            }
        }
        // 编辑器点击显示的菜单
        const fizzSelectWidget = {
            isOpen: false,
            getId: function () {
                return selectId
            },
            getDomNode: function () {
                // 将TSX转换为DOM节点
                const domNode = document.createElement("div")
                // 解决弹窗内鼠标滑轮无法滚动的问题
                domNode.onwheel = (e) => e.stopPropagation()
                if (selectNode) {
                    createRoot(domNode).render(selectNode(closeFizzSelectWidget, editorInfo.current))
                } else {
                    createRoot(domNode).render(
                        <HTTPFuzzerClickEditorMenu
                            editorInfo={editorInfo.current}
                            close={() => closeFizzSelectWidget()}
                            fizzSelectTimeoutId={fizzSelectTimeoutId}
                            toOpenAiChat={toOpenAiChat}
                            insert={(v: QueryFuzzerLabelResponseProps) => {
                                insertLabelFun(v)
                                closeFizzSelectWidget()
                            }}
                            addLabel={() => {
                                closeFizzSelectWidget()
                                onInsertYakFuzzer(editor)
                            }}
                        />
                    )
                }
                return domNode
            },
            getPosition: function () {
                const currentPos = editor.getPosition()
                return {
                    position: {
                        lineNumber: currentPos?.lineNumber || 0,
                        column: currentPos?.column || 0
                    },
                    preference: [1, 2]
                }
            },
            update: function () {
                // 更新小部件的位置
                this.getPosition()
                editor.layoutContentWidget(this)
            }
        }
        // 编辑器选中显示的菜单
        const fizzRangeWidget = {
            isOpen: false,
            getId: function () {
                return rangeId
            },
            getDomNode: function () {
                // 将TSX转换为DOM节点
                const domNode = document.createElement("div")
                // 解决弹窗内鼠标滑轮无法滚动的问题
                domNode.onwheel = (e) => e.stopPropagation()
                if (rangeNode) {
                    createRoot(domNode).render(rangeNode(closeFizzRangeWidget, editorInfo.current))
                } else {
                    readOnly
                        ? createRoot(domNode).render(
                              <HTTPFuzzerRangeReadOnlyEditorMenu
                                  editorInfo={editorInfo.current}
                                  rangeValue={
                                      (editor && editor.getModel()?.getValueInRange(editor.getSelection() as any)) || ""
                                  }
                                  close={() => closeFizzRangeWidget()}
                                  fizzRangeTimeoutId={fizzRangeTimeoutId}
                              />
                          )
                        : createRoot(domNode).render(
                              <HTTPFuzzerRangeEditorMenu
                                  editorInfo={editorInfo.current}
                                  close={() => closeFizzRangeWidget()}
                                  insert={(fun: any) => {
                                      if (editor) {
                                          const selectedText =
                                              editor.getModel()?.getValueInRange(editor.getSelection() as any) || ""
                                          if (selectedText.length > 0) {
                                              ipcRenderer
                                                  .invoke("QueryFuzzerLabel")
                                                  .then((data: {Data: QueryFuzzerLabelResponseProps[]}) => {
                                                      const {Data} = data
                                                      let newSelectedText: string = selectedText
                                                      if (Array.isArray(Data) && Data.length > 0) {
                                                          // 选中项是否存在于标签中
                                                          let isHave: boolean = Data.map((item) => item.Label).includes(
                                                              selectedText
                                                          )
                                                          if (isHave) {
                                                              newSelectedText = selectedText.replace(/{{|}}/g, "")
                                                          }
                                                      }
                                                      const text: string = fun(newSelectedText)
                                                      //   editor.trigger("keyboard", "type", {text})// 选择范围大会卡死
                                                      monacoEditorWrite(editor, text)
                                                  })
                                          }
                                      }
                                  }}
                                  replace={(text: string) => {
                                      if (editor) {
                                          editor.trigger("keyboard", "paste", {text})
                                          closeFizzRangeWidget()
                                      }
                                  }}
                                  toOpenAiChat={toOpenAiChat}
                                  rangeValue={
                                      (editor && editor.getModel()?.getValueInRange(editor.getSelection() as any)) || ""
                                  }
                                  fizzRangeTimeoutId={fizzRangeTimeoutId}
                                  hTTPFuzzerClickEditorMenuProps={
                                      readOnly
                                          ? undefined
                                          : {
                                                editorInfo: editorInfo.current,
                                                close: () => closeFizzRangeWidget(),
                                                insert: (v: QueryFuzzerLabelResponseProps) => {
                                                    insertLabelFun(v)
                                                    closeFizzRangeWidget()
                                                },
                                                addLabel: () => {
                                                    closeFizzRangeWidget()
                                                    onInsertYakFuzzer(editor)
                                                }
                                            }
                                  }
                              />
                          )
                }
                return domNode
            },
            getPosition: function () {
                const currentPos = editor.getPosition()

                return {
                    position: {
                        lineNumber: currentPos?.lineNumber || 0,
                        column: currentPos?.column || 0
                    },
                    preference: [1, 2]
                }
            },
            update: function () {
                // 更新小部件的位置
                this.getPosition()
                editor.layoutContentWidget(this)
            }
        }
        // 是否展示菜单
        // if (false) {
        //     closeFizzSelectWidget()
        //     return
        // }

        // 关闭点击的菜单
        const closeFizzSelectWidget = () => {
            fizzSelectWidget.isOpen = false
            fizzSelectTimeoutId.current && clearTimeout(fizzSelectTimeoutId.current)
            editor.removeContentWidget(fizzSelectWidget)
        }
        // 关闭选中的菜单
        const closeFizzRangeWidget = () => {
            fizzRangeWidget.isOpen = false
            fizzRangeTimeoutId.current && clearTimeout(fizzRangeTimeoutId.current)
            editor.removeContentWidget(fizzRangeWidget)
        }

        // 编辑器更新 关闭之前展示
        closeFizzSelectWidget()
        closeFizzRangeWidget()

        editor?.getModel()?.pushEOL(newEditor.EndOfLineSequence.CRLF)
        editor.onMouseMove((e) => {
            try {
                // const pos = e.target.position
                // if (pos?.lineNumber) {
                //     const lineOffset = pos.lineNumber - (editor.getPosition()?.lineNumber || 0)
                //     // 超出范围移除菜单
                //     if (lineOffset > 2 || lineOffset < -2) {
                //         // console.log("移出两行内");
                //         closeFizzSelectWidget()
                //         closeFizzRangeWidget()
                //     }
                // }

                const {target, event} = e
                const {posy} = event
                const detail =
                    target.type === newEditor.MouseTargetType.CONTENT_WIDGET ||
                    target.type === newEditor.MouseTargetType.OVERLAY_WIDGET
                        ? target.detail
                        : undefined
                const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
                if (detail !== selectId && detail !== rangeId && downPosY.current && upPosY.current) {
                    const overHeight = overLine * lineHeight
                    if (fizzSelectWidget.isOpen) {
                        if (posy < upPosY.current - overHeight || posy > upPosY.current + overHeight) {
                            closeFizzSelectWidget()
                        }
                    } else if (fizzRangeWidget.isOpen) {
                        // 从上到下的选择范围
                        if (
                            downPosY.current < upPosY.current &&
                            (posy < downPosY.current - overHeight || posy > upPosY.current + overHeight)
                        ) {
                            closeFizzRangeWidget()
                        }
                        // 从下到上的选择范围
                        else if (
                            downPosY.current > upPosY.current &&
                            (posy < upPosY.current - overHeight || posy > downPosY.current + overHeight)
                        ) {
                            closeFizzRangeWidget()
                        }
                    }
                }
            } catch (e) {}
        })

        // 移出编辑器时触发
        // editor.onMouseLeave(() => {
        //     closeFizzSelectWidget()
        //     closeFizzRangeWidget()
        // })

        editor.onMouseDown((e) => {
            const {leftButton, posy} = e.event
            // 当两者都没有打开时
            if (leftButton && !fizzSelectWidget.isOpen && !fizzRangeWidget.isOpen) {
                // 记录posy位置
                downPosY.current = posy
            }
        })

        editor.onMouseUp((e) => {
            // @ts-ignore
            const {leftButton, rightButton, posx, posy, editorPos} = e.event
            // 获取编辑器所处x，y轴,并获取其长宽
            const {x, y} = editorPos
            const editorHeight = editorPos.height
            const editorWidth = editorPos.width

            // 计算焦点的坐标位置
            let a: any = editor.getPosition()
            const position = editor.getScrolledVisiblePosition(a)
            if (position) {
                // 获取焦点在编辑器中所处位置，height为每行所占高度（随字体大小改变）
                const {top, left, height} = position

                // 解决方法1
                // 获取焦点位置判断焦点所处于编辑器的位置（上下左右）从而决定弹出层显示方向
                // 问题  需要焦点位置进行计算 如何获取焦点位置？  目前仅找到行列号 无法定位到其具体坐标位置
                // console.log("焦点位置：", e, x, left, y, top, x + left, y + top)
                const focusX = x + left
                const focusY = y + top

                // 焦点与抬起坐标是否超出限制
                const isOver: boolean = overLine * height < Math.abs(focusY - posy)
                if (leftButton && !isOver) {
                    // 获取编辑器容器的相关信息并判断其处于编辑器的具体方位
                    const editorContainer = editor.getDomNode()
                    if (editorContainer) {
                        const editorContainerInfo = editorContainer.getBoundingClientRect()
                        const {top, bottom, left, right} = editorContainerInfo
                        // 通过判断编辑器长宽限制是否显示 (宽度小于250或者长度小于200则不展示)
                        const isShowByLimit = right - left > 250 && bottom - top > 200
                        // 判断焦点位置
                        const isTopHalf = focusY < (top + bottom) / 2
                        const isLeftHalf = focusX < (left + right) / 2
                        // 行高
                        // const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)

                        let countDirection: CountDirectionProps = {}
                        if (isTopHalf) {
                            // 鼠标位于编辑器上半部分
                            countDirection.y = "top"
                        } else {
                            // 鼠标位于编辑器下半部分
                            countDirection.y = "bottom"
                        }
                        if (Math.abs(focusX - (left + right) / 2) < 50) {
                            // 鼠标位于编辑器中间部分
                            countDirection.x = "middle"
                        } else if (isLeftHalf) {
                            // 鼠标位于编辑器左半部分
                            countDirection.x = "left"
                        } else {
                            // 鼠标位于编辑器右半部分
                            countDirection.x = "right"
                        }

                        editorInfo.current = {
                            direction: countDirection,
                            top,
                            bottom,
                            left,
                            right,
                            focusX,
                            focusY,
                            lineHeight: height,
                            scrollTop: onScrollTop.current
                        }

                        upPosY.current = posy
                        const selection = editor.getSelection()
                        if (selection && isShowByLimit) {
                            const selectedText = editor.getModel()?.getValueInRange(selection) || ""
                            if (fizzSelectWidget.isOpen && selectedText.length === 0) {
                                // 更新点击菜单小部件的位置
                                fizzSelectWidget.update()
                            } else if (fizzRangeWidget.isOpen && selectedText.length !== 0) {
                                fizzRangeWidget.update()
                            } else if (selectedText.length === 0) {
                                if (!readOnly) {
                                    closeFizzRangeWidget()
                                    // 展示点击的菜单
                                    selectId && editor.addContentWidget(fizzSelectWidget)
                                    fizzSelectWidget.isOpen = true
                                }
                            } else {
                                closeFizzSelectWidget()
                                // 展示选中的菜单
                                rangeId && editor.addContentWidget(fizzRangeWidget)
                                fizzRangeWidget.isOpen = true
                            }
                        } else {
                            closeFizzRangeWidget()
                            closeFizzSelectWidget()
                        }
                    }
                }
                if (rightButton) {
                    closeFizzRangeWidget()
                    closeFizzSelectWidget()
                }
            }
        })
        editor.onDidScrollChange((e) => {
            const {scrollTop} = e
            onScrollTop.current = scrollTop
        })

        // 监听光标移动
        editor.onDidChangeCursorPosition((e) => {
            closeFizzRangeWidget()
            closeFizzSelectWidget()
            // const { position } = e;
            // console.log('当前光标位置：', position);
        })
    }

    useEffect(() => {
        // 此处一个页面可能存在多个monaco
        // 因此仅仅在monaco刚打开时获取最新的快捷键事件和对应按键
        getStorageYakEditorShortcutKeyEvents()
    }, [])

    useEffect(() => {
        const handleKeyDown = (event) => {
            // 阻止事件冒泡
            event.stopPropagation()
        }
        const inputElement = ref.current
        inputElement && inputElement.addEventListener("keydown", handleKeyDown)
        // 清理函数
        return () => {
            if (inputElement) {
                inputElement.removeEventListener("keydown", handleKeyDown)
            }
        }
    }, [])

    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)
    useEffect(() => {
        if (Array.isArray(shortcutIds)) {
            setFocusIds(filterItem([...focusIds, ...shortcutIds]))
        }
    }, [shortcutIds])

    return (
        <div
            ref={ref}
            className={classNames("yakit-editor-code", styles["yakit-editor-wrapper"], {
                "yakit-editor-wrap-style": !showBreak,
                [styles["yakit-editor-disabled"]]: disabled
            })}
        >
            {/* 查看 monaco 的对应代码 colors 所需 token 值*/}
            {/* <button onClick={inspectTokens}>查看 token</button> */}
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    /** 重绘编辑器尺寸 */
                    if (editor) editor.layout({height, width})
                    /** 记录当前编辑器外边框尺寸 */
                    preWidthRef.current = width
                    preHeightRef.current = height
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={30}
            />
            {disabled && <div className={styles["yakit-editor-shade"]}></div>}
            <div
                className={styles["yakit-editor-container"]}
                onContextMenu={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    showContextMenu()
                }}
            >
                <ShortcutKeyFocusHook style={{height: "100%", width: "100%", overflow: "hidden"}} focusId={focusIds}>
                    <MonacoEditor
                        // height={100}
                        theme={theme || "kurior"}
                        value={value}
                        onChange={setValue || onChange}
                        language={language}
                        editorDidMount={(editor: YakitIMonacoEditor, monaco) => {
                            setEditor(editor)
                            if (keepSearchName) {
                                const keyword = keepSearchNameMap.get(keepSearchName)
                                if (keyword) {
                                    openFind(editor, keyword)
                                }
                            }
                            /** 编辑器关光标，设置坐标0的初始位置 */
                            editor.setSelection({
                                startColumn: 0,
                                startLineNumber: 0,
                                endColumn: 0,
                                endLineNumber: 0
                            })

                            if (editor) {
                                /** Yak语言 代码错误检查 */
                                const model = editor.getModel()
                                if (model) {
                                    yakStaticAnalyze.run(editor, model)
                                    model.onDidChangeContent(() => {
                                        yakStaticAnalyze.run(editor, model)
                                    })
                                }
                            }

                            editor.onKeyDown((e) => {
                                // 是否直接使用编辑器快捷键 不走自定义逻辑
                                const isUseDefaultShortcut = isYakEditorDefaultShortcut(e.browserEvent)
                                if (!isUseDefaultShortcut) {
                                    // 判断当前输入是否激活 编辑器内部快捷键
                                    const isActiveYakEditor = isYakEditorShortcut(e.browserEvent)
                                    if (isActiveYakEditor) {
                                        const keys = convertKeyEventToKeyCombination(e.browserEvent)
                                        if (keys) {
                                            let sortKeys = sortKeysCombination(keys)
                                            const keyToMenu = keyBindingRef.current[sortKeys.join("-")]
                                            if (!keyToMenu) return
                                            menuItemHandle(keyToMenu[0], keyToMenu)
                                        }
                                        e.browserEvent.stopImmediatePropagation()
                                        return
                                    }
                                    // 判断当前输入是否激活 页面级或全局快捷键
                                    const event = isPageOrGlobalShortcut(e.browserEvent)
                                    if (event) {
                                        // 未接入时特殊处理removePage,接入monaco快捷键后移除此项
                                        if (["removePage"].includes(event)) e.browserEvent.stopImmediatePropagation()
                                        // 由于目前 存在老版本键盘快捷键(line：1112) 暂时不做后续接入 等待第二版焦点与monaco绑定
                                        // e.browserEvent.stopImmediatePropagation()
                                        return
                                    }
                                }
                            })

                            if (editorDidMount) editorDidMount(editor, monaco)
                        }}
                        options={{
                            readOnly: readOnly,
                            scrollBeyondLastLine: false,
                            fontWeight: "500",
                            fontSize: nowFontsize || 12,
                            showFoldingControls: "always",
                            showUnused: true,
                            wordWrap: noWordWrap ? "off" : "on",
                            renderLineHighlight: "line",
                            lineNumbers: noLineNumber ? "off" : "on",
                            minimap: noMiniMap ? {enabled: false} : undefined,
                            lineNumbersMinChars: lineNumbersMinChars || 5,
                            contextmenu: false,
                            renderWhitespace: "all",
                            bracketPairColorization: {
                                enabled: true,
                                independentColorPoolPerBracketType: true
                            },
                            fixedOverflowWidgets: true,
                            renderValidationDecorations: renderValidationDecorations
                        }}
                    />
                </ShortcutKeyFocusHook>
            </div>
        </div>
    )
})
