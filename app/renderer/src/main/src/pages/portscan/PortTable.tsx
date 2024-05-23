import React, {useEffect, useState} from "react"
import {Button, Col, Row, Table, Tag, Tooltip, Checkbox} from "antd"
import {YakitPort} from "../../components/yakitLogSchema"
import {CopyableField, InputItem, OneLine} from "../../utils/inputUtil"
import {formatTimestamp} from "../../utils/timeUtil"
import {failed} from "../../utils/notification"
import {DropdownMenu} from "../../components/baseTemplate/DropdownMenu"
import {LineMenunIcon} from "../../assets/icons"
import {callCopyToClipboard} from "../../utils/basic"
import {ExportExcel} from "@/components/DataExport/DataExport"
import {useMemoizedFn} from "ahooks"
import {YakitRoute} from "@/routes/newRouteConstants"
import emiter from "@/utils/eventBus/eventBus"
export interface PortTableProp {
    data: YakitPort[]
    isSimple?: boolean
}

const formatJson = (filterVal, jsonData) => {
    return jsonData.map((v) =>
        filterVal.map((j) => {
            if (j === "host") return `${v.host}:${v.port}`
            if (j === "timestamp") return `${formatTimestamp(v[j])}`
            return v[j]
        })
    )
}

const {ipcRenderer} = window.require("electron")

export const OpenPortTableViewer: React.FC<PortTableProp> = (props) => {
    const [checkedURL, setCheckedURL] = useState<string[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [checkedAll, setCheckedAll] = useState<boolean>(false)
    const isSimple = props.isSimple || false
    useEffect(() => {
        if (checkedAll) {
            const rowKeys = props.data.map((item, index) => `${item.host}:${item.port}-${item.timestamp}`)
            setSelectedRowKeys(rowKeys)
            setCheckedURL(props.data.map((item) => `${item.host}:${item.port}`))
        }
    }, [checkedAll])

    useEffect(() => {
        if (props.data.length === 0) {
            setSelectedRowKeys([])
            setCheckedURL([])
        }
        if (props.data.length > selectedRowKeys.length) {
            setCheckedAll(false)
        }
    }, [props.data])

    const getData = useMemoizedFn(() => {
        return new Promise((resolve) => {
            const header = ["主机地址", "HTML Title", "指纹", "扫描时间"]
            const exportData = formatJson(["host", "htmlTitle", "fingerprint", "timestamp"], props.data)
            const params = {
                header,
                exportData,
                response: {
                    Pagination: {
                        Page: 1
                    },
                    Data: props.data,
                    Total: props.data.length
                }
            }
            resolve(params)
        })
    })
    /** 通知软件打开管理页面 */
    const openMenu = () => {
        ipcRenderer.invoke("open-route-page", {route: YakitRoute.DB_Ports})
    }
    return (
        <Table<YakitPort>
            size={"small"}
            bordered={true}
            rowKey={(row, index) => `${row.host}:${row.port}-${row.timestamp}`}
            title={(e) => {
                return (
                    <>
                        <Row>
                            <Col span={12}>开放端口 / Open Ports</Col>
                            <Col span={12} style={{textAlign: "right"}}>
                                {isSimple && (
                                    <div style={{fontSize: 14, color: "#1890ff", cursor: "pointer"}} onClick={openMenu}>
                                        查看完整数据
                                    </div>
                                )}
                            </Col>
                        </Row>
                        <Row>
                            <Col span={12} style={{display: "flex", alignItems: "center"}}>
                                <Checkbox
                                    style={{marginLeft: 8}}
                                    checked={checkedAll}
                                    onChange={(e) => {
                                        if (!e.target.checked) {
                                            setSelectedRowKeys([])
                                            setCheckedURL([])
                                        }
                                        setCheckedAll(e.target.checked)
                                    }}
                                    disabled={props.data.length === 0}
                                >
                                    全选
                                </Checkbox>
                                {selectedRowKeys.length > 0 && <Tag color='blue'>已选{selectedRowKeys?.length}条</Tag>}
                            </Col>
                            <Col span={12} style={{textAlign: "right"}}>
                                {!isSimple && (
                                    <>
                                        <ExportExcel getData={getData} btnProps={{size: "small"}} fileName='开放端口' />
                                        <DropdownMenu
                                            menu={{
                                                data: [
                                                    {key: "bug-test", title: "发送到漏洞检测"},
                                                    {key: "brute", title: "发送到爆破"}
                                                ]
                                            }}
                                            dropdown={{placement: "bottomRight"}}
                                            onClick={(key) => {
                                                if (checkedURL.length === 0) {
                                                    failed("请最少选择一个选项再进行操作")
                                                    return
                                                }
                                                switch (key) {
                                                    case "brute":
                                                        emiter.emit(
                                                            "openPage",
                                                            JSON.stringify({
                                                                route: YakitRoute.Mod_Brute,
                                                                params: {
                                                                    targets: checkedURL.join(",")
                                                                }
                                                            })
                                                        )
                                                        break
                                                    case "bug-test":
                                                        emiter.emit(
                                                            "openPage",
                                                            JSON.stringify({
                                                                route: YakitRoute.PoC,
                                                                params: {
                                                                    URL: JSON.stringify(checkedURL)
                                                                }
                                                            })
                                                        )
                                                        break
                                                    default:
                                                        break
                                                }
                                            }}
                                        >
                                            <Button type='link' style={{height: 16}} icon={<LineMenunIcon />}></Button>
                                        </DropdownMenu>
                                    </>
                                )}
                            </Col>
                        </Row>
                    </>
                )
            }}
            dataSource={props.data}
            scroll={{x: "auto"}}
            columns={[
                {
                    title: "主机地址",
                    render: (i: YakitPort) => {
                        const addr = `${i.host}:${i.port}`
                        return (
                            <Tooltip title={`点击复制`}>
                                <a
                                    href='#'
                                    onClick={() => {
                                        callCopyToClipboard(addr)
                                    }}
                                >
                                    {addr}
                                </a>
                            </Tooltip>
                        )
                    },
                    fixed: "left"
                },
                {
                    title: "HTML Title",
                    render: (i: YakitPort) =>
                        i.htmlTitle ? (
                            <Tooltip title={i?.htmlTitle}>
                                <OneLine width={150} overflow={"hidden"} title={i.htmlTitle}>
                                    {i?.htmlTitle}
                                </OneLine>
                            </Tooltip>
                        ) : (
                            "-"
                        ),
                    width: 150
                },
                {
                    title: "指纹",
                    render: (i: YakitPort) =>
                        i.fingerprint ? (
                            <>
                                <OneLine width={230} overflow={"hidden"} title={i.fingerprint} placement='topLeft'>
                                    {i?.fingerprint}
                                </OneLine>
                            </>
                        ) : (
                            "-"
                        ),
                    width: 230
                },
                {title: "扫描时间", render: (i: YakitPort) => <>{formatTimestamp(i.timestamp)}</>}
            ]}
            pagination={{
                size: "small",
                pageSizeOptions: ["12", "15", "30", "50"],
                showSizeChanger: true
            }}
            rowSelection={{
                onChange: (selectedRowKeys, selectedRows) => {
                    if (selectedRowKeys.length === props.data.length) setCheckedAll(true)
                    else {
                        setCheckedAll(false)
                    }
                    setSelectedRowKeys(selectedRowKeys as string[])
                    setCheckedURL(selectedRows.map((item) => `${item.host}:${item.port}`))
                },
                selectedRowKeys
            }}
        ></Table>
    )
}

export const ClosedPortTableViewer: React.FC<PortTableProp> = (props) => {
    return (
        <Table<YakitPort>
            size={"small"}
            bordered={true}
            title={(e) => {
                return <>未开放的端口 / Closed Ports</>
            }}
            dataSource={props.data}
            columns={[
                {title: "主机地址", render: (i: YakitPort) => <CopyableField text={`${i.host}:${i.port}`} />},
                {title: "扫描时间", render: (i: YakitPort) => <Tag>{formatTimestamp(i.timestamp)}</Tag>}
            ]}
            pagination={{
                size: "small",
                pageSize: 12,
                pageSizeOptions: ["12", "15", "30", "50"],
                showSizeChanger: true
            }}
        ></Table>
    )
}
