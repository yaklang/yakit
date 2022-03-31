import React, {useEffect, useState} from "react";
import {Button, Card, List, Popconfirm, Space, Tag} from "antd";
import {formatTimestamp} from "../../utils/timeUtil";
import {ReloadOutlined, DeleteOutlined} from "@ant-design/icons";
import {useMemoizedFn} from "ahooks";
import {info} from "../../utils/notification";

export interface HTTPFuzzerHistorySelectorProp {
    onSelect: (i: number) => any
}

const {ipcRenderer} = window.require("electron");

interface HTTPFuzzerTask {
    Id: number
    CreatedAt: number
    HTTPFlowTotal: number
    HTTPFlowSuccessCount: number
    HTTPFlowFailedCount: number
    onReload?: () => any
}

export const HTTPFuzzerHistorySelector: React.FC<HTTPFuzzerHistorySelectorProp> = React.memo((props) => {
    const [tasks, setTasks] = useState<HTTPFuzzerTask[]>([]);
    const [loading, setLoading] = useState(false);

    const deleteAll = useMemoizedFn(()=>{
        setLoading(true)
        ipcRenderer.invoke("DeleteHistoryHTTPFuzzerTask", {}).then(()=>{
            info("Delete History")
            reload()
        }).finally(()=>setTimeout(()=>setLoading(false), 300))
    })

    const reload = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("QueryHistoryHTTPFuzzerTask", {}).then((data: { Tasks: HTTPFuzzerTask[] }) => {
            setTasks(data.Tasks)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })
    useEffect(() => {
        reload()
    }, [])

    return <Card size={"small"} bordered={false} title={<Space>
        Web Fuzzer History
        <Button type={"link"} size={"small"} icon={<ReloadOutlined/>} onClick={e => {
            reload()
        }}/>
        <Popconfirm title={"确定删除吗？"} onConfirm={()=>{
            deleteAll()
        }}>
            <Button type={"link"} size={"small"} danger={true}
                    icon={<DeleteOutlined />}
            />
        </Popconfirm>
    </Space>}>
        <List<HTTPFuzzerTask>
            loading={loading}
            dataSource={tasks} pagination={{total: tasks.length, size: "small", pageSize: 10}}
            renderItem={(i: HTTPFuzzerTask) => {
                return <Card size={"small"} style={{marginBottom: 8}} hoverable={true} onClick={e => {
                    e.preventDefault()

                    props.onSelect(i.Id)
                }}>
                    <Space>
                        <div>
                            {`ID:${i.Id} ${formatTimestamp(i.CreatedAt)}`}
                        </div>
                        <Tag>共{i.HTTPFlowTotal}个</Tag>
                        {i.HTTPFlowSuccessCount != i.HTTPFlowTotal && <Tag>成功:{i.HTTPFlowSuccessCount}个</Tag>}
                    </Space>
                </Card>
            }}
        />
    </Card>
});