import React, {ReactElement, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {IMonacoEditor, NewHTTPPacketEditor, NewHTTPPacketEditorProp} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {insertFileFuzzTag, insertTemporaryFileFuzzTag} from "../InsertFileFuzzTag"
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
import {yakitNotify} from "@/utils/notification"

export interface WebFuzzerNewEditorProps {
    ref?:any
    refreshTrigger: boolean
    request: string
    isHttps: boolean
    hotPatchCode: string
    hotPatchCodeWithParamGetter: string
    setRequest: (s: string) => void
    setHotPatchCode: (s: string) => void
    setHotPatchCodeWithParamGetter: (s: string) => void
    firstNodeExtra?: () => JSX.Element
}
export const WebFuzzerNewEditor: React.FC<WebFuzzerNewEditorProps> = React.memo(React.forwardRef((props,ref) => {
    const {
        refreshTrigger,
        request,
        setRequest,
        isHttps,
        hotPatchCode,
        hotPatchCodeWithParamGetter,
        setHotPatchCode,
        setHotPatchCodeWithParamGetter,
        firstNodeExtra
    } = props
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()

    useImperativeHandle(ref, () => ({
        reqEditor,
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

    return (
        <NewHTTPPacketEditor
            defaultHttps={isHttps}
            noHex={true}
            isShowBeautifyRender={false}
            showDefaultExtra={false}
            refreshTrigger={refreshTrigger}
            hideSearch={true}
            noMinimap={true}
            utf8={true}
            originValue={StringToUint8Array(request)}
            contextMenu={editorRightMenu}
            onEditor={setReqEditor}
            onChange={(i) => setRequest(Uint8ArrayToString(i, "utf8"))}
            editorOperationRecord='HTTP_FUZZER_PAGE_EDITOR_RECORF'
            extraEditorProps={{
                isShowSelectRangeMenu: true
            }}
            extraEnd={firstNodeExtra&&firstNodeExtra()}
        />
    )
}))
