import React, {useState} from "react";
import {showModal} from "../../utils/showModal";
import {Button, Form} from "antd";
import {info} from "../../utils/notification";
import {InputFileNameItem, InputFileNameItemProps, SelectOne} from "../../utils/inputUtil";

interface InsertFileFuzzTagProp {
    onFinished: (i: string) => any
}

const InsertFileFuzzTag: React.FC<InsertFileFuzzTagProp> = (props) => {
    const [filename, setFilename] = useState("");
    const [mode, setMode] = useState<"file" | "file:line" | "file:dir">("file");
    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}} onSubmitCapture={e => {
        e.preventDefault()

        if (!filename) {
            info("选中的文件名为空")
            return
        }

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
    }}>
        <SelectOne
            label={" "} colon={false}
            data={[
                {value: "file", text: "文件内容"},
                {value: "file:line", text: "按行读取文件"},
                {value: "file:dir", text: "文件夹内所有"},
            ]}
            value={mode}
            setValue={setMode}
        />
        <InputFileNameItem label={"选择路径"} filename={filename} setFileName={setFilename}/>
        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 确定所选内容 </Button>
        </Form.Item>
    </Form>
};

export const insertFileFuzzTag = (onInsert: (i: string) => any) => {
    let m = showModal({
        title: "选择文件并插入",
        width: "800px",
        content: (
            <>
                <InsertFileFuzzTag onFinished={e => {
                    onInsert(e)
                    m.destroy()
                }}/>
            </>
        )
    })
}