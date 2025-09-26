import React, {useEffect, useRef, useState} from "react"
import {Button, Form} from "antd"
import {failed, info} from "../../utils/notification"
import {InputItem, SelectOne} from "../../utils/inputUtil"
import {StringToUint8Array} from "@/utils/str"
import {CacheDropDownGV} from "@/yakitGV"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import i18n from "@/i18n/i18n"

interface InsertFileFuzzTagProp {
    onFinished: (i: string) => any
    defaultMode?: ModeProps
}

type ModeProps = "file" | "file:line" | "file:dir"

const InsertFileFuzzTag: React.FC<InsertFileFuzzTagProp> = (props) => {
    const {defaultMode} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi"])
    const [filename, setFilename] = useState("")
    const [mode, setMode] = useState<ModeProps>(defaultMode || "file")
    const configBaseUrlRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })

    return (
        <Form
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
            style={{marginTop: 15}}
            onSubmitCapture={(e) => {
                e.preventDefault()
                if (!filename) {
                    info(t("InsertFileFuzzTag.selectedFilenameEmpty"))
                    return
                }
                const index = filename.lastIndexOf(".")
                if (mode === "file:dir") {
                    if (index !== -1) {
                        failed(t("YakitFormDragger.enterValidPath"))
                        return
                    }
                }

                configBaseUrlRef.current.onSetRemoteValues(filename)

                switch (mode) {
                    case "file":
                        props.onFinished(`{{file(${filename})}}`)
                        return
                    case "file:line":
                        props.onFinished(`{{file:line(${filename})}}`)
                        return
                    case "file:dir":
                        props.onFinished(`{{file:dir(${filename})}}`)
                        return
                }
            }}
        >
            <Form.Item label={<></>} colon={false}>
                <YakitRadioButtons
                    buttonStyle='solid'
                    options={[
                        {
                            value: "file",
                            label: t("InsertFileFuzzTag.fileContent")
                        },
                        {
                            value: "file:line",
                            label: t("InsertFileFuzzTag.readFileByLine")
                        },
                        {
                            value: "file:dir",
                            label: t("InsertFileFuzzTag.allInFolder")
                        }
                    ]}
                    value={mode}
                    onChange={(e) => {
                        setMode(e.target.value)
                    }}
                />
            </Form.Item>
            <YakitFormDragger
                formItemProps={{
                    name: "filename",
                    label: t("InsertFileFuzzTag.selectPath"),
                    labelCol: {span: 5},
                    wrapperCol: {span: 14}
                }}
                selectType={mode !== "file:dir" ? "file" : "folder"}
                isShowPathNumber={false}
                multiple={false}
                fileExtensionIsExist={false}
                renderType='autoComplete'
                onChange={(val) => {
                    setFilename(val)
                }}
                value={filename}
                autoCompleteProps={{
                    ref: configBaseUrlRef,
                    cacheHistoryDataKey: CacheDropDownGV.WebFuzzerInsertFileFuzzTag
                }}
            />
            <Form.Item label={<></>} colon={false}>
                <YakitButton type='primary' htmlType='submit' size={"large"}>
                    {t("InsertFileFuzzTag.confirmSelection")}
                </YakitButton>
            </Form.Item>
        </Form>
    )
}

const {ipcRenderer} = window.require("electron")

const InsertTextToFuzzTag: React.FC<InsertFileFuzzTagProp> = (props) => {
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi"])
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<"file" | "file:line" | "file:dir">("file:line")
    return (
        <Form
            style={{paddingTop: 20}}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
            onSubmitCapture={(e) => {
                e.preventDefault()

                ipcRenderer
                    .invoke("SaveTextToTemporalFile", {Text: StringToUint8Array(content)})
                    .then((rsp: {FileName: string}) => {
                        info(t("InsertTextToFuzzTag.generateTempDictionaryFile") + rsp.FileName)
                        const filename = rsp.FileName
                        switch (mode) {
                            case "file":
                                props.onFinished(`{{file(${filename})}}`)
                                return
                            case "file:line":
                                props.onFinished(`{{file:line(${filename})}}`)
                                return
                        }
                    })
                    .catch((e) => {
                        failed(`${t("InsertTextToFuzzTag.generateTempDictionaryFailed")}${e}`)
                    })
            }}
        >
            <Form.Item colon={false} label={" "}>
                <YakitRadioButtons
                    buttonStyle='solid'
                    options={[
                        {
                            value: "file",
                            label: t("InsertTextToFuzzTag.fileContent")
                        },
                        {
                            value: "file:line",
                            label: t("InsertTextToFuzzTag.readFileByLine")
                        }
                    ]}
                    value={mode}
                    onChange={(e) => {
                        setMode(e.target.value)
                    }}
                />
            </Form.Item>
            <InputItem
                label={t("InsertTextToFuzzTag.text")}
                textarea={true}
                textareaRow={8}
                value={content}
                setValue={setContent}
            />
            <Form.Item colon={false} label={" "} style={{textAlign: "right"}}>
                <YakitButton type='primary' htmlType='submit' size='large'>
                    {" "}
                    {t("InsertTextToFuzzTag.confirmInsertTag")}{" "}
                </YakitButton>
            </Form.Item>
        </Form>
    )
}

export const insertFileFuzzTag = (onInsert: (i: string) => any, defaultMode?: ModeProps) => {
    let m = showYakitModal({
        title: i18n.language === "zh" ? "选择文件并插入" : "Select File and Insert",
        width: "800px",
        content: (
            <>
                <InsertFileFuzzTag
                    defaultMode={defaultMode}
                    onFinished={(e) => {
                        onInsert(e)
                        m.destroy()
                    }}
                />
            </>
        ),
        footer: null
    })
}

export const insertTemporaryFileFuzzTag = (onInsert: (i: string) => any) => {
    let m = showYakitModal({
        title: i18n.language === "zh" ? "复制你想要作为字典的文本" : "Copy the text you want to use as a dictionary",
        width: "40%",
        content: (
            <>
                <InsertTextToFuzzTag
                    onFinished={(e) => {
                        onInsert(e)
                        m.destroy()
                    }}
                />
            </>
        ),
        footer: null
    })
}
