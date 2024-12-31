import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {IMonacoEditor, NewHTTPPacketEditor} from "@/utils/editors"
import {insertFileFuzzTag, insertTemporaryFileFuzzTag} from "../InsertFileFuzzTag"
import {monacoEditorWrite} from "../fuzzerTemplates"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {execCodec} from "@/utils/encodec"
import {copyAsUrl, showDictsAndSelect} from "../HTTPFuzzerPage"
import styles from "./WebFuzzerNewEditor.module.scss"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {setRemoteValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {HTTPFuzzerHotPatch} from "../HTTPFuzzerHotPatch"
import {yakitNotify} from "@/utils/notification"
import {openExternalWebsite} from "@/utils/openWebsite"
import {setClipboardText} from "@/utils/clipboard"
import {setEditorContext} from "@/utils/monacoSpec/yakEditor"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
const {ipcRenderer} = window.require("electron")

export interface WebFuzzerNewEditorProps {
    ref?: any
    refreshTrigger: boolean
    request: string
    isHttps: boolean
    hotPatchCode: string
    hotPatchCodeWithParamGetter: string
    setRequest: (s: string) => void
    setHotPatchCode: (s: string) => void
    setHotPatchCodeWithParamGetter: (s: string) => void
    firstNodeExtra?: () => JSX.Element
    pageId: string
}
export const WebFuzzerNewEditor: React.FC<WebFuzzerNewEditorProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            refreshTrigger,
            request,
            setRequest,
            isHttps,
            hotPatchCode,
            hotPatchCodeWithParamGetter,
            setHotPatchCode,
            setHotPatchCodeWithParamGetter,
            firstNodeExtra,
            pageId
        } = props
        const [reqEditor, setReqEditor] = useState<IMonacoEditor>()

        const [newRequest, setNewRequest] = useState<string>(request) // 由于传过来的request是ref 值变化并不会导致重渲染 这里拿到的request还是旧值

        useImperativeHandle(
            ref,
            () => ({
                reqEditor
            }),
            [reqEditor]
        )
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
                title: null,
                width: "80%",
                footer: null,
                maskClosable: false,
                closable: false,
                hiddenHeader: true,
                keyboard: false,
                content: (
                    <HTTPFuzzerHotPatch
                        pageId={pageId}
                        initialHotPatchCode={hotPatchCode}
                        initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetter}
                        onInsert={(tag) => {
                            if (reqEditor) monacoEditorWrite(reqEditor, tag)
                            m.destroy()
                        }}
                        onSaveCode={(code) => {
                            setHotPatchCode(code)
                        }}
                        onSaveHotPatchCodeWithParamGetterCode={(code) => {
                            setHotPatchCodeWithParamGetter(code)
                            setRemoteValue(FuzzerRemoteGV.WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
                        }}
                        onCancel={() => m.destroy()}
                    />
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
                }
            }
        }, [])

        const copyUrl = useMemoizedFn(() => {
            copyAsUrl({Request: newRequest, IsHTTPS: isHttps})
        })
        const onClickOpenBrowserMenu = useMemoizedFn(() => {
            ipcRenderer
                .invoke("ExtractUrl", {Request: newRequest, IsHTTPS: isHttps})
                .then((data: {Url: string}) => {
                    openExternalWebsite(data.Url)
                })
                .catch((e) => {
                    yakitNotify("error", "复制 URL 失败：包含 Fuzz 标签可能会导致 URL 不完整")
                })
        })

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
                originValue={request}
                contextMenu={editorRightMenu}
                onEditor={setReqEditor}
                onChange={(i) => {
                    setNewRequest(i)
                    setRequest(i)
                }}
                editorOperationRecord='HTTP_FUZZER_PAGE_EDITOR_RECORF'
                extraEditorProps={{
                    isShowSelectRangeMenu: true,
                    pageId
                }}
                extraEnd={firstNodeExtra && firstNodeExtra()}
                onClickUrlMenu={copyUrl}
                onClickOpenBrowserMenu={onClickOpenBrowserMenu}
            />
        )
    })
)
