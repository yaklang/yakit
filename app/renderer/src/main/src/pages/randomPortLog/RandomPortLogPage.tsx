import React, {useEffect, useState} from "react"
import {Col, Divider, Row, Space, Tooltip} from "antd"
import {useMemoizedFn} from "ahooks"
import {formatTimestamp} from "../../utils/timeUtil"
import {ReloadOutlined} from "@ant-design/icons"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import style from "./RandomPortLogPage.module.scss"

const {ipcRenderer} = window.require("electron")

interface RandomPortTriggerNotification {
    History?: string[]
    RemoteAddr: string
    RemotePort: number
    RemoteIP: string
    LocalPort: number
    CurrentRemoteCachedConnectionCount: number
    LocalPortCachedHistoryConnectionCount: number
    Timestamp: number
    TriggerTimestamp: number
}

export interface RandomPortLogPageProp {}
export const RandomPortLogPage: React.FC<RandomPortLogPageProp> = (props) => {
    const [loading, setLoading] = useState(false)
    const [token, setToken] = useState<string>("")
    const [externalAddr, setExternalAddr] = useState("")
    const [randomPort, setRandomPort] = useState(0)
    const [notification, setNotification] = useState<RandomPortTriggerNotification[]>([])

    const refreshPort = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("RequireRandomPortToken", {})
            .then((d: {Token: string; Addr: string; Port: number}) => {
                setToken(d.Token)
                setExternalAddr(d.Addr)
                setRandomPort(d.Port)
                setNotification([])
            })
            .catch(() => {
                setNotification([])
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 400)
            })
    })

    useEffect(() => {
        if (token !== "") {
            update()
            const id = setInterval(update, 4000)
            return () => {
                clearInterval(id)
            }
        }
    }, [token])

    useEffect(refreshPort, [])

    const update = useMemoizedFn(() => {
        ipcRenderer
            .invoke("QueryRandomPortTrigger", {
                Token: token
            })
            .then((d: RandomPortTriggerNotification) => {
                if (d?.RemoteAddr !== "") {
                    setNotification([d])
                }
            })
            .catch(() => {})
    })

    return (
        <YakitCard
            className={style["tcp-wrapper"]}
            headStyle={{padding: "25px 15px"}}
            title={
                <Space>
                    Random Port Logger
                    <div className={style["description-text"]}>使用未开放的随机端口来判定 TCP 反连</div>
                    <Divider type={"vertical"} />
                    <div className={style["set-ping-size-wrap"]}>
                        当前随机端口：
                        <YakitInputNumber
                            disabled={true}
                            value={randomPort}
                            className={style["ping-size-input-number"]}
                        />
                    </div>
                    <YakitButton disabled={loading} onClick={refreshPort}>
                        申请随机端口
                    </YakitButton>
                    <YakitButton type='text' disabled={loading} icon={<ReloadOutlined />} onClick={update}>
                        刷新
                    </YakitButton>
                </Space>
            }
        >
            <Row align='middle'>
                <Col>使用以下随机端口尝试触发记录：</Col>
                <Col>
                    {externalAddr !== "" && !loading ? (
                        <>
                            <YakitTag enableCopy={true} color='blue' copyText={externalAddr}></YakitTag>
                        </>
                    ) : (
                        <YakitSpin />
                    )}
                </Col>
                <Col>
                    {externalAddr !== "" && !loading ? (
                        <>
                            <Space>
                                使用 NC 命令
                                <YakitTag
                                    enableCopy={true}
                                    color='success'
                                    copyText={`nc ${externalAddr.replaceAll(":", " ")}`}
                                ></YakitTag>
                            </Space>
                        </>
                    ) : (
                        <YakitSpin />
                    )}
                </Col>
                <Col>
                    {randomPort > 0 && !loading ? (
                        <YakitTag enableCopy={true} color='purple' copyText={randomPort + ""}></YakitTag>
                    ) : (
                        <YakitSpin />
                    )}
                </Col>
            </Row>
            <div style={{marginTop: 15}}>
                <TableVirtualResize<RandomPortTriggerNotification>
                    isRefresh={loading}
                    titleHeight={0.01}
                    renderTitle={<></>}
                    renderKey='RemoteAddr'
                    data={notification}
                    loading={loading}
                    columns={[
                        {
                            title: "随机反连端口",
                            dataKey: "LocalPort"
                        },
                        {
                            title: "远端地址",
                            dataKey: "RemoteAddr",
                            render: (text) => <YakitCopyText showText={text} />
                        },
                        {
                            title: "同主机其他连接(一分钟内)",
                            dataKey: "CurrentRemoteCachedConnectionCount",
                            render: (text) => <span>{text || 1}</span>
                        },
                        {
                            title: "同端口历史(一分钟内)",
                            dataKey: "LocalPortCachedHistoryConnectionCount",
                            render: (text, r) => (
                                <Tooltip
                                    title={`对当前端口(${r.LocalPort})来说，除了当前连接，还有${
                                        text || 1
                                    }个来自其他远端的连接`}
                                >
                                    <a
                                        href='#'
                                        onClick={(e) => {
                                            e.preventDefault()
                                            const m = showYakitModal({
                                                title: "查看历史记录",
                                                width: "40%",
                                                content: (
                                                    <div style={{height: 500, marginBottom: 5}}>
                                                        <YakitEditor
                                                            type={"http"}
                                                            readOnly={true}
                                                            value={r?.History ? r.History.join("\n") : "-"}
                                                        />
                                                    </div>
                                                ),
                                                onCancel: () => {
                                                    m.destroy()
                                                },
                                                onOk: () => {
                                                    m.destroy()
                                                }
                                            })
                                        }}
                                    >
                                        其他连接：{text || 1}
                                    </a>
                                </Tooltip>
                            )
                        },
                        {
                            title: "触发时间",
                            dataKey: "TriggerTimestamp",
                            render: (text) => <YakitTag color={"bluePurple"}>{formatTimestamp(text)}</YakitTag>
                        }
                    ]}
                />
            </div>
        </YakitCard>
    )
}
