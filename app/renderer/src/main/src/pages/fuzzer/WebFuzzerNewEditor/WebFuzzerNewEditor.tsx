import React, {ReactElement, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {IMonacoEditor, NewHTTPPacketEditor, NewHTTPPacketEditorProp} from "@/utils/editors"
import {NewEditorSelectRange} from "@/components/NewEditorSelectRange"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {HTTPFuzzerClickEditorMenu, HTTPFuzzerRangeEditorMenu} from "../HTTPFuzzerEditorMenu"
import {insertFileFuzzTag, insertTemporaryFileFuzzTag} from "../InsertFileFuzzTag"
import {QueryFuzzerLabelResponseProps, StringFuzzer} from "../StringFuzzer"
import {monacoEditorWrite} from "../fuzzerTemplates"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {callCopyToClipboard} from "@/utils/basic"
import {execCodec} from "@/utils/encodec"
import {
    WEB_FUZZ_HOTPATCH_CODE,
    WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE,
    copyAsUrl,
    showDictsAndSelect
} from "../HTTPFuzzerPage"
import styles from "./WebFuzzerNewEditor.module.scss"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {setRemoteValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {HTTPFuzzerHotPatch} from "../HTTPFuzzerHotPatch"
import {Modal} from "antd"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface CountDirectionProps {
    x?: string
    y?: string
}

export interface EditorDetailInfoProps {
    direction: CountDirectionProps
    top: number
    bottom: number
    left: number
    right: number
    focusX: number
    focusY: number
    lineHeight: number
}

export interface WebFuzzerNewEditorProps {
    ref?:any
    refreshTrigger: boolean
    request: string
    isHttps: boolean
    hotPatchCode: string
    hotPatchCodeWithParamGetter: string
    selectId: string
    rangeId: string
    setRequest: (s: string) => void
    setHotPatchCode: (s: string) => void
    setHotPatchCodeWithParamGetter: (s: string) => void
}
export const WebFuzzerNewEditor: React.FC<WebFuzzerNewEditorProps> = React.memo(React.forwardRef((props,ref) => {
    const {
        refreshTrigger,
        request,
        setRequest,
        selectId,
        rangeId,
        isHttps,
        hotPatchCode,
        hotPatchCodeWithParamGetter,
        setHotPatchCode,
        setHotPatchCodeWithParamGetter
    } = props
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()

    useImperativeHandle(ref, () => ({
        reqEditor,
        onInsertYakFuzzer,
    }),[reqEditor])
    useEffect(() => {
        try {
            if (!reqEditor) {
                return
            }
        } catch (e) {
            yakitNotify("error", "初始化 EOL CRLF 失败")
        }
    }, [reqEditor])
    const hotPatchTrigger = useMemoizedFn(() => {
        let m = showYakitModal({
            title: "调试 / 插入热加载代码",
            width: "80%",
            footer: null,
            content: (
                <div className={styles["http-fuzzer-hotPatch"]}>
                    <HTTPFuzzerHotPatch
                        initialHotPatchCode={hotPatchCode}
                        initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetter}
                        onInsert={(tag) => {
                            if (reqEditor) monacoEditorWrite(reqEditor, tag)
                            m.destroy()
                        }}
                        onSaveCode={(code) => {
                            setHotPatchCode(code)
                            setRemoteValue(WEB_FUZZ_HOTPATCH_CODE, code)
                        }}
                        onSaveHotPatchCodeWithParamGetterCode={(code) => {
                            setHotPatchCodeWithParamGetter(code)
                            setRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
                        }}
                    />
                </div>
            )
        })
    })
    const editorRightMenu: OtherMenuListProps = useMemo(() => {
        return {
            insertLabelTag: {
                menu: [
                    {type: "divider"},
                    {
                        key: "insert-label-tag",
                        label: "插入标签/字典",
                        children: [
                            {key: "insert-nullbyte", label: "插入空字节标签: {{hexd(00)}}"},
                            {key: "insert-temporary-file-tag", label: "插入临时字典"},
                            {key: "insert-intruder-tag", label: "插入模糊测试字典标签"},
                            {key: "insert-hotpatch-tag", label: "插入热加载标签"},
                            {key: "insert-fuzzfile-tag", label: "插入文件标签"}
                        ]
                    }
                ],
                onRun: (editor, key) => {
                    switch (key) {
                        case "insert-nullbyte":
                            editor.trigger("keyboard", "type", {text: "{{hexd(00)}}"})
                            return
                        case "insert-temporary-file-tag":
                            insertTemporaryFileFuzzTag((i) => monacoEditorWrite(editor, i))
                            return
                        case "insert-intruder-tag":
                            showDictsAndSelect((i) => {
                                monacoEditorWrite(editor, i, editor.getSelection())
                            })
                            return
                        case "insert-hotpatch-tag":
                            hotPatchTrigger()
                            return
                        case "insert-fuzzfile-tag":
                            insertFileFuzzTag((i) => monacoEditorWrite(editor, i))
                            return

                        default:
                            break
                    }
                }
            },
            copyURL: {
                menu: [
                    {key: "copy-as-url", label: "复制为 URL"},
                    {key: "copy-as-curl", label: "复制 curl 命令"}
                ],
                onRun: (editor, key) => {
                    switch (key) {
                        case "copy-as-url":
                            copyAsUrl({Request: request, IsHTTPS: isHttps})
                            return
                        case "copy-as-curl":
                            execCodec("packet-to-curl", request, undefined, undefined, undefined, [
                                {Key: "https", Value: isHttps ? "true" : ""}
                            ]).then((data) => {
                                callCopyToClipboard(data)
                                yakitNotify("info", "复制到剪贴板")
                            })
                            return
                    }
                }
            }
        }
    }, [request, isHttps])
    /**@description 插入 yak.fuzz 语法 */
    const onInsertYakFuzzer = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "Fuzzer Tag 调试工具",
            width: "70%",
            footer: null,
            subTitle: "调试模式适合生成或者修改 Payload，在调试完成后，可以在 Web Fuzzer 中使用",
            content: (
                <div style={{padding: 24}}>
                    <StringFuzzer
                        advanced={true}
                        disableBasicMode={true}
                        insertCallback={(template: string) => {
                            if (!template) {
                                Modal.warn({
                                    title: "Payload 为空 / Fuzz 模版为空"
                                })
                            } else {
                                if (reqEditor && template) {
                                    reqEditor.trigger("keyboard", "type", {
                                        text: template
                                    })
                                } else {
                                    Modal.error({
                                        title: "BUG: 编辑器失效"
                                    })
                                }
                                m.destroy()
                            }
                        }}
                        close={() => m.destroy()}
                    />
                </div>
            )
        })
    })
    return (
        <NewEditorSelectRange
            defaultHttps={isHttps}
            noHex={true}
            noHeader={true}
            refreshTrigger={refreshTrigger}
            hideSearch={true}
            bordered={false}
            noMinimap={true}
            utf8={true}
            originValue={StringToUint8Array(request)}
            contextMenu={editorRightMenu}
            onEditor={setReqEditor}
            onChange={(i) => setRequest(Uint8ArrayToString(i, "utf8"))}
            editorOperationRecord='HTTP_FUZZER_PAGE_EDITOR_RECORF'
            // selectId={`monaco.fizz.select.widget-${selectId}`}
            selectId={`monaco.fizz.select.widget`}
            selectNode={(close, editorInfo) => (
                <HTTPFuzzerClickEditorMenu
                    editorInfo={editorInfo}
                    close={() => close()}
                    insert={(v: QueryFuzzerLabelResponseProps) => {
                        if (v.Label) {
                            reqEditor && reqEditor.trigger("keyboard", "type", {text: v.Label})
                        } else if (v.DefaultDescription === "插入本地文件") {
                            reqEditor && insertFileFuzzTag((i) => monacoEditorWrite(reqEditor, i), "file:line")
                        }
                        close()
                    }}
                    addLabel={() => {
                        close()
                        onInsertYakFuzzer()
                    }}
                />
            )}
            // rangeId={`monaco.fizz.range.widget`}
            rangeId={`monaco.fizz.range.widget-${rangeId}`}
            rangeNode={(closeFizzRangeWidget, editorInfo) => (
                <HTTPFuzzerRangeEditorMenu
                    editorInfo={editorInfo}
                    insert={(fun: any) => {
                        if (reqEditor) {
                            const selectedText =
                                reqEditor.getModel()?.getValueInRange(reqEditor.getSelection() as any) || ""
                            if (selectedText.length > 0) {
                                ipcRenderer
                                    .invoke("QueryFuzzerLabel", {})
                                    .then((data: {Data: QueryFuzzerLabelResponseProps[]}) => {
                                        const {Data} = data
                                        let newSelectedText: string = selectedText
                                        if (Array.isArray(Data) && Data.length > 0) {
                                            // 选中项是否存在于标签中
                                            let isHave: boolean = Data.map((item) => item.Label).includes(selectedText)
                                            if (isHave) {
                                                newSelectedText = selectedText.replace(/{{|}}/g, "")
                                            }
                                        }
                                        const text: string = fun(newSelectedText)
                                        reqEditor.trigger("keyboard", "type", {text})
                                    })
                            }
                        }
                    }}
                    replace={(text: string) => {
                        if (reqEditor) {
                            reqEditor.trigger("keyboard", "type", {text})
                            closeFizzRangeWidget()
                        }
                    }}
                    rangeValue={
                        (reqEditor && reqEditor.getModel()?.getValueInRange(reqEditor.getSelection() as any)) || ""
                    }
                    hTTPFuzzerClickEditorMenuProps={{
                        editorInfo: editorInfo,
                        close: () => closeFizzRangeWidget(),
                        insert: (v: QueryFuzzerLabelResponseProps) => {
                            if (v.Label) {
                                reqEditor && reqEditor.trigger("keyboard", "type", {text: v.Label})
                            } else if (v.DefaultDescription === "插入本地文件") {
                                reqEditor && insertFileFuzzTag((i) => monacoEditorWrite(reqEditor, i), "file:line")
                            }
                            closeFizzRangeWidget()
                        },
                        addLabel: () => {
                            closeFizzRangeWidget()
                            onInsertYakFuzzer()
                        }
                    }}
                />
            )}
        />
    )
}))
