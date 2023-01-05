import React, {useEffect, useMemo, useState} from "react";
import {Button, PageHeader, Popconfirm, Space, Spin, Switch, Tag} from "antd";
import {useGetState, useMemoizedFn} from "ahooks";
import {AutoSpin} from "../../components/AutoSpin";
import {CVXterm, TERMINAL_INPUT_KEY} from "../../components/CVXterm";

const {ipcRenderer} = window.require("electron");

export const ShellItem = (props) => {
    const [haveConnIn, setHaveConnIn] = useState(false);
    const [local, setLocal] = useState("");
    const [remote, setRemote] = useState("");
    const [copyLoading, setCopyLoading] = useState(false)
    const {removeListenPort, addr} = props
    const xtermRef = React.useRef(null)
    const timeRef = React.useRef(null)
    const [echoBack, setEchoBack, getEchoBack] = useGetState(true);

    const write = useMemoizedFn((s) => {
        if (!xtermRef || !xtermRef.current) {
            return
        }
        const str = s.charCodeAt(0) === TERMINAL_INPUT_KEY.ENTER ? String.fromCharCode(10) : s
        if (getEchoBack()) {
            xtermRef.current.terminal.write(str)
        }
        ipcRenderer.invoke("listening-port-input", props.addr, str)
    })

    useEffect(() => {
        const key = `client-listening-port-data-${props.addr}`
        ipcRenderer.on(key, (e, data) => {
            if (data.control) {
                return
            }

            if (data.localAddr) {
                setLocal(data.localAddr)
            }
            if (data.remoteAddr) {
                setRemote(data.remoteAddr)
            }

            if (data?.raw && xtermRef?.current && xtermRef.current?.terminal) {
                // let str = String.fromCharCode.apply(null, data.raw);
                xtermRef.current.terminal.write(data.raw)
                setHaveConnIn(true)
            }
        })

        return () => {
            ipcRenderer.removeAllListeners(key)
        }
    }, [])

    return (
        <div style={{width: "100%", height: "100%", display: "flex", flexFlow: "column"}}>
            <PageHeader
                title={<Space>
                    {"正在监听端口: " + addr}
                </Space>}
                subTitle={
                    <Space>
                        {local && remote ? (
                            <Tag color={"geekblue"}>
                                本地端口:{local} &lt;== 远程端口:{remote}
                            </Tag>
                        ) : (
                            <Tag color={"green"}>等待 TCP 连接接入</Tag>
                        )}
                    </Space>
                }
                extra={
                    <Space>
                        <span>
                        客户端回显:
                        <Switch size={"small"} checked={echoBack} onChange={setEchoBack}/>
                    </span>
                        <Popconfirm
                            title={"确定关闭该端口吗？"}
                            onConfirm={() => {
                                removeListenPort(addr)
                            }}
                        >
                            <Button danger={true} type={"primary"}>
                                强制断开端口
                            </Button>
                        </Popconfirm>
                    </Space>
                }
            />
            <div style={{flex: 1, overflowY: "hidden"}}>
                <AutoSpin spinning={!haveConnIn} tip={"正在等待 TCP 连接连入..."}>
                    <CVXterm
                        ref={xtermRef}
                        options={{
                            convertEol: true
                        }}
                        isWrite={getEchoBack()}
                        write={write}
                    />
                    {/* <XTerm
                        ref={xtermRef}
                        options={{
                            convertEol: true
                        }}
                        onKey={({key, event}) => {
                            if (!copyLoading) {
                                const code = key.charCodeAt(0)
                                if (code === 127 && xtermRef?.current) {
                                    //Backspace
                                    xtermRef.current.terminal.write("\x1b[D \x1b[D")
                                }

                                write(key)
                            }
                        }}
                        customKeyEventHandler={(e) => {
                            if (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) {
                                setCopyLoading(true)
                                if (timeRef.current) return
                                timeRef.current = setTimeout(() => {
                                    navigator.clipboard.readText().then((res) => {
                                        write(res)
                                        timeRef.current = null
                                        setCopyLoading(false)
                                    })
                                }, 200)
                            }
                            if (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) {
                                const str = xtermRef.current.terminal.getSelection()
                                setCopyLoading(true)
                                if (timeRef.current) return
                                timeRef.current = setTimeout(() => {
                                    ipcRenderer.invoke("copy-clipboard", str).finally(() => {
                                        timeRef.current = null
                                        setCopyLoading(false)
                                    })
                                }, 300)
                            }
                            return true
                        }}
                    /> */}
                </AutoSpin>
            </div>
        </div>
    )
}
