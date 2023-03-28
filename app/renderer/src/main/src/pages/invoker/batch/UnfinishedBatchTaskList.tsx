import React, {useEffect, useState} from "react";
import {Button, Col, List, Popconfirm, Progress, Row, Space, Tag} from "antd";
import {AutoCard} from "../../../components/AutoCard";
import {showModal} from "../../../utils/showModal";
import {formatTimestamp} from "../../../utils/timeUtil";
import {DeleteOutlined, FireOutlined} from "@ant-design/icons";
import {TargetRequest} from "./BatchExecutorPage";
import {failed, info} from "../../../utils/notification";
import {OneLine} from "../../../utils/inputUtil";

interface UnfinishedBatchTaskListProp {
    handler: (i: UnfinishedBatchTask) => any
}



export interface UnfinishedBatchTask {
    Uid: string
    CreatedAt: number
    Percent: number
    TaskName: string
}

interface SimpleDetectBatchTaskListProp {
    handler: (i: UnfinishedSimpleDetectBatchTask) => any
}

export interface UnfinishedSimpleDetectBatchTask {
    Uid: string
    CreatedAt: number
    Percent: number
    YakScriptOnlineGroup: string
    LastRecordPtr: number,
    TaskName: string
}

const {ipcRenderer} = window.require("electron");

const UnfinishedBatchTaskList: React.FC<UnfinishedBatchTaskListProp> = (props) => {
    const [tasks, setTasks] = useState<UnfinishedBatchTask[]>([]);
    const [loading, setLoading] = useState(false)

    const update = () => {
        setLoading(true)
        ipcRenderer.invoke("GetExecBatchYakScriptUnfinishedTask", {}).then((e: { Tasks: UnfinishedBatchTask[] }) => {
            setTasks(e.Tasks.reverse())
        }).catch((e) => {
            failed(`获取未完成的任务失败: ${e}`)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }
    useEffect(() => {
        update()
    }, [])

    return <List<UnfinishedBatchTask>
        loading={loading}
        dataSource={tasks || []}
        renderItem={i => {
            return <AutoCard size={"small"} hoverable={true} style={{marginBottom: 6}}>
                <Space>
                    <Tag color={"geekblue"}>{formatTimestamp(i.CreatedAt)}</Tag>
                    <Tag color={"red"}>{i.TaskName}</Tag>
                    <div style={{width: 230, marginRight: 8}}>
                        <Progress percent={parseInt((i.Percent * 100).toFixed(2))}/>
                    </div>
                    <Popconfirm title={"启动任务"}
                                onConfirm={() => {
                                    props.handler(i)
                                }}
                    >
                        <Button size={"small"} type={"primary"}>
                            继续任务
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title={"删除这个任务？"}
                        onConfirm={() => {
                            ipcRenderer.invoke("PopExecBatchYakScriptUnfinishedTaskByUid", {Uid: i.Uid}).then((i: TargetRequest) => {
                                info("未完成的任务已删除")
                            }).finally(() => update())
                        }}
                    >
                        <Button
                            size={"small"} type={"link"} icon={<DeleteOutlined/>}
                            danger={true}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            </AutoCard>
        }}
    >

    </List>
};

export const showUnfinishedBatchTaskList = (handler: (i: UnfinishedBatchTask) => any) => {
    let m = showModal({
        title: "未完成的任务：点击任务可继续执行",
        width: 650,
        content: (
            <>
                <UnfinishedBatchTaskList handler={(i) => {
                    m.destroy()
                    handler(i)
                }}/>
            </>
        )
    })
}


const UnfinishedSimpleDetectTaskList: React.FC<SimpleDetectBatchTaskListProp> = (props) => {
    const [tasks, setTasks] = useState<UnfinishedSimpleDetectBatchTask[]>([]);
    const [loading, setLoading] = useState(false)

    const update = () => {
        setLoading(true)
        ipcRenderer.invoke("GetSimpleDetectUnfinishedTask", {}).then((e: { Tasks: UnfinishedSimpleDetectBatchTask[] }) => {
            setTasks(e.Tasks.reverse())
        }).catch((e) => {
            failed(`获取未完成的任务失败: ${e}`)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }
    useEffect(() => {
        update()
    }, [])

    return <List<UnfinishedSimpleDetectBatchTask>
        loading={loading}
        dataSource={tasks || []}
        renderItem={i => {
            return <AutoCard size={"small"} hoverable={true} style={{marginBottom: 6}}>
                <Space>
                    <Tag color={"geekblue"}>{formatTimestamp(i.CreatedAt)}</Tag>
                    <Tag color={"red"}>{i.TaskName}</Tag>
                    <div style={{width: 230, marginRight: 8}}>
                        <Progress percent={parseInt((i.Percent * 100).toFixed(2))}/>
                    </div>
                    <Popconfirm title={"启动任务"}
                                onConfirm={() => {
                                    // 先get GetSimpleDetectUnfinishedTaskByUid

                                    // ipcRenderer.invoke("GetSimpleDetectUnfinishedTaskByUid",{
                                    //     Uid : i.Uid
                                    // }).then((e )=>{
                                    //     console.log(e)
                                    // })
                                    // ipcRenderer.invoke("RecoverSimpleDetectUnfinishedTask",)
                                    props.handler(i)
                                }}
                    >
                        <Button size={"small"} type={"primary"}>
                            继续任务
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title={"删除这个任务？"}
                        onConfirm={() => {
                            ipcRenderer.invoke("PopSimpleDetectUnfinishedTaskByUid", {Uid: i.Uid}).then((i: TargetRequest) => {
                                info("未完成的任务已删除")
                            }).finally(() => update())
                        }}
                    >
                        <Button
                            size={"small"} type={"link"} icon={<DeleteOutlined/>}
                            danger={true}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            </AutoCard>
        }}
    >

    </List>
};



export const showUnfinishedSimpleDetectTaskList = (handler: (i: UnfinishedSimpleDetectBatchTask) => any) => {
    let m = showModal({
        title: "未完成的任务：点击任务可继续执行",
        width: 850,
        content: (
            <>
                <UnfinishedSimpleDetectTaskList handler={(i) => {
                    m.destroy()
                    handler(i)
                }}/>
            </>
        )
    })
}