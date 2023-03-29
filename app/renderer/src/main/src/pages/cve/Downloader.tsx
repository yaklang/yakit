import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {Alert, Button, Popconfirm} from "antd"
import {failed, info} from "@/utils/notification"
import {ExecResult} from "@/pages/invoker/schema"
import {randomString} from "@/utils/randomUtil"
import {useGetState} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"

export interface CVEDownloaderProp {}

const {ipcRenderer} = window.require("electron")

export const CVEDownloader: React.FC<CVEDownloaderProp> = (props) => {
    const [loading, setLoading] = useState(false)
    const [available, setAvailable] = useState(false)
    const [_token, setToken, getToken] = useGetState(randomString(40))
    const [messages, setMessages, getMessages] = useGetState<string[]>([])
    const [outOfDate, setOutOfDate] = useState(false)

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
            ipcRenderer.invoke("ref-cveData")
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
        ipcRenderer
            .invoke("IsCVEDatabaseReady")
            .then((rsp: {Ok: boolean; Reason: string; ShouldUpdate: boolean}) => {
                setAvailable(rsp.Ok)
                setOutOfDate(rsp.ShouldUpdate)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [])

    return (
        <AutoCard size={"small"} bordered={false} loading={loading}>
            <Alert
                type={"warning"}
                closable={false}
                message={
                    <div>
                        <div>
                            {outOfDate
                                ? "当前 CVE 最新记录距当前时间超过 7 天，建议 "
                                : "数据库最新记录还保持在 7 天内，当然也可以强制更新："}
                            <Popconfirm
                                title={"下载将是一个耗时操作，请您尽量等待下载完成，更新将会删除旧的数据库"}
                                onConfirm={() => {
                                    ipcRenderer
                                        .invoke("UpdateCVEDatabase", {Proxy: ""}, getToken())
                                        .then(() => {})
                                        .catch((e) => {
                                            failed(`更新 CVE 数据库失败！${e}`)
                                        })
                                }}
                            >
                                <Button type={"link"}>点击此按钮强制更新</Button>
                            </Popconfirm>
                        </div>
                    </div>
                }
            />
            <br />
            {available ? (
                <Alert
                    type={"success"}
                    closable={false}
                    message={
                        <div>
                            <div>CVE 漏洞库当前可用，无需下载</div>
                        </div>
                    }
                />
            ) : (
                <Alert
                    type={"warning"}
                    closable={false}
                    message={
                        <div>
                            本地 CVE 数据库未初始化，
                            <Popconfirm
                                title={"下载将是一个耗时操作，请您尽量等待下载完成"}
                                onConfirm={() => {
                                    ipcRenderer
                                        .invoke("UpdateCVEDatabase", {Proxy: ""}, getToken())
                                        .then(() => {})
                                        .catch((e) => {
                                            failed(`更新 CVE 数据库失败！${e}`)
                                        })
                                }}
                            >
                                <Button type={"link"}>点击此按钮下载</Button>
                            </Popconfirm>
                        </div>
                    }
                />
            )}
            <br />
            {messages.map((i) => {
                return <p>{`${i}`}</p>
            })}
        </AutoCard>
    )
}
