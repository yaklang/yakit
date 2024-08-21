import React, {ReactElement, memo, useEffect, useMemo, useState} from "react"
import {CollapseListProp, DefinitionListProps, HelpInfoListProps} from "./CollapseListType"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {Collapse, Tooltip} from "antd"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"

import classNames from "classnames"
import styles from "./CollapseList.module.scss"
import useStore from "../hooks/useStore"
import {useMemoizedFn} from "ahooks"
import {
    Range,
    YaklangLanguageFindResponse,
    YaklangLanguageSuggestionRequest,
    getWordWithPointAtPosition
} from "@/utils/monacoSpec/yakCompletionSchema"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {IMonacoEditor} from "@/utils/editors"
import {getModelContext} from "@/utils/monacoSpec/yakEditor"
import {monaco} from "react-monaco-editor"
const {ipcRenderer} = window.require("electron")
const {Panel} = Collapse

export const CollapseList: <T>(props: CollapseListProp<T>) => ReactElement | null = memo((props) => {
    const {type = "sideBar", panelKey, onlyKey = "", list, titleRender, renderItem, collapseProps, isShowBottom} = props

    const wrapperClassName = useMemo(() => {
        if (type === "sideBar") return styles["collapse-list-side-bar"]
        return styles["collapse-list-output"]
    }, [type])

    const containerClassName = useMemo(() => {
        if (type === "sideBar") return styles["collapse-list-container-side-bar"]
        return styles["collapse-list-container-output"]
    }, [type])

    return (
        <div className={wrapperClassName}>
            <Collapse
                ghost
                className={classNames(styles["collapse-list-base"], containerClassName)}
                expandIcon={(panelProps) => {
                    const {isActive} = panelProps
                    return <OutlineChevronrightIcon className={classNames({"collapse-expand-arrow": !!isActive})} />
                }}
                {...collapseProps}
            >
                {list.map((item, index) => {
                    return (
                        <Panel
                            header={titleRender(item)}
                            key={item[onlyKey] || `${panelKey || "collapse-list"}-${index}`}
                        >
                            <div
                                className={classNames(styles["list-item-render"], {
                                    [styles["list-item-render-sideBar"]]: type === "sideBar"
                                })}
                            >
                                {type === "output" && <div className={styles["render-tail"]}></div>}
                                {renderItem(item)}
                            </div>
                        </Panel>
                    )
                })}
                {isShowBottom && <div className={styles["to-end"]}>已经到底啦～</div>}
            </Collapse>
        </div>
    )
})

// 帮助信息
export const HelpInfoList: React.FC<HelpInfoListProps> = memo((props) => {
    const {onJumpToEditor} = props
    const {activeFile} = useStore()

    // 编辑器实例
    const [helpEditor, setHelpEditor] = useState<IMonacoEditor>()
    const [helpMonaco, setHelpMonaco] = useState<any>()
    const [referencesList, setReferencesList] = useState<DefinitionListProps[]>([])
    const [definitionList, setDefinitionList] = useState<DefinitionListProps[]>([])

    // 选中光标位置
    const onJumpEditorDetailFun = useMemoizedFn((range) => {
        try {
            if (helpEditor) {
                helpEditor.setSelection(range)
                helpEditor.revealLineInCenter(range.startLineNumber)
            }
        } catch (error) {}
    })

    useEffect(() => {
        let lastClickTime = 0
        let clickTimer
        if (helpEditor) {
            // 监听编辑器的双击事件
            helpEditor.onMouseDown(() => {
                const currentTime = new Date().getTime()
                const clickDelay = currentTime - lastClickTime
                lastClickTime = currentTime
                const selection = helpEditor.getSelection()
                if (clickDelay < 300) {
                    // 300ms 内算作双击
                    clearTimeout(clickTimer)
                    if (selection) {
                        const {startColumn, startLineNumber, endColumn, endLineNumber} = selection
                        onJumpToEditor({
                            startLineNumber,
                            startColumn,
                            endLineNumber,
                            endColumn
                        })
                    }
                } else {
                    clickTimer = setTimeout(() => {
                        clearTimeout(clickTimer)
                    }, 300)
                }
            })
        }
    }, [helpEditor])

    const fileInfo = useMemoizedFn((key: "references" | "definition") => {
        return (
            <div className={styles["file-info-show"]}>
                <div className={styles["title"]}>{activeFile?.name}</div>
                <Tooltip title={activeFile?.path}>
                    <div className={classNames(styles["sub-title"], "yakit-single-line-ellipsis")}>
                        {activeFile?.path}
                    </div>
                </Tooltip>
                <div className={styles["count-box"]}>
                    {key === "references" ? referencesList.length : definitionList.length}
                </div>
            </div>
        )
    })

    const titleRender = (info: {key: string; value: ReactElement}) => {
        return <div className={styles["title-render"]}>{info.value}</div>
    }

    const renderItem = (info: {key: string; value: ReactElement}) => {
        if (info.key === "Definition") {
            return (
                <CollapseList
                    type='sideBar'
                    onlyKey='key'
                    list={[{key: "Definition-title", value: fileInfo("definition")}]}
                    titleRender={titleRender}
                    renderItem={renderItem}
                />
            )
        }
        if (info.key === "References") {
            return (
                <CollapseList
                    type='sideBar'
                    onlyKey='key'
                    list={[{key: "References-title", value: fileInfo("references")}]}
                    titleRender={titleRender}
                    renderItem={renderItem}
                />
            )
        }
        if (info.key === "Definition-title") {
            return (
                <>
                    {definitionList.map((item) => (
                        <div className={styles["content-render"]} onClick={() => onJumpEditorDetailFun(item.range)}>
                            {item.lineContent}
                        </div>
                    ))}
                </>
            )
        }
        if (info.key === "References-title") {
            return (
                <>
                    {referencesList.map((item) => (
                        <div className={styles["content-render"]} onClick={() => onJumpEditorDetailFun(item.range)}>
                            {item.lineContent}
                        </div>
                    ))}
                </>
            )
        }
        return <></>
    }

    const onReferences = useMemoizedFn(async () => {
        if (helpEditor) {
            const model = helpEditor.getModel()
            const position = activeFile?.position as monaco.Position

            if (model && position) {
                const iWord = getWordWithPointAtPosition(model, position)
                const type = getModelContext(model, "plugin") || "yak"
                if (iWord.word.length === 0) return
                await ipcRenderer
                    .invoke("YaklangLanguageFind", {
                        InspectType: "reference",
                        YakScriptType: type,
                        YakScriptCode: model.getValue(),
                        Range: {
                            Code: iWord.word,
                            StartLine: position.lineNumber,
                            StartColumn: iWord.startColumn,
                            EndLine: position.lineNumber,
                            EndColumn: iWord.endColumn
                        } as Range
                    } as YaklangLanguageSuggestionRequest)
                    .then((r: YaklangLanguageFindResponse) => {
                        if (r.Ranges.length === 0) {
                            setReferencesList([])
                            return
                        }
                        const newReferencesList = r.Ranges.map((v) => {
                            return {
                                lineContent: model.getLineContent(v.StartLine),
                                range: new monaco.Range(
                                    Number(v.StartLine),
                                    Number(v.StartColumn),
                                    Number(v.EndLine),
                                    Number(v.EndColumn)
                                )
                            }
                        })
                        setReferencesList(newReferencesList)
                    })
            }
        }
    })

    const onDefinition = useMemoizedFn(async () => {
        if (helpEditor) {
            const model = helpEditor.getModel()
            const position = activeFile?.position as monaco.Position
            if (model && position) {
                const iWord = getWordWithPointAtPosition(model, position)
                if (iWord.word.length === 0) return
                const type = getModelContext(model, "plugin") || "yak"
                await ipcRenderer
                    .invoke("YaklangLanguageFind", {
                        InspectType: "definition",
                        YakScriptType: type,
                        YakScriptCode: model.getValue(),
                        Range: {
                            Code: iWord.word,
                            StartLine: position.lineNumber,
                            StartColumn: iWord.startColumn,
                            EndLine: position.lineNumber,
                            EndColumn: iWord.endColumn
                        } as Range
                    } as YaklangLanguageSuggestionRequest)
                    .then((r: YaklangLanguageFindResponse) => {
                        if (r.Ranges.length === 0) {
                            setDefinitionList([])
                            return
                        }
                        const newDefinitionList = r.Ranges.map((v) => {
                            return {
                                lineContent: model.getLineContent(v.StartLine),
                                range: new monaco.Range(
                                    Number(v.StartLine),
                                    Number(v.StartColumn),
                                    Number(v.EndLine),
                                    Number(v.EndColumn)
                                )
                            }
                        })
                        setDefinitionList(newDefinitionList)
                    })
            }
        }
    })

    // 帮助信息
    useEffect(() => {
        onReferences()
        onDefinition()
    }, [activeFile?.position])

    const getList = useMemo(() => {
        let list: {key: string; value: ReactElement}[] = []
        if (definitionList.length > 0) {
            list.push({key: "Definition", value: <>Definition</>})
        }
        if (referencesList.length > 0) {
            list.push({key: "References", value: <>References</>})
        }
        return list
    }, [referencesList, definitionList])

    return (
        <div className={styles["help-info-list"]}>
            <YakitResizeBox
                lineDirection='right'
                firstRatio={"40%"}
                firstNode={
                    <CollapseList
                        type='output'
                        onlyKey='key'
                        list={getList}
                        titleRender={titleRender}
                        renderItem={renderItem}
                    />
                }
                secondMinSize={300}
                secondNodeStyle={{padding: 0}}
                secondNode={
                    <YakitEditor
                        readOnly
                        editorDidMount={(editor, monaco) => {
                            setHelpEditor(editor)
                            setHelpMonaco(monaco)
                        }}
                        type={activeFile?.language || "yak"}
                        value={activeFile?.code || ""}
                    />
                }
            />
            {getList.length === 0 && <div className={styles["no-data"]}>暂无帮助信息</div>}
        </div>
    )
})
