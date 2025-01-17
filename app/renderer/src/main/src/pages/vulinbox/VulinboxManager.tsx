import React, {useEffect, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {EngineConsole} from "@/pages/engineConsole/EngineConsole"
import {failed, info, success} from "@/utils/notification"
import {Alert, Form, Progress, Space, Tag} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {randomString} from "@/utils/randomUtil"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ExecResult} from "@/pages/invoker/schema"
import {Uint8ArrayToString} from "@/utils/str"
import {useGetState, useUpdateEffect} from "ahooks"
import styles from "@/pages/screenRecorder/ScreenRecorderPage.module.scss"
import {ChromeSvgIcon} from "@/assets/newIcon"
import {ReloadOutlined} from "@ant-design/icons"
import {openExternalWebsite} from "@/utils/openWebsite"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {setClipboardText} from "@/utils/clipboard"
import {grpcFetchLatestOSSDomain} from "@/apiUtils/grpc"
export interface VulinboxManagerProp {}

const {ipcRenderer} = window.require("electron")
export const VulinboxManager: React.FC<VulinboxManagerProp> = (props) => {
    const [available, setAvailable] = useState(false)
    const [started, setStarted] = useState(false)
    const [token, setToken] = useState(randomString(60))
    const [currentParams, setCurrentParams] = useState<StartVulinboxParams>({
        Host: "127.0.0.1",
        Port: 8787,
        NoHttps: true,
        SafeMode: false
    })
    const [ossDomain, setOSSDomain] = useState<string>("")

    useEffect(() => {
        grpcFetchLatestOSSDomain().then(setOSSDomain)
    }, [])

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {})
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[StartVulinbox] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[StartVulinbox] finished")
            setTimeout(() => setStarted(false), 300)
        })
        return () => {
            ipcRenderer.invoke("cancel-StartVulinbox", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const checkVulinboxReady = () => {
        ipcRenderer
            .invoke("IsVulinboxReady", {})
            .then((res) => {
                if (res.Ok) {
                    setAvailable(true)
                } else {
                    failed(res.Reason)
                    setAvailable(false)
                }
            })
            .catch((e) => {
                failed(`${e}`)
                setAvailable(false)
            })
    }

    const timer = useRef<NodeJS.Timeout | null>()

    useEffect(() => {
        // 初始检查
        checkVulinboxReady()

        if (timer.current) {
            clearInterval(timer.current)
            timer.current = null
        }
        // 设置定时器
        timer.current = setInterval(() => {
            checkVulinboxReady()
        }, 3000) // 每3秒检查一次

        return () => {
            timer.current && clearInterval(timer.current)
            ipcRenderer.invoke("cancel-StartVulinbox", token)
        }
    }, [])

    useUpdateEffect(() => {
        if (timer.current) {
            clearInterval(timer.current)
            timer.current = null
        }
        let wait: number = 3000
        if (available) {
            // 每10秒检查一次
            wait = 10000
        } else {
            // 每3秒检查一次
            wait = 3000
        }
        timer.current = setInterval(() => {
            checkVulinboxReady()
        }, wait)
    }, [available])

    return (
        <div style={{height: "100%", width: "100%", overflow: "hidden"}}>
            <AutoCard
                size={"small"}
                bordered={true}
                title={
                    <Space>
                        <div>Vulinbox 管理器</div>
                        {available ? (
                            <>
                                <Tag color={"green"}>安装成功</Tag>
                                {started && currentParams && (
                                    <YakitButton
                                        type='outline2'
                                        onClick={() => {
                                            info("使用 Chrome 打开靶场")
                                            openExternalWebsite(
                                                `${
                                                    currentParams?.NoHttps ? "http://" : "https//"
                                                }${currentParams?.Host}:${currentParams?.Port}`
                                            )
                                        }}
                                    >
                                        <ChromeSvgIcon />
                                    </YakitButton>
                                )}
                            </>
                        ) : (
                            <Tag color={"red"}>未安装</Tag>
                        )}
                        <YakitButton
                            type='text'
                            onClick={() => {
                                checkVulinboxReady()
                            }}
                            icon={<ReloadOutlined />}
                        />
                        {available &&
                            (started ? (
                                <YakitPopconfirm
                                    title={"确定要关闭靶场进程吗？"}
                                    onConfirm={() => {
                                        ipcRenderer.invoke("cancel-StartVulinbox", token).then(() => {
                                            setStarted(false)
                                        })
                                    }}
                                >
                                    <YakitButton colors='danger'>关闭靶场</YakitButton>
                                </YakitPopconfirm>
                            ) : (
                                <YakitButton
                                    type={"primary"}
                                    onClick={() => {
                                        const m = showYakitModal({
                                            title: "启动靶场参数",
                                            width: "50%",
                                            footer: <div style={{height: 30}} />,
                                            content: (
                                                <div style={{marginTop: 20, marginLeft: 20, marginBottom: 30}}>
                                                    <VulinboxStart
                                                        onSubmit={(param) => {
                                                            ipcRenderer
                                                                .invoke("StartVulinbox", param, token)
                                                                .then(() => {
                                                                    setCurrentParams(param)
                                                                    info("启动靶场成功")
                                                                    setStarted(true)
                                                                    m.destroy()
                                                                })
                                                                .catch((e) => {
                                                                    failed(`${e}`)
                                                                })
                                                        }}
                                                        params={{
                                                            Host: "127.0.0.1",
                                                            Port: 8787,
                                                            NoHttps: true,
                                                            SafeMode: false
                                                        }}
                                                    />
                                                </div>
                                            )
                                        })
                                    }}
                                >
                                    启动靶场
                                </YakitButton>
                            ))}
                    </Space>
                }
                bodyStyle={{padding: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "row"}}
                extra={
                    <Space>
                        <YakitPopconfirm
                            title={"将从互联网下载靶场程序并安装"}
                            onConfirm={() => {
                                const m = showYakitModal({
                                    title: "安装靶场",
                                    width: "50%",
                                    height: 500,
                                    onOk: () => {
                                        m.destroy()
                                    },
                                    cancelButtonProps: {hidden: true},
                                    content: (
                                        <div style={{margin: 24}}>
                                            <InstallVulinboxPrompt
                                                onFinished={() => {
                                                    m.destroy()
                                                    checkVulinboxReady()
                                                }}
                                            />
                                        </div>
                                    )
                                })
                            }}
                        >
                            <YakitButton type={"outline1"}>安装/升级靶场</YakitButton>
                        </YakitPopconfirm>
                        <YakitButton
                            type='text'
                            onClick={() => {
                                showYakitModal({
                                    title: "靶场下载地址",
                                    content: (
                                        <div style={{margin: 20, overflowX: "auto"}}>
                                            {[
                                                {
                                                    name: "Windows",
                                                    url: `https://${ossDomain}/vulinbox/latest/vulinbox_windows_amd64.exe`
                                                },
                                                {
                                                    name: "Linux",
                                                    url: `https://${ossDomain}/vulinbox/latest/vulinbox_linux_amd64`
                                                },
                                                {
                                                    name: "MacOS",
                                                    url: `https://${ossDomain}/vulinbox/latest/vulinbox_darwin_amd64`
                                                }
                                            ].map((item) => (
                                                <div
                                                    key={item.name}
                                                    style={{
                                                        marginBottom: 12,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8
                                                    }}
                                                >
                                                    <span style={{width: 80, flexShrink: 0}}>{item.name}:</span>
                                                    <code
                                                        style={{
                                                            flex: 1,
                                                            backgroundColor: "#f5f5f5",
                                                            padding: "4px 8px",
                                                            borderRadius: 4,
                                                            whiteSpace: "nowrap",
                                                            cursor: "pointer"
                                                        }}
                                                        onClick={() => {
                                                            setClipboardText(item.url, {
                                                                hiddenHint: false,
                                                                hintText: "复制成功"
                                                            })
                                                        }}
                                                        title='点击复制'
                                                    >
                                                        {item.url}
                                                    </code>
                                                    <YakitButton
                                                        type='text'
                                                        onClick={() => {
                                                            setClipboardText(item.url, {
                                                                hiddenHint: false,
                                                                hintText: "复制成功"
                                                            })
                                                        }}
                                                        title='点击复制'
                                                    >
                                                        复制
                                                    </YakitButton>
                                                </div>
                                            ))}
                                        </div>
                                    ),
                                    footer: null
                                })
                            }}
                        >
                            查看下载地址
                        </YakitButton>
                    </Space>
                }
            >
                <div style={{flex: 1, overflow: "hidden", maxHeight: "100%"}}>
                    <YakitResizeBox
                        isVer={false}
                        firstNode={
                            <div style={{marginBottom: 8, overflow: "auto", height: "100%"}}>
                                <Alert
                                    type='info'
                                    message={
                                        <div>
                                            <h2 style={{fontSize: 18, fontWeight: 600, marginBottom: 16}}>
                                                Vulinbox Agent - Web安全漏洞靶场
                                            </h2>
                                            <p style={{marginBottom: 16}}>
                                                Vulinbox 是一个精心设计的 Web
                                                安全漏洞靶场，它模拟了各类真实场景中可能出现的安全漏洞，为安全研究人员和渗透测试工程师提供了一个理想的学习和实践平台。
                                            </p>

                                            <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                                                漏洞类型覆盖
                                            </h3>
                                            <div
                                                style={{
                                                    marginBottom: 16,
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    flexWrap: "wrap",
                                                    gap: 16
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "calc(50% - 8px)",
                                                        backgroundColor: "#f7f7f7",
                                                        padding: 16,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            1. 注入类漏洞
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>SQL 注入漏洞环境</li>
                                                            <li>XSS 跨站脚本演练场景</li>
                                                            <li>SSRF 服务器端请求伪造环境</li>
                                                            <li>命令注入漏洞复现</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            2. 身份认证漏洞
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>Cookie 安全问题模拟</li>
                                                            <li>JWT 令牌安全场景</li>
                                                            <li>会话管理缺陷演示</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            3. 协议层漏洞
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>WebSocket 安全问题模拟</li>
                                                            <li>HTTP 协议缺陷环境</li>
                                                            <li>DNS 安全问题演示</li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div
                                                    style={{
                                                        width: "calc(50% - 8px)",
                                                        backgroundColor: "#f7f7f7",
                                                        padding: 16,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            4. 加密算法缺陷
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>AES/ECB 模式安全问题</li>
                                                            <li>RSA 算法应用缺陷</li>
                                                            <li>Base64 编码滥用场景</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            5. API 接口漏洞
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>OpenAPI/Swagger 相关漏洞</li>
                                                            <li>RESTful API 安全问题</li>
                                                            <li>JSON 解析漏洞</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>平台特色</h3>
                                            <div style={{display: "flex", gap: 16, marginBottom: 16}}>
                                                <div
                                                    style={{
                                                        width: "calc(50% - 8px)",
                                                        backgroundColor: "#f7f7f7",
                                                        padding: 16,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    <div style={{marginBottom: 8}}>
                                                        <b>1. 教学性</b>
                                                        <ul style={{paddingLeft: 24, margin: "4px 0"}}>
                                                            <li>每个漏洞场景都有详细说明</li>
                                                            <li>提供漏洞原理和利用方法</li>
                                                        </ul>
                                                    </div>
                                                    <div style={{marginBottom: 8}}>
                                                        <b>2. 真实性</b>
                                                        <ul style={{paddingLeft: 24, margin: "4px 0"}}>
                                                            <li>模拟真实业务场景</li>
                                                            <li>还原实际漏洞环境</li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div
                                                    style={{
                                                        width: "calc(50% - 8px)",
                                                        backgroundColor: "#f7f7f7",
                                                        padding: 16,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    <div style={{marginBottom: 8}}>
                                                        <b>3. 系统性</b>
                                                        <ul style={{paddingLeft: 24, margin: "4px 0"}}>
                                                            <li>漏洞类型覆盖全面</li>
                                                            <li>难度梯度合理</li>
                                                        </ul>
                                                    </div>
                                                    <div style={{marginBottom: 8}}>
                                                        <b>4. 实践性</b>
                                                        <ul style={{paddingLeft: 24, margin: "4px 0"}}>
                                                            <li>支持动手操作</li>
                                                            <li>即时反馈结果</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>适用人群</h3>
                                            <ul style={{paddingLeft: 24, margin: 0}}>
                                                <li>网络安全初学者</li>
                                                <li>安全测试工程师</li>
                                                <li>开发人员安全意识培训</li>
                                                <li>安全研究人员</li>
                                            </ul>

                                            <div
                                                style={{
                                                    marginTop: 16,
                                                    padding: 12,
                                                    backgroundColor: "#f5f5f5",
                                                    borderRadius: 4
                                                }}
                                            >
                                                这是一个非常实用的安全学习平台，它不仅提供了丰富的漏洞环境，还能帮助使用者系统地理解和掌握各类
                                                Web
                                                安全漏洞。对于想要提升安全测试能力或加深安全理解的人来说，这是一个理想的练习环境。
                                            </div>
                                        </div>
                                    }
                                />
                            </div>
                        }
                        secondNode={
                            <div style={{height: "100%", maxHeight: "100%"}}>
                                <EngineConsole />
                            </div>
                        }
                    />
                </div>
            </AutoCard>
        </div>
    )
}

interface StartVulinboxParams {
    Host: string
    Port: number
    NoHttps: boolean
    SafeMode: boolean
}

interface VulinboxStartProp {
    params: StartVulinboxParams
    setParams?: (p: StartVulinboxParams) => any
    onSubmit: (p: StartVulinboxParams) => any
}

const VulinboxStart: React.FC<VulinboxStartProp> = (props) => {
    const [params, setParams] = useState<StartVulinboxParams>(props.params)

    return (
        <Form
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
            onSubmitCapture={(e) => {
                e.preventDefault()
                props.onSubmit(params)
            }}
            size={"small"}
        >
            <Form.Item label={"Host"}>
                <YakitInput value={params.Host} onChange={(e) => setParams({...params, Host: e.target.value})} />
            </Form.Item>

            <Form.Item label={"Port"}>
                <YakitInputNumber
                    value={params.Port}
                    onChange={(value) => setParams({...params, Port: Number(value) || 0})}
                />
            </Form.Item>

            <Form.Item label={"不启用 HTTPS"}>
                <YakitSwitch
                    checked={params.NoHttps}
                    onChange={(checked) => setParams({...params, NoHttps: checked})}
                />
            </Form.Item>

            <Form.Item label={"安全模式"} help={"不启用命令注入类操作系统的靶场"}>
                <YakitSwitch
                    checked={params.SafeMode}
                    onChange={(checked) => setParams({...params, SafeMode: checked})}
                />
            </Form.Item>

            <Form.Item colon={false} label={" "}>
                <YakitButton style={{marginBottom: 8}} type='primary' htmlType='submit'>
                    {" "}
                    启动靶场{" "}
                </YakitButton>
            </Form.Item>
        </Form>
    )
}

export interface InstallVulinboxPromptProp {
    onFinished: () => any
}

export const InstallVulinboxPrompt: React.FC<InstallVulinboxPromptProp> = (props) => {
    const [token, setToken] = useState(randomString(60))
    const [data, setData, getData] = useGetState<string[]>([])
    const [percent, setPercent] = useState(0)

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            if (data.Progress > 0) {
                setPercent(Math.ceil(data.Progress))
                return
            }
            if (!data.IsMessage) {
                return
            }
            setData([...getData(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[InstallVulinbox] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[InstallVulinbox] finished")
            props.onFinished()
        })
        return () => {
            ipcRenderer.invoke("cancel-InstallVulinbox", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        ipcRenderer.invoke("InstallVulinbox", {}, token).then(() => {
            success("正在安装 Vulinbox")
            setLoading(true)
        })
        return () => {
            ipcRenderer.invoke("cancel-InstallVulinbox", token)
        }
    }, [])

    return (
        <Space direction={"vertical"}>
            <div className={styles["download-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={percent}
                    format={(percent) => `已下载 ${percent}%`}
                />
            </div>
            <div className={styles["download-progress-messages"]}>
                {data.map((i) => {
                    return <p>{i}</p>
                })}
            </div>
        </Space>
    )
}
