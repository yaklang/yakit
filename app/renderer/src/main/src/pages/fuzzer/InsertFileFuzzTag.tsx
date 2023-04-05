import React, {useState} from "react";
import {showModal} from "../../utils/showModal";
import {Button, Form} from "antd";
import {failed, info} from "../../utils/notification";
import {InputFileNameItem, InputFileNameItemProps, InputItem, SelectOne} from "../../utils/inputUtil";
import {StringToUint8Array} from "@/utils/str";

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


const {ipcRenderer} = window.require("electron");

const InsertTextToFuzzTag: React.FC<InsertFileFuzzTagProp> = (props) => {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"file" | "file:line" | "file:dir">("file:line");
    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}} onSubmitCapture={e => {
        e.preventDefault()

        ipcRenderer.invoke("SaveTextToTemporalFile", {Text: StringToUint8Array(content)}).then((rsp: { FileName: string }) => {
            info("生成临时字典文件:" + rsp.FileName)
            const filename = rsp.FileName;
            switch (mode) {
                case "file":
                    props.onFinished(`{{file(${filename})}}`)
                    return
                case "file:line":
                    props.onFinished(`{{file:line(${filename})}}`)
                    return
            }
        }).catch(e => {
            failed(`生成临时字典失败:${e}`)
        })


    }}>
        <InputItem label={"文本"} textarea={true} textareaRow={8} value={content} setValue={setContent}/>
        <SelectOne
            label={" "} colon={false}
            data={[
                {value: "file", text: "文件内容"},
                {value: "file:line", text: "按行读取文件"},
            ]}
            value={mode}
            setValue={setMode}
        />
        {/*<InputItem label={"临时文件路径"} value={filename} setValue={setFilename} disable={true}/>*/}
        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 确定插入标签 </Button>
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

export const insertTemporaryFileFuzzTag = (onInsert: (i: string) => any) => {
    let m = showModal({
        title: "复制你想要作为字典的文本",
        width: "800px",
        content: (
            <>
                <InsertTextToFuzzTag onFinished={e => {
                    onInsert(e)
                    m.destroy()
                }}/>
            </>
        )
    })
}