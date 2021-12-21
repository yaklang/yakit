import React, { useEffect, useState, useRef } from "react"
import { PageHeader } from "antd";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"


const { ipcRenderer } = window.require("electron")

export const DataCompare: React.FC = (props) => {
    const [left, setLeft] = useState<string>("")
    const [right, setRight] = useState<string>("")
    const [token, setToken] = useState<string>("")
    const diffDivRef = useRef(null)

    const monaco = monacoEditor.editor

    useEffect(() => {
        ipcRenderer
            .invoke("create-compare-token")
            .then((res) => {
                // 获取生成diff组件的ref
                if (!diffDivRef || !diffDivRef.current) return
                const diff = diffDivRef.current as unknown as HTMLDivElement
                const diffEditor = monaco.createDiffEditor(diff, { enableSplitViewResizing: false, originalEditable: true, automaticLayout: true })

                setToken(res.token)

                if (!!res.info) {
                    const { info } = res
                    if (info.type === 1) {
                        const { left } = info

                        setLeft(left.content)

                        const leftModel = monaco.createModel(left.content, left.language)
                        const rightModel = monaco.createModel("", left.language)
                        diffEditor.setModel({
                            original: leftModel,
                            modified: rightModel
                        })
                    }

                    if (info.type === 2) {
                        const { right } = info

                        setRight(right.content)

                        const leftModel = monaco.createModel("", right.language)
                        const rightModel = monaco.createModel(right.content, right.language)
                        diffEditor.setModel({
                            original: leftModel,
                            modified: rightModel
                        })
                    }
                } else {
                    const leftModel = monaco.createModel("", "yak")
                    const rightModel = monaco.createModel("", "yak")
                    // rightModel.onDidChangeContent((e)=>{console.log('e:',e)})

                    diffEditor.setModel({
                        original: leftModel,
                        modified: rightModel
                    })
                }

                ipcRenderer.on(`${res.token}-data`, (e, res) => {
                    const { left, right } = res.info

                    const leftModel = monaco.createModel(left.content, left.language)
                    const rightModel = monaco.createModel(right.content, right.language)
                    diffEditor.setModel({
                        original: leftModel,
                        modified: rightModel
                    })

                    if (res.info.type === 1) setLeft(left.content)
                    if (res.info.type === 2) setRight(right.content)
                })
            })
            .catch((err) => { })
            .finally(() => { })
    }, [])

    return (
        <div style={{ width: "100%", display: "flex", flexFlow: "column", height: "100%", overflow: "hidden" }}>
            <PageHeader title={"数据对比"} style={{ padding: '10px 20px 10px 15px' }}></PageHeader>
            <div ref={diffDivRef} style={{ width: "100%", flex: 1 }}></div>
        </div>
    )
}
