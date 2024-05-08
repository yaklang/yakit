import React, {useEffect, useState} from "react"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {Col, Divider, Row, Space} from "antd"
import {useDebounce, useMemoizedFn} from "ahooks"
import {ReloadOutlined} from "@ant-design/icons"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {formatTimestamp} from "@/utils/timeUtil"
import style from "./ICMPSizeLoggerPage.module.scss"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

const {ipcRenderer} = window.require("electron")

interface ICMPSizeLoggerInfo {
    Size: number
    CurrentRemoteAddr: string
    Histories: string[]
    CurrentRemoteCachedConnectionCount: number
    SizedCachedHistoryConnectionCount: number
    TriggerTimestamp: number
    Timestamp: number
    Hash: string
}

export interface ICMPSizeLoggerPageProp {}
export const ICMPSizeLoggerPage: React.FC<ICMPSizeLoggerPageProp> = (props) => {
    const [size, setSize] = useState<number>(0)
    const [records, setRecords] = useState<ICMPSizeLoggerInfo[]>([])
    const [loading, setLoading] = useState(false)
    const [host, setHost] = useState("")

    const sizeNow = useDebounce(size, {maxWait: 300})

    const update = useMemoizedFn(() => {
        ipcRenderer
            .invoke("QueryICMPTrigger", {
                Length: sizeNow
            })
            .then((data: {Notification?: ICMPSizeLoggerInfo[]}) => {
                if (data?.Notification) {
                    setRecords(data.Notification)
                }
            })
            .catch((e) => {
                setRecords([])
            })
    })

    const refresh = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("RequireICMPRandomLength", {})
            .then((d: {Length: number; ExternalHost: string} | any) => {
                setSize(d.Length)
                setHost(d.ExternalHost)
                setRecords([])
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 100)
            })
    })

    useEffect(() => {
        if (sizeNow < 100) {
            refresh()
            return
        }

        update()
        let id = setInterval(update, 4000)
        return () => {
            clearInterval(id)
        }
    }, [sizeNow])

    return (
        <YakitCard
            className={style['icmp-wrapper']}
            headStyle={{padding: "25px 15px"}}
            title={
                <Space>
                    ICMP Size Logger
                    <div className={style["description-text"]}>使用 ping 携带特定长度数据包判定 ICMP 反连</div>
                    <Divider type={"vertical"} />
                    <div className={style["set-ping-size-wrap"]}>
                        设置 Ping 包大小：
                        <YakitInputNumber disabled={true} value={size} className={style["ping-size-input-number"]} />
                    </div>
                    <YakitButton disabled={loading} onClick={refresh}>
                        随机生成可用长度
                    </YakitButton>
                    <YakitButton type='text' disabled={loading} icon={<ReloadOutlined />} onClick={update}>
                        刷新
                    </YakitButton>
                </Space>
            }
        >
            <Row align="middle">
                <Col>ICMP Size Logger 是一个通过 Ping 包大小来判断 ICMP 反连的 ICMP 记录器：</Col>
                <Col>
                    <Space>
                        在 Windows 系统中，使用
                        {host === "" || sizeNow <= 0 ? (
                            <YakitSpin />
                        ) : (
                            <YakitTag enableCopy={true} color='blue' copyText={`ping -l ${sizeNow} ${host}`}></YakitTag>
                        )}
                        <div>命令，&nbsp;&nbsp;</div>
                    </Space>
                </Col>
                <Col>
                    <Space>
                        在 MacOS/Linux/*nix 系统中，使用
                        {host === "" || sizeNow <= 0 ? (
                            <YakitSpin />
                        ) : (
                            <YakitTag
                                enableCopy={true}
                                color='success'
                                copyText={`ping -c 4 -s ${sizeNow} ${host}`}
                            ></YakitTag>
                        )}
                        <div>命令</div>
                    </Space>
                </Col>
            </Row>
            <div style={{marginTop: 15}}>
                <TableVirtualResize<ICMPSizeLoggerInfo>
                    isRefresh={loading}
                    titleHeight={0.01}
                    renderTitle={<></>}
                    renderKey='CurrentRemoteAddr'
                    data={records}
                    loading={loading}
                    columns={[
                        {
                            title: "ICMP/Ping 长度",
                            dataKey: "Size",
                            render: (text) => <YakitTag color={"bluePurple"}>{text}</YakitTag>
                        },
                        {
                            title: "远端IP",
                            dataKey: "CurrentRemoteAddr"
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
