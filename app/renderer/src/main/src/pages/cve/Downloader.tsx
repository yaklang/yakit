import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {Alert, Button, Popconfirm} from "antd";
import {failed, info} from "@/utils/notification";
import {ExecResult} from "@/pages/invoker/schema";
import {randomString} from "@/utils/randomUtil";
import {useGetState} from "ahooks";
import {Uint8ArrayToString} from "@/utils/str";

export interface CVEDownloaderProp {

}

const {ipcRenderer} = window.require("electron");

export const CVEDownloader: React.FC<CVEDownloaderProp> = (props) => {
    const [loading, setLoading] = useState(false);
    const [available, setAvailable] = useState(false);
    const [_token, setToken, getToken] = useGetState(randomString(40))
    const [messages, setMessages, getMessages] = useGetState<string[]>([]);

    useEffect(() => {
        const token = getToken()
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            console.info(data)
            if (!data.IsMessage) {
                return
            }
            setMessages([...getMessages(), Uint8ArrayToString(data.Message)])
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[UpdateCVEDatabase] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[UpdateCVEDatabase] finished")
        })
        return () => {
            ipcRenderer.invoke("cancel-UpdateCVEDatabase", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("IsCVEDatabaseReady").then((rsp: { Ok: boolean, Reason: string }) => {
            setAvailable(rsp.Ok)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [])

    return <AutoCard size={"small"} bordered={false} loading={loading}>
        {available ? <Alert type={"success"} closable={false} message={(
            <div>CVE 漏洞库当前可用，无需下载</div>
        )}/> : <Alert type={"warning"} closable={false} message={(
            <div>本地 CVE 数据库未初始化，<Popconfirm
                title={"下载将是一个耗时操作，请您尽量等待下载完成"}
                onConfirm={() => {
                    ipcRenderer.invoke("UpdateCVEDatabase", {Proxy: ""}, getToken()).then(() => {

                    }).catch(e => {
                        failed(`更新 CVE 数据库失败！${e}`)
                    })
                }}
            >
                <Button type={"link"}>点击此按钮下载</Button>
            </Popconfirm></div>
        )}/>}
        <br/>
        {messages.map(i => {
            return <p>{`${i}`}</p>
        })}
            </AutoCard>
        };