import React, {useEffect, useMemo, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {ManyMultiSelectForString, SelectOne, SwitchItem} from "@/utils/inputUtil"
import {Divider, Form, Popconfirm, Space, Upload} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {yakitInfo, warn, failed} from "@/utils/notification"
import {AutoSpin} from "@/components/AutoSpin"
import {setTimeout} from "timers"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import styles from "./ConfigNetworkPage.module.scss"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {InputCertificateForm} from "@/pages/mitm/MITMServerStartForm/MITMAddTLS"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {CloseIcon, RectangleFailIcon, RectangleSucceeIcon, UnionIcon} from "./icon"
import {SolidCheckCircleIcon, SolidLockClosedIcon} from "@/assets/icon/solid"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import classNames from "classnames"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"

export interface ConfigNetworkPageProp {}

export interface GlobalNetworkConfig {
    DisableSystemDNS: boolean
    CustomDNSServers: string[]
    DNSFallbackTCP: boolean
    DNSFallbackDoH: boolean
    CustomDoHServers: string[]

    ClientCertificates?: ClientCertificates[]

    DisallowIPAddress: string[]
    DisallowDomain: string[]
    GlobalProxy: string[]
    EnableSystemProxyFromEnv: boolean
}

export interface IsSetGlobalNetworkConfig {
    Pkcs12Bytes: Uint8Array
    Pkcs12Password?: Uint8Array
}

interface ClientCertificatePem {
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
}

interface ClientCertificatePfx {
    name: string
    Pkcs12Bytes: Uint8Array
    Pkcs12Password: Uint8Array
}

interface ClientCertificates {
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
    Pkcs12Bytes: Uint8Array
    Pkcs12Password: Uint8Array
}

const {ipcRenderer} = window.require("electron")

const defaultParams: GlobalNetworkConfig = {
    DisableSystemDNS: false,
    CustomDNSServers: [],
    DNSFallbackTCP: false,
    DNSFallbackDoH: false,
    CustomDoHServers: [],
    DisallowIPAddress: [],
    DisallowDomain: [],
    GlobalProxy: [],
    EnableSystemProxyFromEnv: false
}

export const ConfigNetworkPage: React.FC<ConfigNetworkPageProp> = (props) => {
    const [params, setParams] = useState<GlobalNetworkConfig>(defaultParams)
    const [certificateParams, setCertificateParams] = useState<ClientCertificatePfx[]>()
    const currentIndex = useRef<number>(0)
    const [format, setFormat] = useState<1 | 2>(1)
    const cerFormRef = useRef<any>()
    const [loading, setLoading] = useState(false)
    const isShowLoading = useRef<boolean>(true)
    const update = useMemoizedFn(() => {
        isShowLoading.current && setLoading(true)
        isShowLoading.current = false
        // setParams(defaultParams)
        ipcRenderer.invoke("GetGlobalNetworkConfig", {}).then((rsp: GlobalNetworkConfig) => {
            console.log("GetGlobalNetworkConfig", rsp)
            const {ClientCertificates} = rsp
            if (Array.isArray(ClientCertificates) && ClientCertificates.length > 0 && format === 1) {
                let newArr = ClientCertificates.map((item, index) => {
                    const {Pkcs12Bytes, Pkcs12Password} = item
                    return {Pkcs12Bytes, Pkcs12Password, name: `证书${index + 1}`}
                })
                setCertificateParams(newArr)
                currentIndex.current = ClientCertificates.length
            }
            setParams({...params, ...rsp})
            setLoading(false)
        })
    })
    useEffect(() => {
        update()
    }, [format])

    const onCertificate = useMemoizedFn((file: any) => {
        if (!["application/x-pkcs12"].includes(file.type)) {
            warn("仅支持格式为：application/x-pkcs12")
            return false
        }
        ipcRenderer
            .invoke("fetch-file-content", file.path)
            .then((res) => {
                // 验证证书是否需要密码
                ipcRenderer
                    .invoke("IsSetGlobalNetworkConfigPassWord", {
                        Pkcs12Bytes: StringToUint8Array(res)
                    } as IsSetGlobalNetworkConfig)
                    .then((result:boolean) => {
                        console.log("ddd",result);
                        
                    })
                // currentIndex.current += 1
                // setCertificateParams([
                //     ...(certificateParams || []),
                //     {
                //         name: `证书${currentIndex.current}`,
                //         Pkcs12Bytes: StringToUint8Array(res),
                //         Pkcs12Password: new Uint8Array()
                //     }
                // ])
            })
            .catch(() => {
                failed("无法获取该文件内容，请检查后后重试！")
            })
        return false
    })

    const ipcSubmit = useMemoizedFn((params: GlobalNetworkConfig) => {
        console.log("SetGlobalNetworkConfig", params)

        ipcRenderer.invoke("SetGlobalNetworkConfig", params).then(() => {
            yakitInfo("更新配置成功")
            update()
        })
    })

    const submit = useMemoizedFn((e) => {
        e.preventDefault()
        if (format === 1) {
            if (!certificateParams) {
                warn("请添加证书")
                return
            }
            const obj: ClientCertificatePem = {
                CaCertificates: [],
                CrtPem: new Uint8Array(),
                KeyPem: new Uint8Array()
            }
            const ClientCertificates = certificateParams.map((item) => {
                const {Pkcs12Bytes, Pkcs12Password} = item
                return {Pkcs12Bytes, Pkcs12Password, ...obj}
            })
            const newParams: GlobalNetworkConfig = {...params, ClientCertificates}
            ipcSubmit(newParams)
        }
        if (format === 2) {
            cerFormRef.current.validateFields().then((values) => {
                const obj: ClientCertificatePem = {
                    CaCertificates:
                        values.CaCertificates && values.CaCertificates.length > 0
                            ? [StringToUint8Array(values.CaCertificates)]
                            : [],
                    CrtPem: StringToUint8Array(values.CrtPem),
                    KeyPem: StringToUint8Array(values.CrtPem)
                }
                const newParams: GlobalNetworkConfig = {
                    ...params,
                    ClientCertificates: [{...obj, Pkcs12Bytes: new Uint8Array(), Pkcs12Password: new Uint8Array()}]
                }
                ipcSubmit(newParams)
            })
        }
    })

    const failCard = useMemoizedFn(() => {
        return (
            <div className={classNames(styles["certificate-card"], styles["certificate-fail"])}>
                <div className={styles["decorate"]}>
                    <RectangleFailIcon />
                </div>
                <div className={styles["card-hide"]}></div>
                <div className={styles["fail-main"]}>
                    <div
                        className={styles["close"]}
                        onClick={() => {
                            console.log("del")
                        }}
                    >
                        <CloseIcon />
                    </div>
                    <div className={styles["title"]}>证书 1</div>
                    <SolidLockClosedIcon />
                    <div className={styles["content"]}>未解密</div>
                    <YakitButton
                        type='outline2'
                        onClick={() => {
                            const m = showYakitModal({
                                title: "密码解锁",
                                content: (
                                    <div style={{padding: 20}}>
                                        <YakitInput.Password placeholder='请输入证书密码' allowClear />
                                    </div>
                                ),
                                onCancel: () => {
                                    m.destroy()
                                },
                                onOk: () => {
                                    console.log("submit")
                                },
                                width: 400
                            })
                        }}
                    >
                        密码解锁
                    </YakitButton>
                </div>
            </div>
        )
    })

    const succeeCard = useMemoizedFn(() => {
        return (
            <div className={classNames(styles["certificate-card"], styles["certificate-succee"])}>
                <div className={styles["decorate"]}>
                    <RectangleSucceeIcon />
                </div>
                <div className={styles["union"]}>
                    <UnionIcon />
                </div>
                <div className={styles["card-hide"]}></div>

                <div className={styles["success-main"]}>
                    <div
                        className={styles["close"]}
                        onClick={() => {
                            console.log("del")
                        }}
                    >
                        <CloseIcon />
                    </div>
                    <div className={styles["title"]}>证书 2</div>
                    <SolidCheckCircleIcon />
                    <div className={styles["content"]}>可用</div>
                    <div className={styles["password"]}>******</div>
                </div>
            </div>
        )
    })

    const certificateList = useMemo(() => {
        return (
            <div className={styles["certificate-box"]}>
                {Array.isArray(certificateParams) &&
                    certificateParams.map((item, index) => {
                        return (
                            <div className={styles["certificate-item"]}>
                                <div className={styles["certificate-path"]}>{item.name}：</div>
                                <div className={styles["input-box"]}>
                                    <YakitInput
                                        placeholder='请输入证书密码'
                                        allowClear
                                        size='small'
                                        value={item?.Pkcs12Password && Uint8ArrayToString(item.Pkcs12Password)}
                                        onChange={(e) => {
                                            const {value} = e.target
                                            certificateParams[index].Pkcs12Password =
                                                value.length > 0 ? StringToUint8Array(value) : new Uint8Array()
                                            let cache: ClientCertificatePfx[] = cloneDeep(certificateParams)
                                            setCertificateParams(cache)
                                        }}
                                    />
                                </div>

                                <RemoveIcon
                                    onClick={() => {
                                        let cache: ClientCertificatePfx[] = certificateParams.filter(
                                            (itemIn) => item.name !== itemIn.name
                                        )
                                        setCertificateParams(cache)
                                    }}
                                />
                            </div>
                        )
                    })}
                {failCard()}
                {succeeCard()}
            </div>
        )
    }, [certificateParams])

    return (
        <AutoCard style={{height: "auto"}}>
            <AutoSpin spinning={loading} tip='网络配置加载中...'>
                {params && (
                    <Form
                        size={"small"}
                        labelCol={{span: 5}}
                        wrapperCol={{span: 14}}
                        onSubmitCapture={(e) => submit(e)}
                    >
                        <Divider orientation={"left"} style={{marginTop: "0px"}}>
                            DNS 配置
                        </Divider>
                        <SwitchItem
                            label={"禁用系统 DNS"}
                            setValue={(DisableSystemDNS) => setParams({...params, DisableSystemDNS})}
                            value={params.DisableSystemDNS}
                            oldTheme={false}
                        />
                        <ManyMultiSelectForString
                            label={"备用 DNS"}
                            setValue={(CustomDNSServers) =>
                                setParams({...params, CustomDNSServers: CustomDNSServers.split(",")})
                            }
                            value={params.CustomDNSServers.join(",")}
                            data={[]}
                            mode={"tags"}
                        />
                        <SwitchItem
                            label={"启用 TCP DNS"}
                            setValue={(DNSFallbackTCP) => setParams({...params, DNSFallbackTCP})}
                            value={params.DNSFallbackTCP}
                            oldTheme={false}
                        />
                        <SwitchItem
                            label={"启用 DoH 抗污染"}
                            setValue={(DNSFallbackDoH) => setParams({...params, DNSFallbackDoH})}
                            value={params.DNSFallbackDoH}
                            oldTheme={false}
                        />
                        {params.DNSFallbackDoH && (
                            <ManyMultiSelectForString
                                label={"备用 DoH"}
                                setValue={(data) => setParams({...params, CustomDoHServers: data.split(",")})}
                                value={params.CustomDoHServers.join(",")}
                                data={[]}
                                mode={"tags"}
                            />
                        )}
                        <Divider orientation={"left"} style={{marginTop: "0px"}}>
                            其他配置
                        </Divider>
                        <Form.Item label={"禁用IP"}>
                            <YakitInput.TextArea
                                autoSize={{minRows: 1, maxRows: 3}}
                                allowClear
                                size='small'
                                value={params.DisallowIPAddress.join(",")}
                                onChange={(e) => {
                                    const {value} = e.target
                                    setParams({...params, DisallowIPAddress: value.split(",")})
                                }}
                            />
                        </Form.Item>
                        <Form.Item label={"禁用域名"}>
                            <YakitInput.TextArea
                                autoSize={{minRows: 1, maxRows: 3}}
                                allowClear
                                size='small'
                                value={params.DisallowDomain.join(",")}
                                onChange={(e) => {
                                    const {value} = e.target
                                    setParams({...params, DisallowDomain: value.split(",")})
                                }}
                            />
                        </Form.Item>
                        <Form.Item label={"全局代理"}>
                            <YakitInput
                                allowClear
                                size='small'
                                value={params.GlobalProxy.join(",")}
                                onChange={(e) => {
                                    const {value} = e.target
                                    setParams({...params, GlobalProxy: value.split(",")})
                                }}
                            />
                        </Form.Item>
                        <Form.Item
                            label={"系统代理"}
                            tooltip='开启以后如未配置代理，会默认走系统代理；如配置其他代理，其优先级高于系统代理'
                        >
                            <YakitSwitch
                                checked={params.EnableSystemProxyFromEnv}
                                onChange={(EnableSystemProxyFromEnv) =>
                                    setParams({...params, EnableSystemProxyFromEnv})
                                }
                            />
                        </Form.Item>
                        <Divider orientation={"left"} style={{marginTop: "0px"}}>
                            TLS 客户端证书（双向认证）
                        </Divider>
                        <Form.Item label={"选择格式"}>
                            <YakitRadioButtons
                                size='small'
                                value={format}
                                onChange={(e) => {
                                    setFormat(e.target.value)
                                }}
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: 1,
                                        label: "p12/pfx 格式"
                                    },
                                    {
                                        value: 2,
                                        label: "pem 格式"
                                    }
                                ]}
                            />
                        </Form.Item>
                        {format === 1 && (
                            <>
                                <Form.Item label={"添加证书"}>
                                    {/*
                                    PEM: 3 - CERT / KEY / CA-CERT
                                    PKCS12(P12/PFX)(.p12 .pfx): File + Password
                                */}
                                    <Upload
                                        accept={".p12,.pfx"}
                                        multiple={false}
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(file) => onCertificate(file)}
                                    >
                                        <YakitButton type={"outline2"}>添加 TLS 客户端证书</YakitButton>
                                    </Upload>
                                    {certificateList}
                                </Form.Item>
                            </>
                        )}
                        {format === 2 && (
                            <InputCertificateForm
                                ref={cerFormRef}
                                isShowCerName={false}
                                formProps={{
                                    labelCol: {span: 5},
                                    wrapperCol: {span: 14}
                                }}
                            />
                        )}

                        <Form.Item colon={false} label={" "}>
                            <Space>
                                <YakitButton type='primary' htmlType='submit'>
                                    更新全局网络配置
                                </YakitButton>
                                <YakitPopconfirm
                                    title={"确定需要重置网络配置吗？"}
                                    onConfirm={() => {
                                        ipcRenderer.invoke("ResetGlobalNetworkConfig", {}).then(() => {
                                            yakitInfo("重置配置成功")
                                        })
                                    }}
                                    placement='top'
                                >
                                    <YakitButton type='outline1'> 重置网络配置 </YakitButton>
                                </YakitPopconfirm>
                            </Space>
                        </Form.Item>
                    </Form>
                )}
            </AutoSpin>
        </AutoCard>
    )
}
