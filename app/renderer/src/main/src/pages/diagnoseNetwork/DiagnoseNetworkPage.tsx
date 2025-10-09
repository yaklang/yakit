import React, {useEffect, useRef, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Space} from "antd"
import {randomString} from "@/utils/randomUtil"
import {ExecResult} from "@/pages/invoker/schema"
import {failed, yakitInfo, yakitNotify} from "@/utils/notification"
import {debugYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {useGetState, useMemoizedFn} from "ahooks"
import {AutoSpin} from "@/components/AutoSpin"
import {XTerm} from "xterm-for-react"
import {writeXTerm, xtermClear, xtermFit} from "@/utils/xtermUtils"
import ReactResizeDetector from "react-resize-detector"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {DiagnoseNetworkForm, DiagnoseNetworkParams} from "@/pages/diagnoseNetwork/DiagnoseNetworkForm"
import {CloseCircleIcon} from "@/assets/newIcon"
import {DiagnoseNetworkDNSForm} from "@/pages/diagnoseNetwork/DiagnoseNetworkDNSForm"
import {TracerouteForm} from "@/pages/diagnoseNetwork/TracerouteForm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useXTermOptions} from "@/hook/useXTermOptions/useXTermOptions"

export interface DiagnoseNetworkPageProp {}

const {ipcRenderer} = window.require("electron")

interface DiagnoseNetworkResult {
    Title: string
    DiagnoseType: string
    DiagnoseResult: string
    LogLevel: string
}

export const DiagnoseNetworkPage: React.FC<DiagnoseNetworkPageProp> = (props) => {
    const [token, setToken] = useState(randomString(60))
    const [dnsToken, setDNSToken] = useState(randomString(60))
    const [domain, setDomain] = useState("www.example.com")
    const [loading, setLoading] = useState(false)
    const [preHop, setPreHop, GetPreHop] = useGetState(0)
    const [preIp, setPreIp, GetPreIp] = useGetState("")
    const xtermRef = useRef<any>(null)

    const terminalOptions = useXTermOptions({
        getTerminal: () => xtermRef.current?.terminal
    })

    const submit = useMemoizedFn((params: DiagnoseNetworkParams) => {
        ipcRenderer.invoke("DiagnoseNetwork", params, token).then(() => {
            setLoading(true)
            yakitInfo("[DiagnoseNetwork] started")
        })
    })

    const submitDNSDiag = useMemoizedFn((params: {Domain: string}) => {
        ipcRenderer.invoke("DiagnoseNetworkDNS", params, token).then(() => {
            setLoading(true)
            yakitInfo("[DiagnoseNetworkDNS] started")
        })
    })

    const submitTraceroute = useMemoizedFn((params: {Host: string}) => {
        ipcRenderer.invoke("Traceroute", params, token + "-traceroute").then(() => {
            setPreHop(0)
            setPreIp("")
            setLoading(true)
            yakitInfo("[Traceroute] started")
        })
    })
    useEffect(() => {
        const tracerouteToken = token + "-traceroute"
        ipcRenderer.on(
            `${tracerouteToken}-data`,
            async (e, data: {Ip: string; Rtt: number; Reason: string; Hop: number}) => {
                if (data.Hop !== GetPreHop()) {
                    writeXTerm(xtermRef, `hop ${data.Hop}\t`)
                } else {
                    if (data.Ip !== GetPreIp()) {
                        writeXTerm(xtermRef, `\t`)
                    }
                }
                if (data.Reason) {
                    writeXTerm(xtermRef, `*` + "\n")
                    setPreHop(data.Hop)
                    setPreIp("*")
                } else {
                    if (data.Ip !== GetPreIp()) {
                        writeXTerm(xtermRef, `${data.Ip}\t${data.Rtt}ms` + "\n")
                    }
                    setPreHop(data.Hop)
                    setPreIp(data.Ip)
                }
            }
        )
        ipcRenderer.on(`${tracerouteToken}-error`, (e, error) => {
            failed(`[Traceroute] error:  ${error}`)
        })
        ipcRenderer.on(`${tracerouteToken}-end`, (e, data) => {
            setTimeout(() => {
                yakitInfo("[Traceroute] finished")
                setLoading(false)
            }, 300)
        })
        return () => {
            ipcRenderer.invoke("cancel-Traceroute", tracerouteToken)
            ipcRenderer.removeAllListeners(`${tracerouteToken}-data`)
            ipcRenderer.removeAllListeners(`${tracerouteToken}-error`)
            ipcRenderer.removeAllListeners(`${tracerouteToken}-end`)
        }
    }, [])
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: DiagnoseNetworkResult) => {
            if (data.DiagnoseType === "log") {
                writeXTerm(xtermRef, `[${data.LogLevel}]: ${data.Title} ${data.DiagnoseResult}` + "\n")
            } else {
                writeXTerm(
                    xtermRef,
                    `[${data.DiagnoseType}]: ${data.Title + "\n"} ${data.DiagnoseResult + "\n"}` + "\n\n"
                )
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[DiagnoseNetwork] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setTimeout(() => {
                yakitInfo("[DiagnoseNetwork] finished")
                setLoading(false)
            }, 300)
        })
        return () => {
            ipcRenderer.invoke("cancel-DiagnoseNetwork", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    useEffect(() => {
        ipcRenderer.on(`${dnsToken}-data`, async (e, data: DiagnoseNetworkResult) => {})
        ipcRenderer.on(`${dnsToken}-error`, (e, error) => {
            failed(`[DiagnoseNetworkDNS] error:  ${error}`)
        })
        ipcRenderer.on(`${dnsToken}-end`, (e, data) => {
            yakitInfo("[DiagnoseNetworkDNS] finished")
        })
        return () => {
            ipcRenderer.invoke("cancel-DiagnoseNetworkDNS", dnsToken)
            ipcRenderer.removeAllListeners(`${dnsToken}-data`)
            ipcRenderer.removeAllListeners(`${dnsToken}-error`)
            ipcRenderer.removeAllListeners(`${dnsToken}-end`)
        }
    }, [])

    return (
        <AutoCard
            title={
                <Space>
                    网络诊断
                    {loading && <AutoSpin size={"small"} />}
                    <YakitButton
                        type={"text"}
                        colors='danger'
                        icon={<CloseCircleIcon />}
                        onClick={() => {
                            xtermClear(xtermRef)
                        }}
                    />
                </Space>
            }
            bordered={false}
            size={"small"}
            bodyStyle={{padding: 0}}
        >
            <YakitResizeBox
                firstRatio={"300px"}
                firstMinSize={"300px"}
                firstNode={
                    <div style={{marginTop: 12}}>
                        <DiagnoseNetworkForm
                            onSubmit={(params) => {
                                submit(params)
                            }}
                        />
                        <Divider />
                        <DiagnoseNetworkDNSForm
                            onSubmit={(params) => {
                                submitDNSDiag(params)
                            }}
                        />
                        <Divider />
                        <TracerouteForm
                            onSubmit={(params) => {
                                submitTraceroute(params)
                            }}
                        />
                    </div>
                }
                secondNode={
                    <div style={{height: "100%", backgroundColor: "var(--Colors-Use-Neutral-Bg-Hover)"}}>
                        <ReactResizeDetector
                            onResize={(width, height) => {
                                if (!width || !height) return

                                const row = Math.floor(height / 18.5)
                                const col = Math.floor(width / 10)
                                if (xtermRef) xtermFit(xtermRef, col, row)
                            }}
                            handleWidth={true}
                            handleHeight={true}
                            refreshMode={"debounce"}
                            refreshRate={50}
                        />
                        <XTerm ref={xtermRef} options={terminalOptions} />
                    </div>
                }
            />
        </AutoCard>
    )
}
