import React, { useEffect, useState, useRef, useImperativeHandle } from "react"
import { Button, Space } from "antd"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import { AutoCard } from "../../components/AutoCard"
import { LineConversionIcon } from "../../assets/icons"
import styles from "./DataCompare.module.scss";
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { RemoveIcon } from "@/assets/newIcon"
const { ipcRenderer } = window.require("electron")

interface textModelProps {
    content: string
    language: string
}

interface DataCompareProps {
    leftData?: string
    rightData?: string
}
export const DataCompare: React.FC<DataCompareProps> = (props) => {
    const {leftData,rightData} = props
    const [noWrap, setNoWrap] = useState<boolean>(false)

    const [left, setLeft] = useState<string>(leftData||"")
    const [right, setRight] = useState<string>(rightData||"")

    const codeComparisonRef = useRef<any>(null)
    return (
        <AutoCard
            title={"数据对比"}
            bodyStyle={{ padding: 0 }}
            bordered={false}
            extra={
                <Space>
                    <Button
                        size={"small"}
                        type={!noWrap ? "primary" : "link"}
                        icon={<LineConversionIcon />}
                        onClick={() => {
                            codeComparisonRef.current?.onChangeLineConversion()
                        }}
                    />
                </Space>
            }
        >
            <CodeComparison ref={codeComparisonRef} noWrap={noWrap} setNoWrap={setNoWrap} leftCode={left} setLeftCode={setLeft} rightCode={right} setRightCode={setRight} />
        </AutoCard>
    )
}

interface DataCompareModalProps {
    onClose: () => void
    leftTitle?: string
    leftCode: string
    rightTitle?: string
    rightCode: string
}

export const DataCompareModal : React.FC<DataCompareModalProps> = (props) => {
    const {onClose,leftCode,rightCode,leftTitle,rightTitle} = props

    return (
        <div className={styles['data-compare-modal']}>
            <div className={styles['header']}>
                <div className={styles['title']}>代码对比</div>
                <div className={styles['close']}>
                   <RemoveIcon onClick={()=>onClose()}/> 
                </div>
            </div>
            <div className={styles['content']}>
                {leftTitle&&rightTitle&&<div className={styles['content-title']}>
                    <div className={styles['content-title-left']}>
                        {leftTitle}
                    </div>
                    <div className={styles['content-title-right']}>
                        {rightTitle}
                    </div>
                </div>}
                <div className={styles['code']}>
                    <CodeComparison leftCode={leftCode} rightCode={rightCode} fontSize={12}/>  
                </div>
            </div>
            {/* <div className={styles['footer']}>
                <YakitButton type="outline2" onClick={()=>onClose()}>取消</YakitButton>
                <YakitButton>合并</YakitButton>
            </div> */}
        </div>
    )
}

interface CodeComparisonProps {
    noWrap?: boolean
    setNoWrap?: (b: boolean) => void
    leftCode: string
    setLeftCode?: (s: string) => void
    rightCode: string
    setRightCode?: (s: string) => void
    ref?: any
    originalEditable?: boolean
    readOnly?: boolean
    fontSize?: number
}

export const CodeComparison: React.FC<CodeComparisonProps> = React.forwardRef((props, ref) => {
    const { noWrap, setNoWrap, leftCode, setLeftCode, rightCode, setRightCode, originalEditable = true,readOnly,fontSize } = props;
    const diffDivRef = useRef(null)
    const monaco = monacoEditor.editor
    const diffEditorRef = useRef<monacoEditor.editor.IStandaloneDiffEditor>()
    const [language, setLanguage] = useState<string>("")
    useImperativeHandle(ref, () => ({
        // 减少父组件获取的DOM元素属性,只暴露给父组件需要用到的方法
        onChangeLineConversion: (newVal) => {
            changeLineConversion()
        }
    }), [leftCode, rightCode, noWrap]);
    const changeLineConversion = () => {
        if (!diffDivRef || !diffDivRef.current) return
        if (!diffEditorRef.current) return
        const diff = diffDivRef.current as unknown as HTMLDivElement
        diffEditorRef.current.dispose()

        const isWrap = !noWrap
        diffEditorRef.current = monaco.createDiffEditor(diff, {
            enableSplitViewResizing: false,
            originalEditable,
            automaticLayout: true,
            wordWrap: isWrap ? "off" : "on",
            readOnly,
            fontSize
        })
        if (setNoWrap) setNoWrap(!noWrap)
        setModelEditor({ content: leftCode, language: language }, { content: rightCode, language: language }, language)
    }
    const setModelEditor = (left?: textModelProps, right?: textModelProps, language = "yak") => {
        const leftModel = monaco.createModel(left ? left.content : "", left ? left.language : language,)
        leftModel.onDidChangeContent((e) => {
            if (setLeftCode) setLeftCode(leftModel.getValue())
        })
        const rightModel = monaco.createModel(right ? right.content : "", right ? right.language : language)
        if (setRightCode) rightModel.onDidChangeContent((e) => {
            setRightCode(rightModel.getValue())
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
                    originalEditable,
                    automaticLayout: true,
                    wordWrap: noWrap ? "off" : "on",
                    readOnly,
                    fontSize
                })

                if (!!res.info) {
                    const { info } = res
                    if (info.type === 1) {
                        const { left } = info
                        setLanguage(left.language)
                        if (setLeftCode) setLeftCode(left.content)
                        setModelEditor(left, undefined, left.language)
                    }

                    if (info.type === 2) {
                        const { right } = info
                        setLanguage(right.language)
                        if (setRightCode) setRightCode(right.content)
                        setModelEditor(undefined, right, right.language)
                    }
                } else {
                    setLanguage("yak")
                    if (setLeftCode) setLeftCode(leftCode)
                    if (setRightCode) setRightCode(rightCode)
                    setModelEditor({
                        content: leftCode,
                        language
                    }, {
                        content: rightCode,
                        language
                    })
                }

                ipcRenderer.on(`${res.token}-data`, (e, res) => {
                    const { left, right } = res.info

                    setModelEditor(left, right, language || left.language)

                    if (res.info.type === 1) if (setLeftCode) setLeftCode(left.content)
                    if (res.info.type === 2) if (setRightCode) setRightCode(right.content)
                })
            })
            .catch((err) => { })
            .finally(() => { })
    }, [])


    return <div ref={diffDivRef} style={{ width: "100%", height: "100%" }}></div>
})