import React, {useEffect, useState} from "react";
import {Empty, List, PageHeader, Space, Spin, Tag, Tooltip} from "antd";
import {ResizeBox} from "../../components/ResizeBox";
import {AutoCard} from "../../components/AutoCard";
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema";
import {useGetState, useMemoizedFn} from "ahooks";
import {failed} from "../../utils/notification";
import {formatTimestamp} from "../../utils/timeUtil";
import {QuestionOutlined, ReloadOutlined} from "@ant-design/icons";
import {Report} from "./models";
import {ReportViewer} from "./ReportViewer";
import {report} from "process";

export interface ReportViewerPageProp {
}

export const ReportViewerPage: React.FC<ReportViewerPageProp> = (props) => {
    const [_, setReport, getReport] = useGetState<Report>();

    return <>
        <ResizeBox
            isVer={false}
            firstNode={<ReportList onClick={setReport} selectedId={getReport()?.Id}/>}
            firstMinSize={"320px"}
            firstRatio={"320px"}
            secondNode={(() => {
                return <ReportViewer id={getReport()?.Id || 0}/>
            })()}
        />
    </>
};

export interface ReportListProp {
    onClick: (r: Report) => any
    selectedId?: number
}


interface QueryReports extends QueryGeneralRequest {
    Title: string
    Owner: string
    From: string
    Keyword: string
}

const {ipcRenderer} = window.require("electron");

export const ReportList: React.FC<ReportListProp> = React.memo((props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<Report>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [params, setParams] = useState<QueryReports>({
        From: "",
        Keyword: "",
        Owner: "",
        Pagination: genDefaultPagination(),
        Title: ""
    })
    const [loading, setLoading] = useState(false);
    const pagination = params.Pagination;
    const total = response.Total;

    const update = useMemoizedFn((page?: number, limit?: number) => {
        const pagination = {...params.Pagination};
        if (!!page) {
            pagination.Page = page
        }
        if (!!limit) {
            pagination.Limit = limit
        }
        setLoading(true)
        ipcRenderer.invoke("QueryReports", {
            ...params,
            Pagination: pagination
        }).then((rsp: QueryGeneralResponse<Report>) => {
            if (rsp) setResponse(rsp)
        }).catch(e => {
            failed("Query Reports Failed")
            console.info(e)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update()
    }, [])

    return <AutoCard
        title={<Space>
            报告列表
        </Space>} size={"small"} loading={loading} bordered={false}
        extra={<Space>
            <Tooltip title={<>{`点击列表中的报告检查内容`}</>}><a href="#"><QuestionOutlined/></a></Tooltip>
            <a href="#" onClick={() => {
                update(1)
            }}><ReloadOutlined/></a>
        </Space>}
    >
        <List
            renderItem={(item: Report) => {
                return <AutoCard
                    onClick={() => {
                        props.onClick(item)
                    }}
                    style={{marginBottom: 8, backgroundColor: props.selectedId === item.Id ? "#cfdfff" : undefined}}
                    size="small"
                    title={item.Title}
                    extra={<Tag>{formatTimestamp(item.PublishedAt)}</Tag>}
                    hoverable={true}
                >
                    <Space>
                        {item.Id && <Tag color={"red"}>ID:{item.Id}</Tag>}
                        {item.Owner && <Tag color={"green"}>发起人:{item.Owner}</Tag>}
                        {item.From && <Tag color={"orange"}>来源:{item.From}</Tag>}
                    </Space>
                </AutoCard>
            }}
            dataSource={response.Data || []}
            pagination={{
                size: "small",
                pageSize: pagination?.Limit || 10, simple: true,
                total, showTotal: (i) => <Tag>共{i}条历史记录</Tag>,
                onChange: (page: number, limit?: number) => {
                    update(page, limit)
                }
            }}>

        </List>
    </AutoCard>
});