import React, {useEffect, useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import {Empty, Space, Table, Tag} from "antd";
import {QueryCVERequest} from "@/pages/cve/CVEViewer";
import {useDebounceEffect, useMemoizedFn} from "ahooks";
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "@/pages/invoker/schema";
import {ResizeBox} from "@/components/ResizeBox";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {OneLine} from "@/utils/inputUtil";
import {CVEDetail} from "@/pages/cve/models";
import {CVEInspect} from "@/pages/cve/CVEInspect";

export interface CVETableProp {
    filter: QueryCVERequest
}

const {ipcRenderer} = window.require("electron");

export const CVETable: React.FC<CVETableProp> = (props) => {
    const [params, setParams] = useState<QueryCVERequest>({...props.filter});
    const [data, setData] = useState<CVEDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationSchema>(genDefaultPagination(10, 1));
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<string>();
    const [selectedKeys, setSelectedKeys] = useState<any>();
    const limit = pagination.Limit;

    useDebounceEffect(() => {
        setParams(props.filter)
        update(1)
    }, [props.filter], {wait: 1000})

    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        const finalParams = {
            ...params, ...extraParam ? extraParam : {}, Pagination: paginationProps,
        };
        console.info(finalParams)
        ipcRenderer.invoke("QueryCVE", finalParams).then((r: QueryGeneralResponse<CVEDetail>) => {
            console.info(r)
            setData(r.Data);
            setPagination(r.Pagination)
            setTotal(r.Total)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1)
    }, [])

    useEffect(() => {
        if (!selectedKeys) {
            return
        }
        try {
            (selectedKeys as []).map(i => {
                setSelected(i)
            })
        } catch (e) {

        }
    }, [selectedKeys])

    return <AutoCard
        loading={loading} style={{height: "100%"}}
        bordered={false} size={"small"} title={"CVE 数据库管理"}
        bodyStyle={{overflowY: "hidden"}}
        extra={<div>
            <YakitButton
                loading={loading}
                size={"small"}
                onClick={() => {
                    alert(1)
                }}
            >数据库更新</YakitButton>
        </div>}
    >
        <ResizeBox
            isVer={true}
            firstNode={<AutoCard style={{margin: 0, padding: 0, height: "100%"}}
                                 bodyStyle={{margin: 0, padding: 0, overflowY: "auto"}}>
                <Table<CVEDetail>
                    size={"small"}
                    style={{height: '100%'}}
                    rowKey={(i: CVEDetail) => i.CVE}
                    pagination={{
                        pageSize: limit,
                        showSizeChanger: true,
                        total,
                        pageSizeOptions: ["5", "10", "20"],
                        onChange: (page: number, limit?: number) => {
                            update(page, limit)
                        },
                        onShowSizeChange: (old, limit) => {
                            update(1, limit)
                        }
                    }}

                    rowSelection={{
                        type: "radio",
                        selectedRowKeys: selectedKeys,
                        onChange: setSelectedKeys,
                    }}
                    onRow={(record) => ({
                        onClick: () => {
                            setSelectedKeys([record.CVE]); // 更新当前选中的行
                        },
                    })}
                    dataSource={data}
                    columns={[
                        {title: "CVE编号", render: (i: CVEDetail) => i.CVE, width: 160},
                        {
                            title: "概述", render: (i: CVEDetail) => <Space size={1}>
                                <OneLine maxWidth={300} overflow={"hidden"}>
                                    {i.Title || i.DescriptionZh || i.DescriptionOrigin}
                                </OneLine>
                                {i.CWE && i.CWE.split("|").map(a => {
                                    return <Tag color={"red"}>{`${a.trim()}`}</Tag>
                                })}
                            </Space>
                        },
                        {
                            title: "相关产品", render: (i: CVEDetail) => {
                                return i.Product
                            }
                        },
                        {
                            title: "级别", render: (i: CVEDetail) => {
                                let color = "green";
                                if (i.BaseCVSSv2Score > 8.0 || i.Severity === "CRITICAL" || i.Severity == "HIGH") {
                                    color = "red"
                                } else if (i.BaseCVSSv2Score > 6.0) {
                                    color = "orange"
                                }
                                return <>
                                    <Tag color={color}>{i.Severity}</Tag>
                                    {i.BaseCVSSv2Score}
                                </>
                            }
                        },
                    ]}
                />
            </AutoCard>}
            secondNode={<CVEInspect CVE={selected}/>}
        />
    </AutoCard>
};
