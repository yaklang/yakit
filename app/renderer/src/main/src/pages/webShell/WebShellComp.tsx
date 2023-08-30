import React, {useEffect, useRef, useState} from "react"
import {Button, Form, Space} from "antd";
import {FromLayoutProps, YakScriptCreatorFormProp, YakScriptFormContent} from "@/pages/invoker/YakScriptCreator";
import {WebShellDetail} from "@/pages/webShell/models";
import {useCreation, useDebounceEffect, useGetState, useMemoizedFn} from "ahooks";
import {InputItem} from "@/utils/inputUtil";
import {YakScript} from "@/pages/invoker/schema";
import {SelectItem} from "@/utils/SelectItem";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss";
import styles from "@/pages/layout/publicMenu/MenuCodec.module.scss";
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput";
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import classNames from "classnames";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {inputHTTPFuzzerHostConfigItem} from "@/pages/fuzzer/HTTPFuzzerHosts";
import {useWatch} from "antd/lib/form/Form";
import {AdjustmentsIcon, IconSolidCodeIcon, InformationCircleIcon} from "@/assets/newIcon";
import {failed, success} from "@/utils/notification";
import {RuleContent} from "@/pages/mitm/MITMRule/MITMRuleFromModal";
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {YakEditor} from "@/utils/editors";


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
    closeModal?: () => void
    isCreate?: boolean
}

const {ipcRenderer} = window.require("electron")

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

    const [createLoading, setCreateLoading] = useState<boolean>(false)

    const createWebShell = useMemoizedFn(() => {
        setCreateLoading(true)
        console.log("createWebShell ", params)
        ipcRenderer.invoke("CreateWebShell", params).then((data: WebShellDetail) => {
            success("创建 WebShell 成功")
            setParams(data)
            if (data) {
                props.onCreated && props.onCreated(data)
                props.onChanged && props.onChanged(data)
            }
            props.closeModal && props.closeModal()
        }).catch((err) => {
            failed(`创建 WebShell 失败: ${err}`)
        }).finally(() => {
            setTimeout(() => {
                setCreateLoading(false)
            }, 200)
        })
    })
    return (
        <div>
            <Form {...fromLayout}>
                <WebShellFormContent
                    params={params}
                    setParams={setParams}
                    modified={modified}
                    setParamsLoading={setParamsLoading}
                />
                <Form.Item colon={false} label={" "}>
                    <Space>
                        <YakitButton onClick={createWebShell} loading={createLoading}>
                            添加
                        </YakitButton>
                    </Space>
                </Form.Item>
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
    const [headersStr, setHeadersStr] = useState<string>("")
    const [headers, setHeaders] = useState<{
        Key: string,
        Value: string
    }[]>([])

    useEffect(() => {
        // 如果 params.ShellScript 是空的，那么就设置它为 "jsp"
        if (!params.ShellScript) {
            setParams({...params, ShellScript: "jsp"});
        }
        if (!params.ShellType) {
            setParams({...params, ShellType: "behinder"});
        }
    }, []);
    useDebounceEffect(() => {
        if (params.Url === '') {
            // 如果 URL 是空字符串，那么就直接更新 params
            return;
        }

        try {
            // 尝试解析 URL
            const url = new URL(params.Url);

            // 获取 URL 的文件扩展名
            const urlPath = url.pathname;
            const extension = urlPath.split('.').pop();

            // 如果文件扩展名是我们支持的脚本类型之一，那么就更新 ShellScript 的值
            const scriptTypes = ['jsp', 'jspx', 'php', 'asp', 'aspx'];
            if (extension && scriptTypes.includes(extension)) {
                setParams({...params, ShellScript: extension, Url: params.Url});
            }
        } catch (error) {
            // 如果解析 URL 失败，那么就处理错误
            console.error(`Invalid URL: ${params.Url}`);
        }
    }, [params.Url]);
    return (
        <>
            <Form.Item label={"Shell 类型"} required={true} rules={[{required: true, message: "该项为必填"}]}>
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
                label={"密钥"}
                setValue={(SecretKey) => setParams({...params, SecretKey})}
                value={params.SecretKey}
                disable={disabled}
            />
            {showSecret && (
                <>
                    <InputItem
                        label={"密码"}
                        setValue={(Pass) => setParams({...params, Pass})}
                        value={params.Pass}
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
            <Form.Item label={"编解码器"} name={"CustomCodec"}>
                <YakitInput
                    {...params}
                    // value={rule}
                    placeholder='可用右侧辅助工具，自动生成正则'
                    addonAfter={
                        <IconSolidCodeIcon className={styles["icon-adjustments"]} onClick={
                            () => {
                                const m = showYakitModal(
                                    {
                                        title: '编解码器',
                                        subTitle: "用户可用自定义编解码器",
                                        onCancel: () => {
                                            console.log("asfasfas")
                                            m.destroy()
                                        },
                                        footer: null,
                                        closable: true,
                                        content: <YakEditor value={"xxxxx"}/>
                                    }
                                )
                            }
                        }
                        />
                    }
                    onChange={(e) => {
                        const {value} = e.target
                        // setRule(value)
                        // getRule(value)
                    }}
                />
            </Form.Item>

            <Form.Item label={"Headers"} name='headers' initialValue={[]}>
                <div className={styles["menu-codec-wrapper"]}>
                    <div className={styles["input-textarea-wrapper"]}>
                        <YakitInput.TextArea
                            className={styles["input-textarea-body"]}
                            value={headersStr}
                            onChange={(e) => {
                                setHeadersStr(e.target.value);
                                const lines = e.target.value.split('\n');
                                const newHeaders = lines.map(line => {
                                    const [key, ...rest] = line.split(':');
                                    const value = rest.join(':').trim();
                                    return {Key: key.trim(), Value: value};
                                });
                                setHeaders(newHeaders);
                            }}
                            spellCheck={false}
                            placeholder={"自定义请求头,例如: User-Agent: Yakit/1.0.0"}
                        />
                        <div className={styles["input-textarea-copy"]}>
                            <CopyComponents
                                className={classNames(styles["copy-icon-style"], {[styles["copy-icon-ban"]]: !headersStr})}
                                copyText={headersStr}
                                iconColor={!!headersStr ? "#85899e" : "#ccd2de"}
                            />
                        </div>
                    </div>
                </div>
            </Form.Item>

            <Form.Item
                label={"设置代理"}
                name='proxy'
            >
                <YakitSelect
                    allowClear
                    options={[
                        {
                            label: "http://127.0.0.1:8080",
                            value: "http://127.0.0.1:8080"
                        },
                        {
                            label: "http://127.0.0.1:8083",
                            value: "http://127.0.0.1:8083"
                        }, {
                            label: "http://127.0.0.1:9999",
                            value: "http://127.0.0.1:9999"
                        }
                    ]}
                    placeholder='请输入...'
                    mode='tags'
                    maxTagCount={3}
                />
            </Form.Item>

            <InputItem
                label={"备注"}
                setValue={(Remark) => setParams({...params, Remark})}
                value={params.Remark}
                disable={disabled}
            />
        </>
    )
}