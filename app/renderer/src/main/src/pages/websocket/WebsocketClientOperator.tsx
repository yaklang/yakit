import React, {useEffect, useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import {AutoCard} from "@/components/AutoCard";
import {useGetState, useMemoizedFn} from "ahooks";
import {Button, Popconfirm, Space} from "antd";
import {YakEditor} from "@/utils/editors";
import {StringToUint8Array} from "@/utils/str";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";

export interface WebsocketClientOperatorProp {
    request?: Uint8Array
    onToken: (i: string) => any
}

const {ipcRenderer} = window.require("electron");

export const WebsocketClientOperator: React.FC<WebsocketClientOperatorProp> = (props) => {
    const [_executing, setExecuting, getExecuting] = useGetState(false);
    const [_request, setRequest, getRequest] = useGetState(props.request ? props.request : new Uint8Array);
    const [_toServer, setToServer, getToServer] = useGetState("");

    // 设置随机字符串
    //    这个要通过 finished 的时候来搞
    const [_token, setToken, getToken] = useGetState(randomString(30));

    useEffect(() => {
        props.onToken(getToken())
    }, [getToken()])

    // 数据通道
    useEffect(() => {
        const token = getToken()

        ipcRenderer.on(`${token}-error`, (e, error) => {
            if (`${error}`.includes(`Cancelled on client`)) {
                return
            }
            failed(`[CreateWebsocketFuzzer] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[CreateWebsocketFuzzer] finished")
            setToken(randomString(30))
            setExecuting(false)
        })
        return () => {
            ipcRenderer.invoke("cancel-CreateWebsocketFuzzer", token)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [_token])

    const submit = useMemoizedFn(() => {
        ipcRenderer.invoke("CreateWebsocketFuzzer", {
            UpgradeRequest: getRequest(),
            IsTLS: true,
            ToServer: StringToUint8Array(getToServer()),
        }, getToken()).then(() => {
            setExecuting(true)
        })
    })

    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-CreateWebsocketFuzzer", getToken())
    })

    const sendToServer = useMemoizedFn(() => {
        ipcRenderer.invoke("CreateWebsocketFuzzer", {
            ToServer: StringToUint8Array(getToServer())
        }, getToken())
    })

    return <ResizeBox
        isVer={true}
        firstNode={() => {
            return <AutoCard
                size={"small"} bordered={true} title={"创建 Websocket 请求"}
                bodyStyle={{padding: 0}}
                extra={(
                    <Space>
                        {getExecuting() ? (
                            <Popconfirm title={"确定要关闭 Websocket 连接吗？"} onConfirm={cancel}>
                                <Button
                                    size={"small"}
                                    type={"primary"}
                                    danger={true}
                                >
                                    关闭连接
                                </Button>
                            </Popconfirm>
                        ) : <Button
                            size={"small"}
                            type={"primary"}
                            onClick={() => {
                                submit()
                            }}
                        >
                            启动连接
                        </Button>}
                    </Space>
                )}
            >
                <YakEditor
                    readOnly={getExecuting()}
                    noLineNumber={true}
                    type={"http"}
                    valueBytes={getRequest()}
                    noMiniMap={true}
                    setValue={s => {
                        setRequest(StringToUint8Array(s, "utf8"))
                    }}
                />
            </AutoCard>
        }}
        firstRatio={"300px"}
        firstMinSize={"300px"}
        secondNode={() => {
            return <AutoCard
                size={"small"} bordered={false}
                extra={<Space>
                    <Button
                        size={"small"} type={"primary"}
                        disabled={!getExecuting()}
                        onClick={() => {
                            sendToServer()
                        }}
                    >发送到服务器</Button>
                </Space>}
                bodyStyle={{padding: 0}}
                title={"发送数据"}
            >
                <YakEditor
                    // readOnly={!getExecuting()}
                    lineNumbersMinChars={3}
                    type={"html"}
                    value={getToServer()}
                    setValue={setToServer}
                />
            </AutoCard>
        }}
    />
};