import React, {useEffect, useState} from "react";
import {Form, Input, Popconfirm, Space} from "antd";
import {InputItem, ManyMultiSelectForString, SelectOne, SwitchItem} from "@/utils/inputUtil";
import {YakEditor} from "@/utils/editors";
import {StringToUint8Array} from "@/utils/str";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {DeleteOutlined} from "@ant-design/icons";
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {useGetState, useMemoizedFn} from "ahooks";
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal";
import {failed, yakitInfo} from "@/utils/notification";
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm";

export interface HTTPRequestBuilderProp {
    value: HTTPRequestBuilderParams
    setValue: (params: HTTPRequestBuilderParams) => any
    onTypeChanged: (type: "raw" | "template") => any
}

export interface KVPair {
    Key: string
    Value: string
}

export interface HTTPRequestBuilderParams {
    IsHttps: boolean

    IsRawHTTPRequest: boolean
    RawHTTPRequest: Uint8Array

    Method: string
    Path: string[]
    GetParams: KVPair[]
    Headers: KVPair[]
    Cookie: KVPair[]

    Body: Uint8Array
    PostParams: KVPair[]
    MultipartParams: KVPair[]
    MultipartFileParams: KVPair[]
}

export const getDefaultHTTPRequestBuilderParams = (): HTTPRequestBuilderParams => {
    return {
        Body: new Uint8Array,

        Method: "GET",

        GetParams: [],
        Cookie: [],
        Headers: [
            {
                Key: "User-Agent",
                Value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
            },
        ],
        IsHttps: false,
        IsRawHTTPRequest: false,
        MultipartFileParams: [],
        MultipartParams: [],
        Path: [
            "/",
        ],
        PostParams: [],
        RawHTTPRequest: new Uint8Array
    }
}

export const HTTPRequestBuilder: React.FC<HTTPRequestBuilderProp> = (props) => {
    const [params, setParams] = useState(props.value || getDefaultHTTPRequestBuilderParams())
    const [reqType, setReqType] = useState<"raw" | "template">("template");

    useEffect(()=>{
        props.setValue(params)
    }, [params])

    useEffect(()=>{
        props.onTypeChanged(reqType)
    }, [reqType])

    return <Form
        onSubmitCapture={e => {
            e.preventDefault()
        }}
        labelCol={{span: 6}} wrapperCol={{span: 18}}
    >
        <SwitchItem label={"HTTPS"} setValue={IsHttps => setParams({...params, IsHttps})} value={params.IsHttps}/>
        <SelectOne
            data={[
                {value: "raw", text: "原始请求"},
                {value: "template", text: "请求模版"},
            ]}
            oldTheme={false}
            label={"请求类型"}
            value={reqType}
            setValue={t => {
                setReqType(t)
                if (t === "raw") {
                    yakitInfo("原始请求")
                    setParams({...params, IsRawHTTPRequest: true})
                } else {
                    setParams({...params, IsRawHTTPRequest: false})
                }
            }}
        />
        {reqType === "raw" && <>
            <YakEditor
                type={"http"} noMiniMap={true} noLineNumber={true}
                valueBytes={params.RawHTTPRequest}
                setValue={s => setParams({...params, RawHTTPRequest: StringToUint8Array(s)})}
            />
        </>}
        {reqType === "template" && <>
            <InputItem
                autoComplete={[
                    "GET", "POST", "DELETE",
                    "PATCH", "HEAD", "OPTIONS",
                    "CONNECT",
                ]}
                label={"HTTP方法"}
                setValue={Method => setParams({...params, Method})}
                value={params.Method}
            />
            <ManyMultiSelectForString
                label={"请求路径"}
                value={params.Path.join(",")}
                setValue={Path => setParams({...params, Path: Path.split(",")})}
                data={[
                    "/", "/admin",
                ].map(i => {
                    return {value: i, label: i}
                })}
                mode={"tags"}
            />
            <KVInput label={"GET 参数"} setValue={GetParams => setParams({...params, GetParams})}
                     value={params.GetParams}/>
            <KVInput label={"POST 参数"} setValue={PostParams => setParams({...params, PostParams})}
                     value={params.PostParams}/>
            <KVInput label={"Header"} setValue={Headers => setParams({...params, Headers})} value={params.Headers}/>
            <KVInput label={"Cookie"} setValue={Cookie => setParams({...params, Cookie})} value={params.Cookie}/>
        </>}
    </Form>
};

interface KVInputProp {
    label: string
    value: KVPair[]
    setValue: (params: KVPair[]) => any
}

const KVInput: React.FC<KVInputProp> = (props) => {
    const [params, setParams] = useState<KVPair[]>([]);
    const [_k, setKey, getKey] = useGetState("");
    const [_v, setVal, getVal] = useGetState("");
    const [visible, setVisible] = useState(false);

    const add = useMemoizedFn(() => {
        setKey("")
        setVal("")
        setVisible(true)
    })

    return <Form.Item label={props.label} help={params.length <= 0 ? null : <Space>
        <YakitButton onClick={add}>添加新的</YakitButton>
    </Space>}>
        <YakitModal title={"设置新的 Key Value"} visible={visible} onOk={() => {
            if (getKey() === "" || getVal() === "") {
                failed("Key 或 Value 不能为空")
                return
            }
            setParams([...params, {Key: getKey(), Value: getVal()}])
            setVisible(false)
        }} onCancel={() => {
            setVisible(false)
        }}>
            <div style={{margin: 12}}>
                <Form labelCol={{span: 5}} wrapperCol={{span: 14}}
                      onSubmitCapture={e => {
                          e.preventDefault()
                      }}
                >
                    <InputItem label={"添加 Key"} value={getKey()} setValue={setKey}/>
                    <InputItem label={"添加 Value"} value={getVal()} setValue={setVal}/>
                </Form>
            </div>
        </YakitModal>
        {params.length > 0 ? <Space style={{width: "100%"}} direction={"vertical"}>
            {params.map(i => {
                return <Input disabled={true} addonBefore={i.Key} value={i.Value} addonAfter={<YakitPopconfirm
                    title={"删除当前项"}
                    onConfirm={() => {
                        setParams(params.filter(j => j !== i))
                    }}>
                    <DeleteOutlined/>
                </YakitPopconfirm>}/>
            })}
        </Space> : <YakitButton onClick={add}>添加新的</YakitButton>}
    </Form.Item>
};