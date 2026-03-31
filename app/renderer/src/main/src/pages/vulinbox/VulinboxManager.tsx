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
import classNames from "classnames"
import {YakitRoute} from "@/enums/yakitRoute"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
export interface VulinboxManagerProp {}

const {ipcRenderer} = window.require("electron")
export const VulinboxManager: React.FC<VulinboxManagerProp> = (props) => {
    const {t} = useI18nNamespaces(["vulinbox", "yakitUi"])
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
                        <div>{t("VulinboxManager.title")}</div>
                        {available ? (
                            <>
                                <Tag color={"green"}>{t("VulinboxManager.installed")}</Tag>
                                {started && currentParams && (
                                    <YakitButton
                                        type='outline2'
                                        onClick={() => {
                                            info(t("VulinboxManager.openInChrome"))
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
                            <Tag color={"red"}>{t("VulinboxManager.notInstalled")}</Tag>
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
                                    title={t("VulinboxManager.confirmClose")}
                                    onConfirm={() => {
                                        ipcRenderer.invoke("cancel-StartVulinbox", token).then(() => {
                                            setStarted(false)
                                        })
                                    }}
                                >
                                    <YakitButton colors='danger'>{t("VulinboxManager.closeVulinbox")}</YakitButton>
                                </YakitPopconfirm>
                            ) : (
                                <YakitButton
                                    type={"primary"}
                                    onClick={() => {
                                        const m = showYakitModal({
                                            title: t("VulinboxManager.startParams"),
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
                                                                    info(t("VulinboxManager.startSuccess"))
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
                                    {t("VulinboxManager.startVulinbox")}
                                </YakitButton>
                            ))}
                    </Space>
                }
                bodyStyle={{padding: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "row"}}
                extra={
                    <Space>
                        <YakitPopconfirm
                            title={t("VulinboxManager.installConfirm")}
                            onConfirm={() => {
                                const m = showYakitModal({
                                    title: t("VulinboxManager.installTitle"),
                                    width: "50%",
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
                                    ),
                                    getContainer:
                                        document.getElementById(
                                            `main-operator-page-body-${YakitRoute.Beta_VulinboxManager}`
                                        ) || undefined
                                })
                            }}
                        >
                            <YakitButton type={"outline1"}>{t("VulinboxManager.installOrUpgrade")}</YakitButton>
                        </YakitPopconfirm>
                        <YakitButton
                            type='text'
                            onClick={() => {
                                showYakitModal({
                                    title: t("VulinboxManager.downloadAddresses"),
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
                                                                hintText: t("YakitNotification.copySuccess")
                                                            })
                                                        }}
                                                        title={t("YakitNotification.copySuccess")}
                                                    >
                                                        {item.url}
                                                    </code>
                                                    <YakitButton
                                                        type='text'
                                                        onClick={() => {
                                                            setClipboardText(item.url, {
                                                                hiddenHint: false,
                                                                hintText: t("YakitNotification.copySuccess")
                                                            })
                                                        }}
                                                        title={t("YakitNotification.copySuccess")}
                                                    >
                                                        {t("YakitButton.copy")}
                                                    </YakitButton>
                                                </div>
                                            ))}
                                        </div>
                                    ),
                                    footer: null
                                })
                            }}
                        >
                            {t("VulinboxManager.viewDownloadAddresses")}
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
                                                {t("VulinboxManager.info.title")}
                                            </h2>
                                            <p style={{marginBottom: 16}}>{t("VulinboxManager.info.description")}</p>

                                            <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                                                {t("VulinboxManager.info.coverageTitle")}
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
                                                        backgroundColor: "var(--Colors-Use-Neutral-Bg)",
                                                        padding: 16,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            {t("VulinboxManager.info.injectionTitle")}
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>{t("VulinboxManager.info.sqlInjectionEnv")}</li>
                                                            <li>{t("VulinboxManager.info.xssPracticeScenario")}</li>
                                                            <li>{t("VulinboxManager.info.ssrfEnv")}</li>
                                                            <li>
                                                                {t("VulinboxManager.info.commandInjectionReproduce")}
                                                            </li>
                                                        </ul>
                                                    </div>

                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            {t("VulinboxManager.info.authTitle")}
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>
                                                                {t("VulinboxManager.info.cookieSecuritySimulation")}
                                                            </li>
                                                            <li>{t("VulinboxManager.info.jwtTokenScenario")}</li>
                                                            <li>{t("VulinboxManager.info.sessionManagementDemo")}</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            {t("VulinboxManager.info.protocolTitle")}
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>
                                                                {t("VulinboxManager.info.websocketSecuritySimulation")}
                                                            </li>
                                                            <li>{t("VulinboxManager.info.httpProtocolWeaknessEnv")}</li>
                                                            <li>{t("VulinboxManager.info.dnsSecurityDemo")}</li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div
                                                    style={{
                                                        width: "calc(50% - 8px)",
                                                        backgroundColor: "var(--Colors-Use-Neutral-Bg)",
                                                        padding: 16,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            {t("VulinboxManager.info.cryptoTitle")}
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>{t("VulinboxManager.info.aesEcbSecurityIssue")}</li>
                                                            <li>{t("VulinboxManager.info.rsaAlgorithmWeakness")}</li>
                                                            <li>{t("VulinboxManager.info.base64MisuseScenario")}</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{marginBottom: 16}}>
                                                        <h4 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                                                            {t("VulinboxManager.info.apiTitle")}
                                                        </h4>
                                                        <ul style={{paddingLeft: 24, margin: 0}}>
                                                            <li>
                                                                {t(
                                                                    "VulinboxManager.info.openapiSwaggerVulnerabilities"
                                                                )}
                                                            </li>
                                                            <li>
                                                                {t("VulinboxManager.info.restfulApiSecurityIssues")}
                                                            </li>
                                                            <li>
                                                                {t("VulinboxManager.info.jsonParsingVulnerability")}
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                                                {t("VulinboxManager.info.featuresTitle")}
                                            </h3>
                                            <div style={{display: "flex", gap: 16, marginBottom: 16}}>
                                                <div
                                                    style={{
                                                        width: "calc(50% - 8px)",
                                                        backgroundColor: "var(--Colors-Use-Neutral-Bg)",
                                                        padding: 16,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    <div style={{marginBottom: 8}}>
                                                        <b>{t("VulinboxManager.info.teachingTitle")}</b>
                                                        <ul style={{paddingLeft: 24, margin: "4px 0"}}>
                                                            <li>
                                                                {t(
                                                                    "VulinboxManager.info.detailedDescriptionForEachScenario"
                                                                )}
                                                            </li>
                                                            <li>
                                                                {t(
                                                                    "VulinboxManager.info.provideVulnerabilityPrinciplesAndExploitationMethods"
                                                                )}
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div style={{marginBottom: 8}}>
                                                        <b>{t("VulinboxManager.info.realismTitle")}</b>
                                                        <ul style={{paddingLeft: 24, margin: "4px 0"}}>
                                                            <li>
                                                                {t(
                                                                    "VulinboxManager.info.simulateRealBusinessScenarios"
                                                                )}
                                                            </li>
                                                            <li>
                                                                {t(
                                                                    "VulinboxManager.info.simulateRealBusinessScenarios"
                                                                )}
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div
                                                    style={{
                                                        width: "calc(50% - 8px)",
                                                        backgroundColor: "var(--Colors-Use-Neutral-Bg)",
                                                        padding: 16,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    <div style={{marginBottom: 8}}>
                                                        <b>{t("VulinboxManager.info.systematicTitle")}</b>
                                                        <ul style={{paddingLeft: 24, margin: "4px 0"}}>
                                                            <li>
                                                                {t(
                                                                    "VulinboxManager.info.comprehensiveVulnerabilityCoverage"
                                                                )}
                                                            </li>
                                                            <li>
                                                                {t("VulinboxManager.info.reasonableDifficultyGradient")}
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div style={{marginBottom: 8}}>
                                                        <b>{t("VulinboxManager.info.practiceTitle")}</b>
                                                        <ul style={{paddingLeft: 24, margin: "4px 0"}}>
                                                            <li>{t("VulinboxManager.info.handsOnSupport")}</li>
                                                            <li>{t("VulinboxManager.info.instantFeedback")}</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <h3 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                                                {t("VulinboxManager.info.audienceTitle")}
                                            </h3>
                                            <ul style={{paddingLeft: 24, margin: 0}}>
                                                <li>{t("VulinboxManager.info.networkSecurityBeginners")}</li>
                                                <li>{t("VulinboxManager.info.securityTestEngineers")}</li>
                                                <li>{t("VulinboxManager.info.developerSecurityAwarenessTraining")}</li>
                                                <li>{t("VulinboxManager.info.securityResearchers")}</li>
                                            </ul>

                                            <div
                                                style={{
                                                    marginTop: 16,
                                                    padding: 12,
                                                    backgroundColor: "var(--Colors-Use-Neutral-Bg)",
                                                    borderRadius: 4
                                                }}
                                            >
                                                {t("VulinboxManager.info.summary")}
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
    onSubmit: (params: StartVulinboxParams) => any
}

const VulinboxStart: React.FC<VulinboxStartProp> = (props) => {
    const {t} = useI18nNamespaces(["vulinbox"])
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
                    min={1}
                    max={65535}
                />
            </Form.Item>

            <Form.Item label={t("VulinboxStart.noHttps")}>
                <YakitSwitch
                    checked={params.NoHttps}
                    onChange={(checked) => setParams({...params, NoHttps: checked})}
                />
            </Form.Item>

            <Form.Item label={t("VulinboxStart.safeMode")} help={t("VulinboxStart.safeModeTooltip")}>
                <YakitSwitch
                    checked={params.SafeMode}
                    onChange={(checked) => setParams({...params, SafeMode: checked})}
                />
            </Form.Item>

            <Form.Item colon={false} label={" "}>
                <YakitButton style={{marginBottom: 8}} type='primary' htmlType='submit'>
                    {t("VulinboxManager.startVulinbox")}
                </YakitButton>
            </Form.Item>
        </Form>
    )
}

export interface InstallVulinboxPromptProp {
    onFinished: () => any
}

const InstallVulinboxPrompt: React.FC<InstallVulinboxPromptProp> = (props) => {
    const {t} = useI18nNamespaces(["vulinbox"])
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
            success(t("InstallVulinboxPrompt.installing"))
            setLoading(true)
        })
        return () => {
            ipcRenderer.invoke("cancel-InstallVulinbox", token)
        }
    }, [])

    return (
        <Space direction={"vertical"}>
            <div className={classNames(styles["download-progress"], "yakit-progress-wrapper")}>
                <Progress
                    strokeColor='var(--Colors-Use-Main-Primary)'
                    trailColor='var(--Colors-Use-Neutral-Bg)'
                    percent={percent}
                    format={(percent) => t("VulinboxManager.downloadedPercent", {percent: percent ?? 0})}
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
