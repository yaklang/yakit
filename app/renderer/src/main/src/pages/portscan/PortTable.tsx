import React, {useState} from "react";
import {Button, Form, Modal, Table, Tag} from "antd";
import {YakitPort} from "../../components/yakitLogSchema";
import {CopyableField, InputItem} from "../../utils/inputUtil";
import {formatTimestamp} from "../../utils/timeUtil";
import {failed} from "../../utils/notification";

export interface PortTableProp {
    data: YakitPort[]
}


const {ipcRenderer} = window.require("electron");

export const OpenPortTableViewer: React.FC<PortTableProp> = (props) => {
    return <Table<YakitPort>
        size={"small"} bordered={true}
        title={e => {
            return <>开放端口 / Open Ports</>
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
                title: "指纹", render: (i: YakitPort) => i.fingerprint ? <div style={{width: 200, overflow: "auto"}}>
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
