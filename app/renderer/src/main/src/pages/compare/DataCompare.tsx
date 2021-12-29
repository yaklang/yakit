import React, { useEffect, useState, useRef } from "react"
import { PageHeader, Button } from "antd"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import { AutoCard } from "../../components/AutoCard"
import { LineConversionIcon } from "../../assets/icons"
import { now } from "moment"

const { ipcRenderer } = window.require("electron")

interface textModelProps {
    content: string
    language: string
}

export const DataCompare: React.FC = (props) => {
    const [left, setLeft] = useState<string>("")
    const [right, setRight] = useState<string>("")
    const [language, setLanguage] = useState<string>("")
    const [token, setToken] = useState<string>("")
    const [noWrap, setNoWrap] = useState<boolean>(false)
    const diffDivRef = useRef(null)
    const diffEditorRef = useRef<monacoEditor.editor.IStandaloneDiffEditor>()

    const monaco = monacoEditor.editor

    const setModelEditor = (left?: textModelProps, right?: textModelProps, language = "yak") => {
        const leftModel = monaco.createModel(left ? left.content : "", left ? left.language : language)
        leftModel.onDidChangeContent((e) => {
            setLeft(leftModel.getValue())
        })
        const rightModel = monaco.createModel(right ? right.content : "", right ? right.language : language)
        rightModel.onDidChangeContent((e) => {
            setRight(rightModel.getValue())
        })
        if (!diffEditorRef.current) return
        diffEditorRef.current.setModel({
            original: leftModel,
            modified: rightModel
        })
    }

    useEffect(() => {
        //如果存在先销毁以前的组件
        if (diffEditorRef.current) diffEditorRef.current.dispose()

        ipcRenderer
            .invoke("create-compare-token")
            .then((res) => {
                // 获取生成diff组件的ref
                if (!diffDivRef || !diffDivRef.current) return

                const diff = diffDivRef.current as unknown as HTMLDivElement
                diffEditorRef.current = monaco.createDiffEditor(diff, {
                    enableSplitViewResizing: false,
                    originalEditable: true,
                    automaticLayout: true,
                    wordWrap: noWrap ? "off" : "on"
                })

                setToken(res.token)

                if (!!res.info) {
                    const { info } = res
                    if (info.type === 1) {
                        const { left } = info
                        setLanguage(left.language)
                        setLeft(left.content)
                        setModelEditor(left, undefined, left.language)
                    }

                    if (info.type === 2) {
                        const { right } = info
                        setLanguage(right.language)
                        setRight(right.content)
                        setModelEditor(undefined, right, right.language)
                    }
                } else {
                    setLanguage("yak")
                    setModelEditor()
                }

                ipcRenderer.on(`${res.token}-data`, (e, res) => {
                    const { left, right } = res.info

                    setModelEditor(left, right, language || left.language)

                    if (res.info.type === 1) setLeft(left.content)
                    if (res.info.type === 2) setRight(right.content)
                })
            })
            .catch((err) => {})
            .finally(() => {})
    }, [])

    const changeLineConversion = () => {
        if (!diffDivRef || !diffDivRef.current) return
        if (!diffEditorRef.current) return
        const diff = diffDivRef.current as unknown as HTMLDivElement
        diffEditorRef.current.dispose()

        const isWrap = !noWrap
        diffEditorRef.current = monaco.createDiffEditor(diff, {
            enableSplitViewResizing: false,
            originalEditable: true,
            automaticLayout: true,
            wordWrap: isWrap ? "off" : "on"
        })

        setNoWrap(!noWrap)
        setModelEditor({ content: left, language: language }, { content: right, language: language }, language)
    }

    return (
        <AutoCard
            title={"数据对比"}
            bodyStyle={{ padding: 0 }}
            extra={
                <>
                    <Button
                        size={"small"}
                        type={!noWrap ? "primary" : "link"}
                        icon={<LineConversionIcon />}
                        onClick={() => {
                            changeLineConversion()
                        }}
                    />
                </>
            }
        >
            <div ref={diffDivRef} style={{ width: "100%", height: "100%" }}></div>
        </AutoCard>
    )
}
