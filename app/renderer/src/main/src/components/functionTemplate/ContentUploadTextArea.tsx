import React,{ReactNode} from "react"
import {Upload} from "antd"
import {
    ItemDraggerInput,
    ItemDraggerInputProps,
    ItemDraggerTextArea,
    ItemDraggerTextAreaProps
} from "../baseTemplate/FormItemUtil"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

import "./ContentUploadTextArea.css"

export interface ContentUploadInputProps extends ItemDraggerTextAreaProps, ItemDraggerInputProps {
    type?: "input" | "textarea"
    beforeUpload?: (f: any) => any
    otherHelpNode?:ReactNode
    uploadHelpText?:string
}

export const ContentUploadInput: React.FC<ContentUploadInputProps> = (props) => {
    const {type = "input", beforeUpload, dragger, item, textarea, input,otherHelpNode,uploadHelpText, ...restProps} = props
    const {t} = useI18nNamespaces(["layout"])

    if (type === "input") {
        return (
            <ItemDraggerInput
                dragger={{multiple: false, maxCount: 1, showUploadList: false, beforeUpload, ...dragger}}
                item={{
                    help: (
                        <div className='content-upload-input-help'>
                            {uploadHelpText||t("ContentUploadTextArea.dragTxt")}
                            <Upload
                                // accept={"text/plain"}
                                multiple={false}
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={(f) => {
                                    if (beforeUpload) return beforeUpload(f)
                                    else return false
                                }}
                                {...dragger}
                            >
                                <span className='help-hint-title'>{t("ContentUploadTextArea.clickHere")}</span>
                            </Upload>
                            {t("ContentUploadTextArea.upload")}
                            {otherHelpNode}
                        </div>
                    ),
                    ...item
                }}
                input={{...input}}
                {...restProps}
            />
        )
    }
    if (type === "textarea") {
        return (
            <ItemDraggerTextArea
                dragger={{multiple: false, maxCount: 1, showUploadList: false, beforeUpload, ...dragger}}
                item={{
                    help: (
                        <div className='content-upload-input-help'>
                            {uploadHelpText||t("ContentUploadTextArea.dragTxtExcel")}
                            <Upload
                                // accept={"text/plain"}
                                multiple={false}
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={(f) => {
                                    if (beforeUpload) return beforeUpload(f)
                                    else return false
                                }}
                                {...dragger}
                            >
                                <span className='help-hint-title'>{t("ContentUploadTextArea.clickHere")}</span>
                            </Upload>
                            {t("ContentUploadTextArea.upload")}
                            {otherHelpNode}
                        </div>
                    ),
                    ...item
                }}
                textarea={{...textarea}}
                {...restProps}
            />
        )
    }

    return <></>
}
