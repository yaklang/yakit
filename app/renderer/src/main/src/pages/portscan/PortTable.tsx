import React, {useEffect, useState} from "react";
import {Button, Col, Row, Table, Tag} from "antd";
import {YakitPort} from "../../components/yakitLogSchema";
import {CopyableField, InputItem} from "../../utils/inputUtil";
import {formatTimestamp} from "../../utils/timeUtil";
import {failed} from "../../utils/notification";
import {DropdownMenu} from "../../components/baseTemplate/DropdownMenu";
import {LineMenunIcon} from "../../assets/icons";

export interface PortTableProp {
    data: YakitPort[]
}


const {ipcRenderer} = window.require("electron");

export const OpenPortTableViewer: React.FC<PortTableProp> = (props) => {
    const [checkedURL, setCheckedURL] = useState<string[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    useEffect(() => {
        if (props.data.length === 0) {
            setSelectedRowKeys([])
            setCheckedURL([])
        }
    }, [props.data])

    return <Table<YakitPort>
        size={"small"} bordered={true}
        rowKey={(row) => `${row.host}:${row.port}`}
        title={e => {
            return <Row>
                <Col span={12}>开放端口 / Open Ports</Col>
                <Col span={12} style={{textAlign: "right"}}>
                    <DropdownMenu
                        menu={{
                            data: [
                                {key: 'bug-test', title: "发送到漏洞检测"},
                                {key: 'brute', title: "发送到爆破"}
                            ]
                        }}
                        dropdown={{placement: "bottomRight"}}
                        onClick={(key) => {
                            if (checkedURL.length === 0) {
                                failed("请最少选择一个选项再进行操作")
                                return
                            }

                            ipcRenderer.invoke("send-to-tab", {
                                type: key,
                                data: {URL: JSON.stringify(checkedURL)}
                            })
                        }}
                    >
                        <Button type="link" style={{height: 16}} icon={<LineMenunIcon/>}></Button>
                    </DropdownMenu>
                </Col>
            </Row>
        }}
        dataSource={props.data}
        scroll={{x: "auto"}}
        columns={[
            {title: "主机地址", render: (i: YakitPort) => <CopyableField text={`${i.host}:${i.port}`}/>, fixed: "left",},
            {
                title: "HTML Title",
                render: (i: YakitPort) => i.htmlTitle ? <div style={{width: 150, overflow: "auto"}}>
                    <CopyableField
                        text={i.htmlTitle}
                    />
                </div> : "-",
                width: 150,
            },
            {
                title: "指纹", render: (i: YakitPort) => i.fingerprint ? <div style={{width: 200, overflowX: 'hidden'}}>
                    <CopyableField
                        text={i.fingerprint}
                    />
                </div> : "-", width: 230,
            },
            {title: "扫描时间", render: (i: YakitPort) => <Tag>{formatTimestamp(i.timestamp)}</Tag>},
        ]}
        pagination={{
            size: "small", pageSize: 12, pageSizeOptions: ["12", "15", "30", "50"],
            showSizeChanger: true,
        }}
        rowSelection={{
            onChange: (selectedRowKeys, selectedRows) => {
                setSelectedRowKeys(selectedRowKeys as string[])
                setCheckedURL(selectedRows.map(item => `${item.host}:${item.port}`))
            },
            selectedRowKeys
        }}
        // @ts-ignore*/
        onChange={(paging: any, _: any) => {
            setSelectedRowKeys([])
            setCheckedURL([])
        }}
    >

    </Table>
};

export const ClosedPortTableViewer: React.FC<PortTableProp> = (props) => {
    return <Table<YakitPort>
        size={"small"} bordered={true}
        title={e => {
            return <>未开放的端口 / Closed Ports</>
        }}
        dataSource={props.data}
        columns={[
            {title: "主机地址", render: (i: YakitPort) => <CopyableField text={`${i.host}:${i.port}`}/>},
            {title: "扫描时间", render: (i: YakitPort) => <Tag>{formatTimestamp(i.timestamp)}</Tag>},
        ]}
        pagination={{
            size: "small", pageSize: 12, pageSizeOptions: ["12", "15", "30", "50"],
            showSizeChanger: true,
        }}
    >

    </Table>
};
