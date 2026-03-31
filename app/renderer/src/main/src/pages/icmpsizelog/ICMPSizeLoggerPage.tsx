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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

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
    const {t} = useI18nNamespaces(["yakitUi"])
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
                    {t("ICMPSizeLoggerPage.title")}
                    <div className={style["description-text"]}>{t("ICMPSizeLoggerPage.description")}</div>
                    <Divider type={"vertical"} />
                    <div className={style["set-ping-size-wrap"]}>
                        {t("ICMPSizeLoggerPage.setPingSize")}
                        <YakitInputNumber disabled={true} value={size} className={style["ping-size-input-number"]} />
                    </div>
                    <YakitButton disabled={loading} onClick={refresh}>
                        {t("ICMPSizeLoggerPage.randomLength")}
                    </YakitButton>
                    <YakitButton type='text' disabled={loading} icon={<ReloadOutlined />} onClick={update}>
                        {t("ICMPSizeLoggerPage.refresh")}
                    </YakitButton>
                </Space>
            }
        >
            <Row align="middle">
                <Col>{t("ICMPSizeLoggerPage.summary")}</Col>
                <Col>
                    <Space>
                        {t("ICMPSizeLoggerPage.windowsCommand")}
                        {host === "" || sizeNow <= 0 ? (
                            <YakitSpin />
                        ) : (
                            <YakitTag enableCopy={true} color='blue' copyText={`ping -l ${sizeNow} ${host}`}></YakitTag>
                        )}
                        <div>{t("ICMPSizeLoggerPage.command")}&nbsp;&nbsp;</div>
                    </Space>
                </Col>
                <Col>
                    <Space>
                        {t("ICMPSizeLoggerPage.macCommand")}
                        {host === "" || sizeNow <= 0 ? (
                            <YakitSpin />
                        ) : (
                            <YakitTag
                                enableCopy={true}
                                color='success'
                                copyText={`ping -c 4 -s ${sizeNow} ${host}`}
                            ></YakitTag>
                        )}
                        <div>{t("ICMPSizeLoggerPage.command")}</div>
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
                            title: t("ICMPSizeLoggerPage.pingLength"),
                            dataKey: "Size",
                            render: (text) => <YakitTag color={"bluePurple"}>{text}</YakitTag>
                        },
                        {
                            title: t("ICMPSizeLoggerPage.remoteIp"),
                            dataKey: "CurrentRemoteAddr"
                        },
                        {
                            title: t("ICMPSizeLoggerPage.triggerTime"),
                            dataKey: "TriggerTimestamp",
                            render: (text) => <YakitTag color={"bluePurple"}>{formatTimestamp(text)}</YakitTag>
                        }
                    ]}
                />
            </div>
        </YakitCard>
    )
}
