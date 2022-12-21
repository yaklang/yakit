import React from "react"
import {Upload} from "antd"
import {
    ItemDraggerInput,
    ItemDraggerInputProps,
    ItemDraggerTextArea,
    ItemDraggerTextAreaProps
} from "../baseTemplate/FormItemUtil"

import "./ContentUploadTextArea.css"

export interface ContentUploadInputProps extends ItemDraggerTextAreaProps, ItemDraggerInputProps {
    type?: "input" | "textarea"
    beforeUpload?: (f: any) => any
}

export const ContentUploadInput: React.FC<ContentUploadInputProps> = (props) => {
    const {type = "input", beforeUpload, dragger, item, textarea, input, ...restProps} = props

    if (type === "input") {
        return (
            <ItemDraggerInput
                dragger={{multiple: false, maxCount: 1, showUploadList: false, beforeUpload, ...dragger}}
                item={{
                    help: (
                        <div className='content-upload-input-help'>
                            可将TXT文件拖入框内或
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
                                <span className='help-hint-title'>点击此处</span>
                            </Upload>
                            上传
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
                            可将TXT、Excel文件拖入框内或
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
                                <span className='help-hint-title'>点击此处</span>
                            </Upload>
                            上传
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
