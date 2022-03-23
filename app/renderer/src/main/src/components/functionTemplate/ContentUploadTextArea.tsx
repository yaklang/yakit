import React from "react"
import {Upload} from "antd"
import {ItemDraggerTextArea, ItemDraggerTextAreaProps} from "../baseTemplate/FormItemUtil"

export interface ContentUploadTextAreaProps extends ItemDraggerTextAreaProps {
    beforeUpload?: (f: any) => any
}

export const ContentUploadTextArea: React.FC<ContentUploadTextAreaProps> = (props) => {
    const {beforeUpload, dragger, item, ...restProps} = props

    return (
        <ItemDraggerTextArea
            dragger={{multiple: false, maxCount: 1, showUploadList: false, beforeUpload, ...dragger}}
            item={{
                help: (
                    <div>
                        可将TXT文件拖入框内或
                        <Upload
                            accept={"text/plain"}
                            multiple={false}
                            maxCount={1}
                            showUploadList={false}
                            beforeUpload={(f) => {
                                if (beforeUpload) return beforeUpload(f)
                                else return false
                            }}
                        >
                            <span style={{color: "rgb(25,143,255)", cursor: "pointer"}}>点击此处</span>
                        </Upload>
                        上传
                    </div>
                ),
                ...item
            }}
            {...restProps}
        ></ItemDraggerTextArea>
    )
}
