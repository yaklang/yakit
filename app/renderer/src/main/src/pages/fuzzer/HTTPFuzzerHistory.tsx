import React, {useEffect, useState} from "react";
import {Button, Card, Divider, Form, List, Popconfirm, Popover, Space, Tag, Tooltip} from "antd";
import {formatTimestamp} from "../../utils/timeUtil";
import {ReloadOutlined, DeleteOutlined} from "@ant-design/icons";
import {useMemoizedFn} from "ahooks";
import {info} from "../../utils/notification";
import {PaginationSchema} from "@/pages/invoker/schema";
import {HistoryHTTPFuzzerTask} from "@/pages/fuzzer/HTTPFuzzerPage";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {HTTPPacketEditor, YakEditor} from "@/utils/editors";
import {InputItem} from "@/utils/inputUtil";
import {QuestionOutlined} from "@ant-design/icons/lib";

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
    Host?: string
    Port?: number
    onReload?: () => any
}

interface HTTPFuzzerTaskDetail {
    BasicInfo: HTTPFuzzerTask
    OriginRequest: HistoryHTTPFuzzerTask
}

/*
* message HistoryHTTPFuzzerTaskDetail {
  HistoryHTTPFuzzerTask BasicInfo = 1;
  FuzzerRequest OriginRequest = 2;
}
* */

export const HTTPFuzzerHistorySelector: React.FC<HTTPFuzzerHistorySelectorProp> = React.memo((props) => {
    const [tasks, setTasks] = useState<HTTPFuzzerTaskDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [paging, setPaging] = useState<PaginationSchema>({Limit: 10, Order: "desc", OrderBy: "created_at", Page: 1})
    const [keyword, setKeyword] = useState("");
    const [total, setTotal] = useState(0);
    const page = paging.Page;
    const limit = paging.Limit;

    const deleteAll = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("DeleteHistoryHTTPFuzzerTask", {}).then(() => {
            info("Delete History")
            reload(1, limit)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    const reload = useMemoizedFn((pageInt: number, limitInt: number) => {
        setLoading(true)
        ipcRenderer.invoke("QueryHistoryHTTPFuzzerTaskEx", {
            Pagination: {...paging, Page: pageInt, Limit: limitInt},
            Keyword: keyword,
        }).then((data: { Data: HTTPFuzzerTaskDetail[], Total: number, Pagination: PaginationSchema }) => {
            setTasks(data.Data)
            setTotal(data.Total)
            setPaging(data.Pagination)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })
    useEffect(() => {
        reload(1, limit)
    }, [])

    return <Card size={"small"} bordered={false} title={<Space>
        Web Fuzzer History
        <Button type={"link"} size={"small"} icon={<ReloadOutlined/>} onClick={e => {
            reload(1, limit)
        }}/>
        <Popconfirm title={"确定删除吗？"} onConfirm={() => {
            deleteAll()
        }}>
            <Button type={"link"} size={"small"} danger={true}
                    icon={<DeleteOutlined/>}
            />
        </Popconfirm>
    </Space>}>
        <Form size={"small"} layout={"inline"} onSubmitCapture={e => {
            e.preventDefault()

            reload(1, limit)
        }}>
            <InputItem
                label={<div>
                    快速搜索
                    <Tooltip title={"快速搜索 Host 与 Request 中的内容"}>
                        <Button type={"link"} icon={<QuestionOutlined/>}/>
                    </Tooltip>
                </div>} extraFormItemProps={{style: {marginBottom: 0}}}
                value={keyword} setValue={setKeyword}
            />
        </Form>
        <Divider style={{marginTop: 10, marginBottom: 6}}/>
        <List<HTTPFuzzerTaskDetail>
            loading={loading}
            dataSource={tasks}
            // pagination={{total: tasks.length, size: "small", pageSize: 10}}
            pagination={{
                size: "small",
                pageSize: limit,
                showSizeChanger: true,
                total,
                pageSizeOptions: ["5", "10", "20"],
                onChange: (page: number, limit?: number) => {
                    reload(page, limit || 10)
                    // dispatch({type: "updateParams", payload: {page, limit}})
                    // submit(page, limit)
                },
                onShowSizeChange: (old, limit) => {
                    reload(page, limit || 10)
                    // dispatch({type: "updateParams", payload: {page: 1, limit}})
                    // submit(1, limit)
                }
            }}
            renderItem={(detail: HTTPFuzzerTaskDetail) => {
                const i = detail.BasicInfo;
                let verbose = detail.OriginRequest.Verbose;
                if (!verbose) {
                    const rawToStr = Uint8ArrayToString(detail.OriginRequest.RequestRaw);
                    if (!rawToStr) {
                        verbose = detail.OriginRequest.Request
                    } else {
                        verbose = rawToStr
                    }
                }
                return <List.Item key={i.Id} style={{padding: 2}}>
                    <Popover placement={"rightBottom"} content={(
                        <div style={{width: 600, height: 300}}>
                            <HTTPPacketEditor
                                originValue={StringToUint8Array(verbose || "")} readOnly={true}
                                noMinimap={true} noHeader={true}
                            />
                        </div>
                    )}>
                        <Card
                            size={"small"}
                            style={{marginBottom: 4, width: "100%"}}
                            bodyStyle={{paddingTop: 4, paddingBottom: 4}}
                            hoverable={true}
                            onClick={e => {
                                e.preventDefault()

                                props.onSelect(i.Id)
                            }}
                            bordered={false}
                        >
                            <Space size={4} style={{display: "flex", flexDirection: "row"}}>
                                <div>
                                    {`ID:${i.Id}`}
                                </div>
                                <Tag color={"geekblue"}>{!!i.Host ? i.Host : formatTimestamp(i.CreatedAt)}</Tag>
                                <Tag>共{i.HTTPFlowTotal}个</Tag>
                                {i.HTTPFlowSuccessCount != i.HTTPFlowTotal &&
                                <div style={{flex: 1, alignItems: "right", textAlign: "right"}}>
                                    <Tag>成功:{i.HTTPFlowSuccessCount}个</Tag>
                                </div>}
                            </Space>
                        </Card>
                    </Popover>
                </List.Item>
            }}
        />
    </Card>
});