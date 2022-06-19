import React, {useEffect, useState} from "react";
import {Button, Col, List, Popconfirm, Progress, Row, Space, Tag} from "antd";
import {AutoCard} from "../../../components/AutoCard";
import {showModal} from "../../../utils/showModal";
import {formatTimestamp} from "../../../utils/timeUtil";

interface UnfinishedBatchTaskListProp {
    handler: (i: UnfinishedBatchTask) => any
}

export interface UnfinishedBatchTask {
    Uid: string
    CreatedAt: number
    Percent: number
}

const {ipcRenderer} = window.require("electron");

const UnfinishedBatchTaskList: React.FC<UnfinishedBatchTaskListProp> = (props) => {
    const [tasks, setTasks] = useState<UnfinishedBatchTask[]>([]);

    useEffect(() => {
        ipcRenderer.invoke("GetExecBatchYakScriptUnfinishedTask", {}).then((e: { Tasks: UnfinishedBatchTask[] }) => {
            console.info(e)
            setTasks(e.Tasks)
        })
    }, [])

    return <List<UnfinishedBatchTask>
        dataSource={tasks || []}
        renderItem={i => {
            return <Popconfirm
                title={"在新 Tab 页启动未完成的任务？"}
                onConfirm={() => {
                    props.handler(i)
                }}
            >
                <AutoCard size={"small"} hoverable={true}>
                    <Space>
                        <Tag color={"geekblue"}>{formatTimestamp(i.CreatedAt)}</Tag>
                        <div style={{width: 230}}>
                            <Progress percent={parseInt((i.Percent * 100).toFixed(2))}/>
                        </div>
                    </Space>
                </AutoCard>
            </Popconfirm>
        }}
    >

    </List>
};

export const showUnfinishedBatchTaskList = (handler: (i: UnfinishedBatchTask) => any) => {
    let m = showModal({
        title: "未完成的任务：点击任务可继续执行",
        width: 520,
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