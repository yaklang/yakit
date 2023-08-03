import React, {useEffect, useRef, useState} from "react"
import {useDebounceFn, useGetState, useKeyPress, useMemoizedFn} from "ahooks"
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
import { queryYakScriptList } from "@/pages/yakitStore/network"
import { YakScript } from "@/pages/invoker/schema"
import { CodecType } from "@/pages/codec/CodecPage"
import { failed } from "@/utils/notification"

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
    },
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
        noWordWrap = false,
        noMiniMap = false,
        noLineNumber = false,
        lineNumbersMinChars = 5,
        fontSize = 12,
        showLineBreaks = false,
        editorOperationRecord
    } = props
    
    const systemRef = useRef<YakitSystem>("Darwin")
    const wrapperRef = useRef<HTMLDivElement>(null)
    const isInitRef = useRef<boolean>(false)

    const [editor, setEditor] = useState<YakitIMonacoEditor>()
    const preWidthRef = useRef<number>(0)
    const preHeightRef = useRef<number>(0)

    /** @name 记录右键菜单组信息 */
    const rightContextMenu = useRef<EditorMenuItemType[]>([...DefaultMenuTop,...DefaultMenuBottom])
    /** @name 记录右键菜单组内的快捷键对应菜单项的key值 */
    const keyBindingRef = useRef<KeyboardToFuncProps>({})
    /** @name 记录右键菜单关系[菜单组key值-菜单组内菜单项key值数组] */
    const keyToOnRunRef = useRef<Record<string, string[]>>({})

    const [showBreak, setShowBreak, getShowBreak] = useGetState<boolean>(showLineBreaks)
    const [fontsize, setFontsize] = useState<number>(fontSize)

    // 读取上次选择的字体大小/换行符 
    useEffect(()=>{
        if(editorOperationRecord){
            getRemoteValue(editorOperationRecord).then((data) => {
                if (!data) return
                let obj:OperationRecordRes = JSON.parse(data)
                if(obj?.fontSize){
                    setFontsize(obj?.fontSize)
                }
                if(typeof obj?.showBreak === "boolean"){
                    setShowBreak(obj?.showBreak)
                }
            })
        }
    },[])

    // 自定义HTTP数据包变形处理
    const [codecPlugin, setCodecPlugin] = useState<CodecType[]>([])
    const searchForCodecFuzzerPlugin = useMemoizedFn(() => {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total == 0) {
                    return
                }
                setCodecPlugin(i.map((script) => {
                    return {
                        key: script.ScriptName,
                        verbose: "CODEC 社区插件: " + script.ScriptName,
                        isYakScript: true,
                    } as CodecType
                } ))
            },
            undefined,
            10,
            undefined,
            undefined,
            undefined,
            undefined,
            ["allow-custom-http-packet-mutate"],
        )
    })
    useEffect(() => {
        searchForCodecFuzzerPlugin()
    }, [])

    /**
     * 整理右键菜单的对应关系
     * 菜单组的key值对应的组内菜单项的key值数组
     */
    useEffect(() => {
        // 往customhttp菜单组中注入codec插件
        try {
            (extraMenuLists["customhttp"].menu[0] as EditorMenuItemProps).children = codecPlugin.map((item) => {
                return {
                    key: item.key,
                    label: item.key,
                } as EditorMenuItemProps
            } )
        } catch (e) {
            failed(`get custom mutate request failed: ${e}`)
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
    }, [contextMenu])

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
                        allMenu[name].onRun(editor, menuItemName)
                        executeFunc = true
                        onRightContextMenu(menuItemName)
                        break
                    }
                }
            }
            if (keyPath.length === 1) {
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
    const onOperationRecord = (type:"fontSize"|"showBreak",value:number|boolean) => {
        if(editorOperationRecord){
            getRemoteValue(editorOperationRecord).then((data) => {
                if (!data) {
                    let obj:OperationRecord = {
                        [type]:value
                    }
                    setRemoteValue(editorOperationRecord,JSON.stringify(obj))
                }
                else{
                    let obj:OperationRecord = JSON.parse(data)
                    obj[type] = value
                    setRemoteValue(editorOperationRecord,JSON.stringify(obj))
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
                    setFontsize(keyToFontSize[key] || 12)
                    onOperationRecord("fontSize",keyToFontSize[key] || 12)
                }
                return
            case "http-show-break":
                setShowBreak(!getShowBreak())
                onOperationRecord("showBreak",getShowBreak())
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

    const sortMenuFun = useMemoizedFn((dataSource,sortData) => {
        const result = sortData.reduce((acc, item) => {
            if(item.order>=0){
                acc.splice(item.order, 0, ...item.menu)
            }
            else{
                acc.push(...item.menu)
            }
            return acc;
        }, [...dataSource]);   
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

            // 缓存需要排序的自定义菜单
            let sortContextMenu:OtherMenuListProps[] = []
            for (let menus in contextMenu) {
                /* 需要排序项 */
                if(typeof contextMenu[menus].order === "number"){
                    sortContextMenu = sortContextMenu.concat(cloneDeep(contextMenu[menus]))
                }
                else{
                    /** 当cloneDeep里面存在reactnode时，执行会产生性能问题 */  
                    rightContextMenu.current = rightContextMenu.current.concat(cloneDeep(contextMenu[menus].menu))
                }
            }

            // 底部默认菜单
            rightContextMenu.current = rightContextMenu.current.concat([...DefaultMenuBottom])

            // 当存在order项则需要排序
            if(sortContextMenu.length>0){
                rightContextMenu.current = sortMenuFun(rightContextMenu.current,sortContextMenu)
            }
            
            rightContextMenu.current = contextMenuKeybindingHandle("", rightContextMenu.current)

            if (!forceRenderMenu) isInitRef.current = true
        })
    }, [forceRenderMenu, menuType, contextMenu])

    /**
     * editor编辑器的额外渲染功能:
     * 1、每行的换行符进行可视字符展示
     */
    useEffect(() => {
        if (props.type === "http") {
            const model = editor?.getModel()
            if (!model) {
                return
            }
            let current: string[] = []
            const applyKeywordDecoration = () => {
                const text = model.getValue()
                const keywordRegExp = /\r?\n/g
                const decorations: YakitIModelDecoration[] = []
                let match

                while ((match = keywordRegExp.exec(text)) !== null) {
                    const start = model.getPositionAt(match.index)
                    const className: "crlf" | "lf" = match[0] === "\r\n" ? "crlf" : "lf"
                    const end = model.getPositionAt(match.index + match[0].length)
                    decorations.push({
                        id: "keyword" + match.index,
                        ownerId: 1,
                        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                        options: {beforeContentClassName: className}
                    } as YakitIModelDecoration)
                }
                // 使用 deltaDecorations 应用装饰
                current = model.deltaDecorations(current, decorations)
            }
            model.onDidChangeContent((e) => {
                applyKeywordDecoration()
            })
            applyKeywordDecoration()
        }
    }, [editor])

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
        <div
            className={classNames("yakit-editor-code", styles["yakit-editor-wrapper"], {
                "yakit-editor-wrap-style": !showBreak
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
            <div ref={wrapperRef} className={styles["yakit-editor-container"]} onContextMenu={showContextMenu}>
                <MonacoEditor
                    // height={100}
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

                        if (editorDidMount) editorDidMount(editor)
                    }}
                    options={{
                        readOnly: readOnly,
                        scrollBeyondLastLine: false,
                        fontWeight: "500",
                        fontSize: fontsize || 12,
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
                    }}
                />
            </div>
        </div>
    )
})
