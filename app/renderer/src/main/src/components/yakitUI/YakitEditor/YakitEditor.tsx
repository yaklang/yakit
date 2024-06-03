import React, {useEffect, useMemo, useRef, useState} from "react"
import ReactDOM from "react-dom"
import {
    useDebounceEffect,
    useDebounceFn,
    useGetState,
    useKeyPress,
    useMemoizedFn,
    useThrottleFn,
    useUpdateEffect,
    useInViewport
} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import MonacoEditor, {monaco} from "react-monaco-editor"
// 编辑器 注册
import "@/utils/monacoSpec/theme"
import "@/utils/monacoSpec/fuzzHTTP"
import "@/utils/monacoSpec/yakEditor"
import "@/utils/monacoSpec/html"

import {
    YakitIMonacoEditor,
    YakitEditorProps,
    YakitITextModel,
    YakitEditorKeyCode,
    KeyboardToFuncProps,
    YakitIModelDecoration,
    OperationRecord,
    OperationRecordRes,
    OtherMenuListProps
} from "./YakitEditorType"
import {showByRightContext} from "../YakitMenu/showByRightContext"
import {ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult} from "@/utils/editorMarkers"
import {StringToUint8Array} from "@/utils/str"
import {baseMenuLists, extraMenuLists} from "./contextMenus"
import {EditorMenu, EditorMenuItemDividerProps, EditorMenuItemProps, EditorMenuItemType} from "./EditorMenu"
import {YakitSystem} from "@/yakitGVDefine"
import cloneDeep from "lodash/cloneDeep"
import {convertKeyboard, keySortHandle} from "./editorUtils"
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
import {GetPluginLanguage, PluginGV} from "@/pages/plugins/builtInData"
import {createRoot} from "react-dom/client"
import {setEditorContext} from "@/utils/monacoSpec/yakEditor"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {HighLightText} from "@/components/HTTPFlowDetail"
import {useStore} from "@/store/editorState"
import {CloudDownloadIcon} from "@/assets/newIcon"
import { IconSolidAIIcon, IconSolidAIWhiteIcon } from "@/assets/icon/colors"

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

const {ipcRenderer} = window.require("electron")

/** @name 字体key值对应字体大小 */
const keyToFontSize: Record<string, number> = {
    "font-size-small": 12,
    "font-size-middle": 16,
    "font-size-large": 20
}

/** 编辑器右键默认菜单 - 顶部 */
const DefaultMenuTop: EditorMenuItemType[] = [
    {
        key: "font-size",
        label: "字体大小",
        children: [
            {key: "font-size-small", label: "小"},
            {key: "font-size-middle", label: "中"},
            {key: "font-size-large", label: "大"}
        ]
    }
]

/** 编辑器右键默认菜单 - 底部 */
const DefaultMenuBottom: EditorMenuItemType[] = [
    {key: "cut", label: "剪切"},
    {key: "copy", label: "复制"},
    {key: "paste", label: "粘贴"}
]

export const YakitEditor: React.FC<YakitEditorProps> = React.memo((props) => {
    const {
        forceRenderMenu = false,
        menuType = [],
        isBytes = false,
        value,
        valueBytes,
        setValue,
        type,
        theme = "kurior",
        editorDidMount,
        contextMenu = {},
        onContextMenu,
        readOnly = false,
        disabled = false,
        noWordWrap = false,
        noMiniMap = false,
        noLineNumber = false,
        lineNumbersMinChars = 5,
        fontSize = 12,
        showLineBreaks = false,
        editorOperationRecord,
        isShowSelectRangeMenu = false,
        selectNode,
        rangeNode,
        overLine = 3,
        editorId,
        highLightText = []
    } = props

    const systemRef = useRef<YakitSystem>("Darwin")
    const wrapperRef = useRef<HTMLDivElement>(null)
    const isInitRef = useRef<boolean>(false)

    const [editor, setEditor] = useState<YakitIMonacoEditor>()
    const preWidthRef = useRef<number>(0)
    const preHeightRef = useRef<number>(0)

    /** 编辑器语言 */
    const language = useMemo(() => {
        return GetPluginLanguage(type || "http")
    }, [type])

    useMemo(() => {
        if (editor) {
            setEditorContext(editor, "plugin", props.type || "")
        }
    }, [props.type, editor])

    /** @name 记录右键菜单组信息 */
    const rightContextMenu = useRef<EditorMenuItemType[]>([...DefaultMenuTop, ...DefaultMenuBottom])
    /** @name 记录右键菜单组内的快捷键对应菜单项的key值 */
    const keyBindingRef = useRef<KeyboardToFuncProps>({})
    /** @name 记录右键菜单关系[菜单组key值-菜单组内菜单项key值数组] */
    const keyToOnRunRef = useRef<Record<string, string[]>>({})

    const [showBreak, setShowBreak, getShowBreak] = useGetState<boolean>(showLineBreaks)
    const [nowFontsize, setNowFontsize] = useState<number>(fontSize)

    useEffect(() => {
        // 控制编辑器失焦
        if (disabled) {
            const fakeInput = document.createElement("input")
            document.body.appendChild(fakeInput)
            fakeInput.focus()
            document.body.removeChild(fakeInput)
        }
    }, [disabled])

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
            [PluginGV.PluginCodecHttpSwitch]
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
            [PluginGV.PluginCodecContextMenuExecuteSwitch]
        )
    })

    const ref = useRef(null)
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
    useEffect(() => {
        // 往菜单组中注入codec插件
        try {
            const httpMenu = extraMenuLists["http"].menu[0] as EditorMenuItemProps
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
            ;(extraMenuLists["http"].menu[0] as EditorMenuItemProps).children = newHttpChildren

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
            ;(extraMenuLists["customcontextmenu"].menu[0] as EditorMenuItemProps).children =
                newCustomContextMenu.length > 0
                    ? newCustomContextMenu
                    : [
                          {
                              key: "Get*plug-in",
                              label: <><CloudDownloadIcon style={{marginRight:4}}/>获取插件</>,
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
            ;(extraMenuLists["aiplugin"].menu[0] as EditorMenuItemProps).children =
                newAiPlugin.length > 0
                    ? newAiPlugin
                    : [
                          {
                              key: "aiplugin-Get*plug-in",
                              label: <><CloudDownloadIcon style={{marginRight:4}}/>获取插件</>,
                              isGetPlugin: true
                          } as EditorMenuItemProps
                      ]
        } catch (e) {
            failed(`get custom plugin failed: ${e}`)
        }

        const keyToRun: Record<string, string[]> = {}
        const allMenu = {...baseMenuLists, ...extraMenuLists, ...contextMenu}

        for (let key in allMenu) {
            const keys: string[] = []
            for (let item of allMenu[key].menu) {
                if ((item as EditorMenuItemProps)?.key) keys.push((item as EditorMenuItemProps)?.key)
            }
            keyToRun[key] = keys
        }

        keyToOnRunRef.current = {...keyToRun}
    }, [contextMenu, customHTTPMutatePlugin, contextMenuPlugin])

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
                        const allMenu = {...baseMenuLists, ...extraMenuLists, ...contextMenu}
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
                        const allMenu = {...baseMenuLists, ...extraMenuLists, ...contextMenu}
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
    /** 操作记录存储 */
    const onOperationRecord = (type: "fontSize" | "showBreak", value: number | boolean) => {
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord).then((data) => {
                if (!data) {
                    let obj: OperationRecord = {
                        [type]: value
                    }
                    setRemoteValue(editorOperationRecord, JSON.stringify(obj))
                } else {
                    let obj: OperationRecord = JSON.parse(data)
                    obj[type] = value
                    setRemoteValue(editorOperationRecord, JSON.stringify(obj))
                }
            })
        }
    }

    /** 右键菜单功能点击回调事件 */
    const onRightContextMenu = useMemoizedFn((key: string) => {
        /** 获取 ITextModel 实例 */
        const model = editor?.getModel()

        switch (key) {
            case "font-size-small":
            case "font-size-middle":
            case "font-size-large":
                if (editor?.updateOptions) {
                    onOperationRecord("fontSize", keyToFontSize[key] || 12)
                    if (editorId) {
                        emiter.emit(
                            "refreshEditorOperationRecord",
                            JSON.stringify({
                                editorId,
                                fontSize: keyToFontSize[key] || 12
                            })
                        )
                    } else {
                        setNowFontsize(keyToFontSize[key] || 12)
                    }
                }
                return
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
                yakCompileAndFormat.run(editor, model)
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
                const info = item as EditorMenuItemProps
                if (info.children && info.children.length > 0) {
                    info.children = contextMenuKeybindingHandle(info.key, info.children)
                } else {
                    if (info.key === "cut" && info.label === "剪切") {
                        const keysContent = convertKeyboard(systemRef.current, [
                            systemRef.current === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                            YakitEditorKeyCode.KEY_X
                        ])

                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>剪切</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }
                    if (info.key === "copy" && info.label === "复制") {
                        const keysContent = convertKeyboard(systemRef.current, [
                            systemRef.current === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                            YakitEditorKeyCode.KEY_C
                        ])
                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>复制</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }
                    if (info.key === "paste" && info.label === "粘贴") {
                        const keysContent = convertKeyboard(systemRef.current, [
                            systemRef.current === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                            YakitEditorKeyCode.KEY_V
                        ])
                        info.label = keysContent ? (
                            <div className={styles["editor-context-menu-keybind-wrapper"]}>
                                <div className={styles["content-style"]}>粘贴</div>
                                <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
                            </div>
                        ) : (
                            info.label
                        )
                    }

                    if (info.keybindings && info.keybindings.length > 0) {
                        const keysContent = convertKeyboard(systemRef.current, info.keybindings)

                        // 记录自定义快捷键映射按键的回调事件
                        if (keysContent) {
                            let sortKeys = keySortHandle(info.keybindings)
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

        ipcRenderer.invoke("fetch-system-name").then((systemType: YakitSystem) => {
            systemRef.current = systemType

            rightContextMenu.current = [...DefaultMenuTop]
            keyBindingRef.current = {}

            if (type === "http") {
                rightContextMenu.current = rightContextMenu.current.concat([
                    {key: "http-show-break", label: getShowBreak() ? "隐藏换行符" : "显示换行符"}
                ])
            }
            if (language === "yak") {
                rightContextMenu.current = rightContextMenu.current.concat([
                    {type: "divider"},
                    {key: "yak-formatter", label: "Yak 代码格式化"}
                ])
            }
            if (menuType.length > 0) {
                const types = Array.from(new Set(menuType))
                for (let key of types)
                    rightContextMenu.current = rightContextMenu.current.concat([
                        {type: "divider"},
                        cloneDeep(extraMenuLists[key].menu[0])
                    ])
            }

            // 缓存需要排序的自定义菜单
            let sortContextMenu: OtherMenuListProps[] = []
            for (let menus in contextMenu) {
                /* 需要排序项 */
                if (typeof contextMenu[menus].order === "number") {
                    sortContextMenu = sortContextMenu.concat(cloneDeep(contextMenu[menus]))
                } else {
                    /** 当cloneDeep里面存在reactnode时，执行会产生性能问题 */
                    rightContextMenu.current = rightContextMenu.current.concat(cloneDeep(contextMenu[menus].menu))
                }
            }

            // 底部默认菜单
            rightContextMenu.current = rightContextMenu.current.concat([...DefaultMenuBottom])

            // 当存在order项则需要排序
            if (sortContextMenu.length > 0) {
                rightContextMenu.current = sortMenuFun(rightContextMenu.current, sortContextMenu)
            }

            rightContextMenu.current = contextMenuKeybindingHandle("", rightContextMenu.current)

            if (!forceRenderMenu) isInitRef.current = true
        })
    }, [forceRenderMenu, menuType, contextMenu, contextMenuPlugin, customHTTPMutatePlugin])

    /**
     * editor编辑器的额外渲染功能:
     * 1、每行的换行符进行可视字符展示
     */
    const pasteWarning = useThrottleFn(
        () => {
            failed("粘贴过快，请稍后再试")
        },
        {wait: 500}
    )

    const deltaDecorationsRef = useRef<() => any>()
    const highLightTextFun = useMemoizedFn(() => highLightText)
    useEffect(() => {
        if (!editor) {
            return
        }
        const model = editor.getModel()
        if (!model) {
            return
        }
        let current: string[] = []
        if (props.type === "http" || props.type === "html") {
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
                // const text = model.getValue();
                const endsp = model.getPositionAt(1800)
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

                const dec: YakitIModelDecoration[] = []
                if (props.type === "http") {
                    ;(() => {
                        try {
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
                                    options: {afterContentClassName: detail.classType}
                                } as YakitIModelDecoration)
                            })
                        } catch (e) {}
                    })()
                    ;(() => {
                        try {
                            ;[{regexp: /\nHost:\s*?.+/, classType: "host"}].map((detail) => {
                                // handle host
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
                                    options: {afterContentClassName: detail.classType}
                                } as YakitIModelDecoration)
                            })
                        } catch (e) {}
                    })()
                }
                if (props.type === "html" || props.type === "http") {
                    ;(() => {
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
                ;(() => {
                    highLightTextFun().forEach(({startOffset = 0, highlightLength = 0, hoverVal = ""}) => {
                        // 获取偏移量对应的位置
                        const startPosition = model.getPositionAt(Number(startOffset))
                        const endPosition = model.getPositionAt(Number(startOffset) + Number(highlightLength))

                        // 创建装饰选项
                        dec.push({
                            id: "hight-light-text_" + startOffset + "_" + highlightLength + "_" + hoverVal,
                            ownerId: 3,
                            range: new monaco.Range(
                                startPosition.lineNumber,
                                startPosition.column,
                                endPosition.lineNumber,
                                endPosition.column
                            ),
                            options: {
                                isWholeLine: false,
                                className: "hight-light-bg-color",
                                hoverMessage: [{value: hoverVal, isTrusted: true}]
                            }
                        } as IModelDecoration)
                    })
                })()

                return dec
            }

            deltaDecorationsRef.current = () => {
                current = model.deltaDecorations(current, generateDecorations())
            }
            editor.onDidChangeModelContent(() => {
                current = model.deltaDecorations(current, generateDecorations())
            })
            current = model.deltaDecorations(current, generateDecorations())
        }
        return () => {
            try {
                editor.dispose()
            } catch (e) {}
        }
    }, [editor])
    useEffect(() => {
        if (deltaDecorationsRef.current) {
            deltaDecorationsRef.current()
        }
    }, [JSON.stringify(highLightText)])

    /** 右键菜单-重渲染换行符功能是否显示的开关文字内容 */
    useEffect(() => {
        const flag = rightContextMenu.current.filter((item) => {
            return (item as EditorMenuItemProps)?.key === "http-show-break"
        })
        if (flag.length > 0 && type === "http") {
            for (let item of rightContextMenu.current) {
                const info = item as EditorMenuItemProps
                if (info?.key === "http-show-break") info.label = getShowBreak() ? "隐藏换行符" : "显示换行符"
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

    /** 监听键盘快捷键 */
    useKeyPress(
        (e) => true,
        (e) => {
            const filterKey = [16, 17, 18, 93]
            if (filterKey.includes(e.keyCode)) return

            let activeKey: number[] = []
            if (e.shiftKey) activeKey.push(16)
            if (e.ctrlKey) activeKey.push(17)
            if (e.altKey) activeKey.push(18)
            if (e.metaKey) activeKey.push(93)
            activeKey.push(e.keyCode)
            if (activeKey.length <= 1) return
            activeKey = keySortHandle(activeKey)

            const keyToMenu = keyBindingRef.current[activeKey.join("-")]
            if (!keyToMenu) return

            e.stopPropagation()
            menuItemHandle(keyToMenu[0], keyToMenu)
        },
        {target: wrapperRef}
    )

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
    /** Yak语言 代码错误检查并显示提示标记 */
    const yakStaticAnalyze = useDebounceFn(
        useMemoizedFn((editor: YakitIMonacoEditor, model: YakitITextModel) => {
            if (language === "yak") {
                const allContent = model.getValue()
                ipcRenderer
                    .invoke("StaticAnalyzeError", {Code: StringToUint8Array(allContent), PluginType: type})
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
            } else if (v.DefaultDescription === "插入Payload-fixed") {
                editor &&
                    showDictsAndSelect((i) => {
                        monacoEditorWrite(editor, i, editor.getSelection())
                    })
            } else if (v.DefaultDescription === "插入临时字典-fixed") {
                editor && insertTemporaryFileFuzzTag((i) => monacoEditorWrite(editor, i))
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
                                                      editor.trigger("keyboard", "type", {text})
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
                                  toOpenAiChat={(scriptName: string) => {
                                      if (scriptName === "aiplugin-Get*plug-in") {
                                          emiter.emit(
                                              "onOpenFuzzerModal",
                                              JSON.stringify({scriptName, isAiPlugin: "isGetPlugin"})
                                          )
                                          closeFizzRangeWidget()
                                          return
                                      }

                                      if (editor) {
                                          const selectedText =
                                              editor.getModel()?.getValueInRange(editor.getSelection() as any) || ""
                                          emiter.emit(
                                              "onOpenFuzzerModal",
                                              JSON.stringify({text: selectedText, scriptName, isAiPlugin: true})
                                          )
                                          closeFizzRangeWidget()
                                      }
                                  }}
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
            } catch (e) {
                console.log(e)
            }
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
    return (
        <div
            ref={ref}
            className={classNames("yakit-editor-code", styles["yakit-editor-wrapper"], {
                "yakit-editor-wrap-style": !showBreak,
                [styles["yakit-editor-disabled"]]: disabled
            })}
        >
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
                ref={wrapperRef}
                className={styles["yakit-editor-container"]}
                onContextMenu={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    showContextMenu()
                }}
            >
                <MonacoEditor
                    // height={100}
                    theme={theme || "kurior"}
                    value={isBytes ? new Buffer((valueBytes || []) as Uint8Array).toString() : value}
                    onChange={setValue}
                    language={language}
                    editorDidMount={(editor: YakitIMonacoEditor, monaco: any) => {
                        setEditor(editor)
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

                        if (editorDidMount) editorDidMount(editor)
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
                        fixedOverflowWidgets: true
                    }}
                />
            </div>
        </div>
    )
})
