import React, {useEffect, useRef, useState} from "react"
import {useDebounceFn, useKeyPress, useMemoizedFn} from "ahooks"
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
    KeyboardToFuncProps
} from "./YakitEditorType"
import {showByRightContext} from "../YakitMenu/showByRightContext"
import {ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult} from "@/utils/editorMarkers"
import {StringToUint8Array} from "@/utils/str"
import {extraMenuLists} from "./contextMenus"
import {EditorMenu, EditorMenuItemDividerProps, EditorMenuItemProps, EditorMenuItemType} from "./EditorMenu"
import {YakitSystem} from "@/yakitGVDefine"
import cloneDeep from "lodash/cloneDeep"
import {convertKeyboard, fetchCursorContent, fetchSelectionRange, keySortHandle} from "./editorUtils"

import classNames from "classnames"
import styles from "./YakitEditor.module.scss"

const {ipcRenderer} = window.require("electron")

/** 编辑器右键默认菜单 */
const DefaultMenu: EditorMenuItemType[] = [
    {
        key: "font-size",
        label: "字体大小",
        children: [
            {key: "font-size-small", label: "小"},
            {key: "font-size-middle", label: "中"},
            {key: "font-size-large", label: "大"}
        ]
    },
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
        noWordWrap = false,
        noMiniMap = false,
        noLineNumber = false,
        lineNumbersMinChars = 5,
        fontSize = 12
    } = props

    const systemRef = useRef<YakitSystem>("Darwin")
    const wrapperRef = useRef<HTMLDivElement>(null)
    const isInitRef = useRef<boolean>(false)

    const [editor, setEditor] = useState<YakitIMonacoEditor>()
    const preWidthRef = useRef<number>(0)
    const preHeightRef = useRef<number>(0)

    const rightContextMenu = useRef<EditorMenuItemType[]>([...DefaultMenu])

    const keyBindingRef = useRef<KeyboardToFuncProps>({})

    /** 菜单功能点击处理事件 */
    const {run: menuItemHandle} = useDebounceFn(
        useMemoizedFn((key: string, keyPath: string[]) => {
            if (!editor) return

            if (keyPath.length === 2) {
                if (Object.keys(extraMenuLists).includes(keyPath[1])) {
                    if (!!extraMenuLists[keyPath[1]].onRun) extraMenuLists[keyPath[1]].onRun(editor, key)
                } else {
                    if (!!contextMenu[keyPath[1]].onRun) contextMenu[keyPath[1]].onRun(editor, key)
                }
            }
            if (keyPath.length === 1) {
                if (key === "pretty" && !!extraMenuLists[keyPath[1]].onRun) extraMenuLists[key].onRun(editor, key)
                else onRightContextMenu(key)
            }
            return
        }),
        {wait: 300}
    )
    /** 右键菜单功能点击回调事件 */
    const onRightContextMenu = useMemoizedFn((key: string) => {
        /** 获取 ITextModel 实例 */
        const model = editor?.getModel()

        switch (key) {
            case "font-size-small":
                if (editor?.updateOptions) editor.updateOptions({fontSize: 12})
                return
            case "font-size-middle":
                if (editor?.updateOptions) editor.updateOptions({fontSize: 16})
                return
            case "font-size-large":
                if (editor?.updateOptions) editor.updateOptions({fontSize: 20})
                return
            case "cut":
                if (editor?.executeEdits) {
                    /** 获取需要剪切的范围 */
                    const position = fetchSelectionRange(editor, true)
                    if (!position) return
                    /** 获取需要剪切的内容 */
                    const content = fetchCursorContent(editor, true)

                    const flag = editor.executeEdits("", [
                        {
                            range: position,
                            text: "",
                            forceMoveMarkers: true
                        }
                    ])
                    if (flag) {
                        ipcRenderer.invoke("set-copy-clipboard", `${content}`)
                        editor.focus()
                    }
                }

                return
            case "copy":
                if (!model) return
                if (editor) ipcRenderer.invoke("set-copy-clipboard", `${fetchCursorContent(editor, true)}`)
                return
            case "paste":
                if (!editor) return
                if (!model) return

                /** 获取需要粘贴的范围 */
                const position = fetchSelectionRange(editor, false)
                if (!position) return

                ipcRenderer
                    .invoke("get-copy-clipboard")
                    .then((str: string) => {
                        if (editor?.executeEdits) {
                            editor.executeEdits("", [
                                {
                                    range: position,
                                    text: str || "",
                                    forceMoveMarkers: true
                                }
                            ])
                            editor.focus()
                        }
                    })
                    .catch(() => {})

                return
            case "yak-formatter":
                if (!model) return
                yakCompileAndFormat.run(editor, model)
                return

            default:
                if (editor && !!contextMenu[key].onRun) contextMenu[key].onRun(editor, key)
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
                                <div className={classNames(styles["keybind-style"], "icon-style")}>{keysContent}</div>
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
                                <div className={classNames(styles["keybind-style"], "icon-style")}>{keysContent}</div>
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
                                <div className={classNames(styles["keybind-style"], "icon-style")}>{keysContent}</div>
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
                                <div className={classNames(styles["keybind-style"], "icon-style")}>{keysContent}</div>
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

    /** yak后缀文件中，右键菜单增加'Yak 代码格式化'功能 */
    useEffect(() => {
        if (isInitRef.current) return

        ipcRenderer.invoke("fetch-system-name").then((systemType: YakitSystem) => {
            systemRef.current = systemType

            rightContextMenu.current = [...DefaultMenu]
            keyBindingRef.current = {}

            if (type === "yak") {
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

            for (let menus in contextMenu) {
                rightContextMenu.current.push(cloneDeep(contextMenu[menus].menu[0]))
            }

            rightContextMenu.current = contextMenuKeybindingHandle("", rightContextMenu.current)

            if (!forceRenderMenu) isInitRef.current = true
        })
    }, [forceRenderMenu, menuType, contextMenu])

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
        {wait: 500}
    )
    /** Yak语言 代码错误检查并显示提示标记 */
    const yakSyntaxChecking = useDebounceFn(
        useMemoizedFn((editor: YakitIMonacoEditor, model: YakitITextModel) => {
            const allContent = model.getValue()
            ipcRenderer
                .invoke("StaticAnalyzeError", {Code: StringToUint8Array(allContent)})
                .then((e: {Result: YakStaticAnalyzeErrorResult[]}) => {
                    if (e && e.Result.length > 0) {
                        const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
                        monaco.editor.setModelMarkers(model, "owner", markers)
                    } else {
                        monaco.editor.setModelMarkers(model, "owner", [])
                    }
                })
        }),
        {wait: 300}
    )

    return (
        <div className={styles["yakit-editor-wrapper"]}>
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
            <div ref={wrapperRef} className={styles["yakit-editor-container"]} onContextMenu={showContextMenu}>
                <MonacoEditor
                    height={100}
                    theme={theme || "kurior"}
                    value={isBytes ? new Buffer((valueBytes || []) as Uint8Array).toString() : value}
                    onChange={setValue}
                    language={type || "http"}
                    editorDidMount={(editor: YakitIMonacoEditor, monaco: any) => {
                        setEditor(editor)
                        /** 编辑器关光标，设置坐标0的初始位置 */
                        editor.setSelection({
                            startColumn: 0,
                            startLineNumber: 0,
                            endColumn: 0,
                            endLineNumber: 0
                        })

                        if (editor && type === "yak") {
                            /** Yak语言 代码错误检查 */
                            const model = editor.getModel()
                            if (model) {
                                yakSyntaxChecking.run(editor, model)
                                model.onDidChangeContent(() => {
                                    yakSyntaxChecking.run(editor, model)
                                })
                            }
                        }

                        // if (props.full) {
                        //     handleEditorMount(editor, monaco)
                        // }
                        if (editorDidMount) editorDidMount(editor)
                    }}
                    options={{
                        readOnly: readOnly,
                        scrollBeyondLastLine: false,
                        fontWeight: "500",
                        fontSize: fontSize || 12,
                        showFoldingControls: "always",
                        showUnused: true,
                        wordWrap: noWordWrap ? "off" : "on",
                        renderLineHighlight: "line",
                        lineNumbers: noLineNumber ? "off" : "on",
                        minimap: noMiniMap ? {enabled: false} : undefined,
                        lineNumbersMinChars: lineNumbersMinChars || 5,
                        contextmenu: false
                    }}
                />
            </div>
        </div>
    )
})
