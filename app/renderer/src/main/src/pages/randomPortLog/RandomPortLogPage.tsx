import React, {useEffect, useState} from "react";
import {AutoCard} from "../../components/AutoCard";
import {Alert, Button, Divider, Form, Space, Spin, Table, Tag, Tooltip} from "antd";
import {useMemoizedFn} from "ahooks";
import {randomString} from "../../utils/randomUtil";
import {CopyableField, InputInteger} from "../../utils/inputUtil";
import {formatTimestamp} from "../../utils/timeUtil";
import {ReloadOutlined} from "@ant-design/icons";
import {showModal} from "../../utils/showModal";
import {YakEditor} from "../../utils/editors";

export interface RandomPortLogPageProp {

}

const {ipcRenderer} = window.require("electron");

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

export const RandomPortLogPage: React.FC<RandomPortLogPageProp> = (props) => {
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string>("");
    const [externalAddr, setExternalAddr] = useState("");
    const [randomPort, setRandomPort] = useState(0);
    const [notification, setNotification] = useState<RandomPortTriggerNotification[]>([]);

    const refreshPort = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("RequireRandomPortToken", {}).then((d: { Token: string, Addr: string, Port: number }) => {
            setToken(d.Token)
            setExternalAddr(d.Addr)
            setRandomPort(d.Port)
            setNotification([])
        }).catch(() => {
            setNotification([])
        }).finally(() => {
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
        ipcRenderer.invoke("QueryRandomPortTrigger", {
            Token: token
        }).then((d: RandomPortTriggerNotification) => {
            if (d?.RemoteAddr !== "") {
                setNotification([d])
            }
        }).catch(() => {
        })
    })

    return <AutoCard bordered={false} title={<Space>
        Random Port Logger
        <div style={{color: "#999", fontSize: 12}}>
            ??????????????????????????????????????? TCP ??????
        </div>
        <Divider type={"vertical"}/>
        <Form onSubmitCapture={e => {
            e.preventDefault()

            refreshPort()
        }} size={"small"} layout={"inline"}>
            <InputInteger label={"??????????????????"} value={randomPort} disable={true} setValue={() => {
            }}/>
            <Form.Item colon={false} label={" "}>
                <Button disabled={loading} type="primary" htmlType="submit"> ?????????????????? </Button>
            </Form.Item>
            <Button disabled={loading} type="link" onClick={() => {
                update()
            }} icon={<ReloadOutlined/>}> ?????? </Button>
        </Form>
    </Space>}>
        <Space direction={"vertical"} style={{width: "100%"}}>
            <Alert type={"success"} message={<Space style={{width: "100%"}} direction={"vertical"}>
                <h4>??????????????????????????????????????????</h4>
                {externalAddr !== "" && !loading ? <Space direction={"vertical"}>
                    <CopyableField text={externalAddr}/>
                    <Space>
                        ?????? NC ??????<CopyableField mark={true} text={`nc ${externalAddr.replaceAll(":", " ")}`}/>
                    </Space>
                </Space> : <Spin/>}
                {randomPort > 0 && !loading ? <CopyableField text={`${randomPort}`}/> : <Spin/>}
            </Space>}>

            </Alert>
            <Table<RandomPortTriggerNotification>
                size={"small"}
                pagination={false}
                rowKey={i => `${i?.RemoteAddr || randomString(12)}`}
                dataSource={notification}
                columns={[
                    {title: "??????????????????", render: (i: RandomPortTriggerNotification) => i?.LocalPort},
                    {
                        title: "????????????",
                        render: (i: RandomPortTriggerNotification) => <CopyableField text={i?.RemoteAddr}/>
                    },
                    {
                        title: "?????????????????????(????????????)",
                        render: (i: RandomPortTriggerNotification) => i?.CurrentRemoteCachedConnectionCount || 1
                    },
                    {
                        title: "???????????????(????????????)",
                        render: (i: RandomPortTriggerNotification) => <Tooltip
                            title={`???????????????(${i?.LocalPort})????????????????????????????????????${i?.LocalPortCachedHistoryConnectionCount || 1}??????????????????????????????`}>
                            <a href="#" onClick={(e) => {
                                e.preventDefault()

                                showModal({
                                    title: "??????????????????",
                                    width: "40%",
                                    content: (
                                        <>
                                            <YakEditor
                                                type={"http"}
                                                readOnly={true}
                                                value={i?.History ? i.History.join("\n") : "-"}
                                            />
                                        </>
                                    )
                                })
                            }}>
                                ???????????????{i?.LocalPortCachedHistoryConnectionCount || 1}
                            </a>
                        </Tooltip>
                    },
                    {
                        title: "????????????",
                        render: (i: RandomPortTriggerNotification) => <Tag>{formatTimestamp(i.TriggerTimestamp)}</Tag>
                    },
                ]}
            >

            </Table>
        </Space>
    </AutoCard>
};