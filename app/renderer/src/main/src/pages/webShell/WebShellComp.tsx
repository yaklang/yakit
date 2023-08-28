import React, {useEffect, useRef, useState} from "react"
import {Form} from "antd";
import {FromLayoutProps, YakScriptCreatorFormProp, YakScriptFormContent} from "@/pages/invoker/YakScriptCreator";
import {WebShellDetail} from "@/pages/webShell/models";
import {useCreation, useGetState} from "ahooks";
import {InputItem} from "@/utils/inputUtil";
import {YakScript} from "@/pages/invoker/schema";
import {SelectItem} from "@/utils/SelectItem";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss";


export const RemarkDetail = ({remark}) => {

    return (
        <div style={{width: "100%"}}>
            <div>{remark}</div>
        </div>
    )
}

export interface WebShellCreatorFormProp {
    onCreated?: (i: WebShellDetail) => any
    modified?: WebShellDetail
    onChanged?: (i: WebShellDetail) => any
    fromLayout?: FromLayoutProps
    noClose?: boolean
    showButton?: boolean
    setScript?: (i: WebShellDetail) => any
    isCreate?: boolean
}

export const WebShellCreatorForm: React.FC<WebShellCreatorFormProp> = (props) => {
    const defFromLayout = useCreation(() => {
        const col: FromLayoutProps = {
            labelCol: {span: 5},
            wrapperCol: {span: 14}
        }
        return col
    }, [])
    const [fromLayout, setFromLayout] = useState<FromLayoutProps>(defFromLayout)

    const [params, setParams, getParams] = useGetState<WebShellDetail>(props.modified || {} as WebShellDetail)
    const [paramsLoading, setParamsLoading] = useState(false)

    const [modified, setModified] = useState<WebShellDetail | undefined>(props.modified)

    return (
        <div>
            < Form {...fromLayout}>
                <WebShellFormContent
                    params={params}
                    setParams={setParams}
                    modified={modified}
                    setParamsLoading={setParamsLoading}
                />
            </Form>
        </div>

    )
}

interface WebShellFormContentProps {
    params: WebShellDetail
    setParams: (y: WebShellDetail) => void
    modified?: WebShellDetail | undefined
    setParamsLoading?: (b: boolean) => void
    isShowAuthor?: boolean
    disabled?: boolean
}

const WebShellFormContent: React.FC<WebShellFormContentProps> = (props) => {
    const {params, modified, setParams, setParamsLoading, isShowAuthor = true, disabled} = props
    const [showSecret, setShowSecret] = useState(false);
    return (
        <>
            <Form.Item label={"Shell 类型"} required={true}>
                <YakitSelect
                    value={params.ShellType || "behinder"}
                    onSelect={(val) => {
                        console.log(val)
                        setParams({...params, ShellType: val})
                        setShowSecret(val === "godzilla")
                    }}
                >
                    <YakitSelect.Option value='behinder'>Behinder</YakitSelect.Option>
                    <YakitSelect.Option value='godzilla'>Godzilla</YakitSelect.Option>
                </YakitSelect>
            </Form.Item>
            <InputItem
                label={"URL"}
                required={true}
                setValue={(Url) => setParams({...params, Url})}
                value={params.Url}
                disable={disabled}
            />
            <Form.Item label={"脚本类型"}>
                <YakitSelect
                    value={params.ShellScript || "jsp"}
                    onSelect={(val) => {
                        setParams({...params, ShellScript: val})
                    }}
                >
                    <YakitSelect.Option value='jsp'>JSP</YakitSelect.Option>
                    <YakitSelect.Option value='jspx'>JSPX</YakitSelect.Option>
                    <YakitSelect.Option value='php'>PHP</YakitSelect.Option>
                    <YakitSelect.Option value='asp'>ASP</YakitSelect.Option>
                    <YakitSelect.Option value='aspx'>ASPX</YakitSelect.Option>
                </YakitSelect>
            </Form.Item>
            <InputItem
                label={"参数"}
                setValue={(Pass) => setParams({...params, Pass})}
                value={params.Pass}
                disable={disabled}
            />

            {showSecret && (
                <>
                    <InputItem
                        label={"密钥"}
                        setValue={(SecretKey) => setParams({...params, SecretKey})}
                        value={params.SecretKey}
                        disable={disabled}
                    />
                    <Form.Item label={"加密模式"}>
                        <YakitSelect
                            value={params.EncMode || ""}
                            onSelect={(val) => {
                                setParams({...params, EncMode: val});
                            }}
                        >
                            <YakitSelect.Option value='base64'>Base64</YakitSelect.Option>
                            <YakitSelect.Option value='raw'>Raw</YakitSelect.Option>
                        </YakitSelect>
                    </Form.Item>
                </>
            )}


            <InputItem
                label={"备注"}
                setValue={(Remark) => setParams({...params, Remark})}
                value={params.Remark}
                disable={disabled}
            />
        </>
    )
}