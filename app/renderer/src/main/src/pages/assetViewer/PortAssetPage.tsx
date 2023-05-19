import React, {useEffect, useState, useMemo} from "react"
import {
    Button,
    Checkbox,
    Col,
    Descriptions,
    Form,
    Modal,
    Popover,
    Row,
    Space,
    Table,
    Tag,
    Typography,
    Popconfirm,
    Tooltip,
    Divider,
    Collapse
} from "antd"
import {PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {failed, warn} from "../../utils/notification"
import {PortAsset} from "./models"
import {CopyableField, InputItem} from "../../utils/inputUtil"
import {formatTimestamp} from "../../utils/timeUtil"
import {HTTPFlow, TableFilterDropdownForm} from "../../components/HTTPFlowTable/HTTPFlowTable"
import {SearchOutlined, ReloadOutlined} from "@ant-design/icons"
import {ColumnsType, SorterResult} from "antd/lib/table/interface"
import {YakEditor} from "../../utils/editors"
import {openExternalWebsite} from "../../utils/openWebsite"
import {startExecYakCode} from "../../utils/basic"
import {OutputAsset} from "./outputAssetYakCode"
import {DropdownMenu} from "../../components/baseTemplate/DropdownMenu"
import {LineMenunIcon} from "../../assets/icons"
import {ExportExcel} from "../../components/DataExport/DataExport"
import {useCreation, useGetState, useMemoizedFn, useSelections} from "ahooks"
import {onRemoveToolFC} from "../../utils/deleteTool"
import {isCommunityEdition} from "@/utils/envfile"
import styles from "./PortAssetPage.module.scss"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {
    ArrowCircleRightSvgIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ChromeFrameSvgIcon,
    ExportIcon,
    PaperAirplaneIcon,
    TrashIcon
} from "@/assets/newIcon"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import classNames from "classnames"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"

const {ipcRenderer} = window.require("electron")
const {Panel} = Collapse
export interface PortAssetTableProp {
    closed?: boolean
    onClicked?: (i: PortAsset) => any
}

export interface QueryPortsRequest extends QueryGeneralRequest {
    Hosts: string
    Ports: string
    State: "open" | "closed" | "unknown"
    Service: string
}

const formatJson = (filterVal, jsonData) => {
    return jsonData.map((v, index) =>
        filterVal.map((j) => {
            if (j === "UpdatedAt") {
                return formatTimestamp(v[j])
            } else if (j === "Host") {
                return `${v[j]}:${v["Port"]}`
            } else {
                return v[j]
            }
        })
    )
}

export const PortAssetTable: React.FC<PortAssetTableProp> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<PortAsset>>({
        Data: [],
        Pagination: {
            Limit: 20,
            Page: 1,
            OrderBy: "desc",
            Order: "updated_at"
        } as PaginationSchema,
        Total: 0
    })
    const [params, setParams, getParams] = useGetState<QueryPortsRequest>({
        Hosts: "",
        Ports: "",
        Service: "",
        State: props.closed ? "closed" : "open",
        Pagination: {
            Limit: 15,
            Page: 1,
            OrderBy: "desc",
            Order: "updated_at"
        }
    })
    const [loading, setLoading] = useState(false)
    const [outputByNetwork, setOutputByNetwork] = useState("")
    const [checkedURL, setCheckedURL] = useState<string[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [checkedAll, setCheckedAll] = useState<boolean>(false)
    const [allResponse, setAllResponse] = useState<QueryGeneralResponse<PortAsset>>({
        Data: [],
        Pagination: {
            Limit: 15,
            Page: 1,
            OrderBy: "desc",
            Order: "updated_at"
        } as PaginationSchema,
        Total: 0
    })

    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [advancedConfig, setAdvancedConfig] = useState(true)
    const selectedId = useCreation<string[]>(() => {
        return allResponse.Data.map((i) => `${i.Id}`)
    }, [allResponse.Data])
    const {
        selected,
        allSelected,
        isSelected,
        select,
        unSelect,
        selectAll,
        unSelectAll,
        setSelected,
        partiallySelected
    } = useSelections<string>(selectedId)
    useEffect(() => {
        if (checkedAll) {
            setSelectedRowKeys(allResponse.Data.map((item) => item.Id.toString()))
            setCheckedURL(allResponse.Data.map((item) => `${item.Host}:${item.Port}`))
        }
    }, [checkedAll])

    useEffect(() => {
        getAllData()
    }, [])
    const getAllData = () => {
        ipcRenderer
            .invoke("QueryPorts", {
                All: true,
                State: props.closed ? "closed" : "open"
            })
            .then((data: QueryGeneralResponse<PortAsset>) => {
                setAllResponse(data)
            })
            .catch((e: any) => {
                failed("QueryPorts failed: " + `${e}`)
            })
            .finally(() => {})
    }

    const update = (current?: number, pageSize?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        ipcRenderer
            .invoke("QueryPorts", {
                ...getParams(),
                Pagination: {
                    Limit: pageSize || response.Pagination.Limit,
                    Page: current || response.Pagination.Page,
                    Order: order || "desc",
                    OrderBy: orderBy || "updated_at"
                }
            })
            .then((data) => {
                setResponse(data)
            })
            .catch((e: any) => {
                failed("QueryPorts failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }

    useEffect(() => {
        update()
    }, [])
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "网络地址",
                dataKey: "Host"
            },
            {
                title: "端口",
                dataKey: "Port",
                width: 100,
                render: (text) => <YakitTag color='blue'>{text}</YakitTag>
            },
            {
                title: "协议",
                dataKey: "Proto",
                width: 100,
                render: (text) => <YakitTag color='success'>{text}</YakitTag>
            },
            {
                title: "服务指纹",
                dataKey: "ServiceType"
            },
            {
                title: "Title",
                dataKey: "HtmlTitle"
            },
            {
                title: "最近更新时间",
                dataKey: "UpdatedAt",
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "操作",
                dataKey: "Action",
                width: 100,
                render: (_, i: PortAsset) => {
                    return (
                        <div className={styles["action-btn-group"]}>
                            <ChromeFrameSvgIcon
                                className={styles["icon-style"]}
                                onClick={() => {
                                    // ipcRenderer
                                    //     .invoke("GetHTTPFlowById", {Id: rowData?.Id})
                                    //     .then((i: HTTPFlow) => {
                                    //         showResponseViaResponseRaw(i?.Response)
                                    //     })
                                    //     .catch((e: any) => {
                                    //         failed(`Query HTTPFlow failed: ${e}`)
                                    //     })
                                }}
                            />
                            <div className={styles["divider-style"]}></div>

                            <ArrowCircleRightSvgIcon
                                className={styles["icon-style"]}
                                onClick={(e) => {
                                    // let m = showDrawer({
                                    //     width: "80%",
                                    //     content: onExpandHTTPFlow(rowData, () => m.destroy())
                                    // })
                                }}
                            />
                        </div>
                    )
                },
                fixed: "right"
            }
        ]
    }, [])

    const getData = useMemoizedFn((query) => {
        return new Promise((resolve) => {
            ipcRenderer
                .invoke("QueryPorts", {
                    ...params,
                    Pagination: {
                        ...query
                    }
                })
                .then((res: QueryGeneralResponse<PortAsset>) => {
                    const {Data} = res
                    //    数据导出
                    let exportData: any = []
                    const header: string[] = []
                    const filterVal: string[] = []
                    columns.forEach((item) => {
                        if (item.dataKey !== "Action") {
                            header.push(item.title)
                            filterVal.push(item.dataKey)
                        }
                    })
                    exportData = formatJson(filterVal, Data)
                    resolve({
                        header,
                        exportData,
                        response: res
                    })
                })
                .catch((e: any) => {
                    failed("数据导出失败 " + `${e}`)
                })
        })
    })
    const onRemove = useMemoizedFn(() => {
        const transferParams = {
            selectedRowKeys: checkedAll ? [] : selectedRowKeys,
            params,
            interfaceName: "DeletePorts"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                refList()
                setSelectedRowKeys([])
                setCheckedURL([])
                setCheckedAll(false)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const refList = useMemoizedFn(() => {
        setParams({
            Hosts: "",
            Ports: "",
            Service: "",
            State: props.closed ? "closed" : "open",
            Pagination: {
                Limit: 15,
                Page: 1,
                OrderBy: "desc",
                Order: "updated_at"
            }
        })

        setTimeout(() => {
            update()
        }, 10)
        setTimeout(() => {
            getAllData()
        }, 10)
    })
    return (
        // <Table<PortAsset>
        //     title={() => {
        //         return (
        //             <>
        //                 <Row>
        //                     <Col span={12}>
        //                         <Space>
        //                             端口资产列表
        //                             <Tooltip title='刷新会重置所有查询条件'>
        //                                 <Button
        //                                     icon={<ReloadOutlined/>}
        //                                     size={"small"}
        //                                     type={"link"}
        //                                     onClick={() => {
        //                                         refList()
        //                                     }}
        //                                 />
        //                             </Tooltip>
        //                         </Space>
        //                     </Col>
        //                     <Col span={12}></Col>
        //                 </Row>
        //                 <Row>
        //                     <Col span={12} style={{display: "flex", alignItems: "center"}}>
        //                         <Checkbox
        //                             checked={checkedAll}
        //                             onChange={(e) => {
        //                                 if (!e.target.checked) {
        //                                     setSelectedRowKeys([])
        //                                     setCheckedURL([])
        //                                 }
        //                                 setCheckedAll(e.target.checked)
        //                             }}
        //                             disabled={allResponse.Data.length === 0}
        //                         >
        //                             全选
        //                         </Checkbox>
        //                         {selectedRowKeys.length > 0 && (
        //                             <Tag color='blue'>
        //                                 已选{checkedAll ? allResponse.Total : selectedRowKeys?.length}条
        //                             </Tag>
        //                         )}
        //                     </Col>
        //                     <Col span={12} style={{textAlign: "right"}}>
        //                         <Space>
        //                             <ExportExcel getData={getData} btnProps={{size: "small"}}/>
        //                             <Popconfirm
        //                                 title={
        //                                     checkedAll
        //                                         ? "确定删除所有端口资产吗? 不可恢复"
        //                                         : "确定删除选择的端口资产吗？不可恢复"
        //                                 }
        //                                 onConfirm={onRemove}
        //                                 disabled={selectedRowKeys.length === 0}
        //                             >
        //                                 <Button size='small' danger={true} disabled={selectedRowKeys.length === 0}>
        //                                     删除端口
        //                                 </Button>
        //                             </Popconfirm>
        //                             {isCommunityEdition() && <DropdownMenu
        //                                 menu={{
        //                                     data: [
        //                                         {key: "bug-test", title: "发送到漏洞检测"},
        //                                         {key: "scan-port", title: "发送到端口扫描"},
        //                                         {key: "brute", title: "发送到爆破"}
        //                                     ]
        //                                 }}
        //                                 dropdown={{placement: "bottomRight"}}
        //                                 onClick={(key) => {
        //                                     if (checkedURL.length === 0) {
        //                                         failed("请最少选择一个选项再进行操作")
        //                                         return
        //                                     }
        //                                     ipcRenderer.invoke("send-to-tab", {
        //                                         type: key,
        //                                         data: {URL: JSON.stringify(checkedURL)}
        //                                     })
        //                                 }}
        //                             >
        //                                 <Button type='link' icon={<LineMenunIcon/>}></Button>
        //                             </DropdownMenu>}
        //                         </Space>
        //                     </Col>
        //                 </Row>
        //             </>
        //         )
        //     }}
        //     scroll={{x: "auto"}}
        //     size={"small"}
        //     bordered={true}
        //     rowKey={(row) => row.Id}
        //     onRow={(r) => {
        //         return {
        //             onClick: (e) => {
        //                 // props.onClicked && props.onClicked(r)
        //             }
        //         }
        //     }}
        //     expandable={{
        //         expandedRowRender: (record) => <PortAssetDescription port={record}/>
        //     }}
        //     loading={loading}
        //     columns={columns || []}
        //     dataSource={response.Data}
        //     pagination={{
        //         size: "small",
        //         pageSize: response.Pagination?.Limit || 10,
        //         total: response.Total,
        //         showTotal: (i) => <Tag>共{i}条记录</Tag>,
        //         showSizeChanger: true,
        //         showLessItems: true
        //     }}
        //     // @ts-ignore*/
        //     onChange={(paging: any, _: any, sorter: SorterResult<HTTPFlow>) => {
        //         if (sorter.order && sorter.columnKey) {
        //             update(paging.current, paging.pageSize, sorter.order, `${sorter.columnKey}`)
        //         } else {
        //             update(paging.current, paging.pageSize)
        //         }
        //     }}
        //     rowSelection={{
        //         onChange: (selectedRowKeys, selectedRows) => {
        //             if (selectedRowKeys.length === allResponse.Data.length) setCheckedAll(true)
        //             else {
        //                 setCheckedAll(false)
        //             }
        //             setSelectedRowKeys(selectedRowKeys as string[])
        //             setCheckedURL(selectedRows.map((item) => `${item.Host}:${item.Port}`))
        //         },
        //         selectedRowKeys
        //     }}
        // ></Table>
        <div className={styles["portAsset-content"]}>
            <div className={styles["portAsset"]}>
                <div className={styles["portAsset-head"]}>
                    <div className={styles["head-title"]}>端口资产列表</div>
                    <div className={styles["head-extra"]}>
                        <YakitInput.Search
                            placeholder='请输入端口、网络地址、服务指纹、title 等关键词搜索'
                            style={{width: 320}}
                        />
                        {!advancedConfig && (
                            <>
                                <Divider type='vertical' style={{margin: "0 16px"}} />
                                <span style={{marginRight: 4}}>高级筛选</span>
                                <YakitSwitch checked={advancedConfig} onChange={setAdvancedConfig} />
                            </>
                        )}
                    </div>
                </div>
                <div className={styles["portAsset-table"]}>
                    <TableVirtualResize<PortAsset>
                        containerClassName={styles["portAsset-table-list-container"]}
                        isRefresh={isRefresh}
                        isShowTotal={true}
                        extra={
                            <div className={styles["table-head-extra"]}>
                                <YakitButton type='outline2' icon={<TrashIcon className={styles["table-head-icon"]} />}>
                                    批量删除
                                </YakitButton>
                                <YakitButton
                                    type='outline2'
                                    icon={<ExportIcon className={styles["table-head-icon"]} />}
                                >
                                    导出 Excel
                                </YakitButton>
                                <YakitPopover
                                    content={
                                        <YakitMenu
                                            type='grey'
                                            data={[
                                                {label: "发送到漏洞检测", key: "bug-test"},
                                                {label: "发送到端口扫描", key: "scan-port"},
                                                {label: "发送到爆破", key: "brute"}
                                            ]}
                                            onClick={({key}) => {
                                                ipcRenderer.invoke("send-to-tab", {
                                                    type: key,
                                                    data: {URL: JSON.stringify(checkedURL)}
                                                })
                                            }}
                                        />
                                    }
                                    trigger='click'
                                    placement='bottomRight'
                                    overlayClassName={styles["table-head-send-popover"]}
                                >
                                    <YakitButton
                                        onClick={() => {}}
                                        icon={<PaperAirplaneIcon style={{height: 16}} />}
                                        type={"primary"}
                                        // disabled={checkedURL.length === 0}
                                    >
                                        发送到...
                                    </YakitButton>
                                </YakitPopover>
                            </div>
                        }
                        renderKey='Id'
                        data={response.Data}
                        rowSelection={{
                            isAll: allSelected,
                            type: "checkbox",
                            selectedRowKeys: selected,
                            onSelectAll: (newSelectedRowKeys: string[], selected: PortAsset[], checked: boolean) => {
                                if (checked) {
                                    selectAll()
                                } else {
                                    unSelectAll()
                                }
                            },
                            onChangeCheckboxSingle: (c: boolean, keys: string) => {
                                console.log("keys", keys, c)
                                if (c) {
                                    select(keys)
                                } else {
                                    unSelect(keys)
                                }
                            }
                        }}
                        pagination={{
                            total: response.Total,
                            limit: response.Pagination.Limit,
                            page: response.Pagination.Page,
                            onChange: update
                        }}
                        loading={loading}
                        columns={columns}
                        // currentSelectItem={currentItem}
                        // onRowClick={onSetCurrentRow}
                        enableDrag={true}
                    />
                </div>
            </div>
            <PortAssetQuery visible={advancedConfig} setVisible={setAdvancedConfig} />
        </div>
    )
}

interface PortAssetQueryProps {
    visible: boolean
    setVisible: (b: boolean) => void
}
const PortAssetQuery: React.FC<PortAssetQueryProps> = React.memo((props) => {
    const {visible, setVisible} = props
    const [activeKey, setActiveKey] = useState<string[]>(["database", "web-server"]) // Collapse打开的key
    return (
        <div
            className={classNames("yakit-collapse", styles["portAsset-query"])}
            style={{display: visible ? "" : "none"}}
        >
            <div className={styles["query-head"]}>
                <span>高级筛选</span>
                <YakitSwitch checked={visible} onChange={setVisible} />
            </div>
            <Collapse
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                ghost
                expandIcon={(e) => (e.isActive ? <ChevronDownIcon /> : <ChevronRightIcon />)}
                className={styles["query-collapse"]}
            >
                <Panel
                    header='数据库'
                    key='database'
                    extra={
                        <YakitButton
                            type='text'
                            className='button-text-danger'
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                        >
                            清空
                        </YakitButton>
                    }
                >
                    数据库
                </Panel>
                <Panel
                    header='Web 服务器'
                    key='web-server'
                    extra={
                        <YakitButton
                            type='text'
                            className='button-text-danger'
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                        >
                            清空
                        </YakitButton>
                    }
                >
                    Web 服务器
                </Panel>
            </Collapse>
        </div>
    )
})
export interface PortAssetDescriptionProp {
    port: PortAsset
}

export const PortAssetDescription: React.FC<PortAssetDescriptionProp> = (props) => {
    const {port} = props
    return (
        <Descriptions
            size={"small"}
            bordered={true}
            column={!port.ServiceType ? 1 : 2}
            title={""}
            style={{marginLeft: 20}}
        >
            <Descriptions.Item label={<Tag>状态</Tag>}>
                <CopyableField text={`${port.State}`} />
            </Descriptions.Item>
            {port.HtmlTitle && (
                <Descriptions.Item label={<Tag>Title</Tag>}>
                    <CopyableField text={`${port.HtmlTitle}`} />
                </Descriptions.Item>
            )}
            {port.ServiceType && (
                <Descriptions.Item span={2} label={<Tag>应用</Tag>}>
                    <CopyableField text={`${port.ServiceType}`} />
                </Descriptions.Item>
            )}
            {port.Reason && (
                <Descriptions.Item span={2} label={<Tag>失败原因</Tag>}>
                    <CopyableField text={`${port.Reason}`} />
                </Descriptions.Item>
            )}
            {port.CPE.join("|") !== "" ? (
                <Descriptions.Item span={2} label={<Tag>CPE</Tag>}>
                    <Space direction={"vertical"}>
                        {port.CPE.map((e) => {
                            return <CopyableField text={`${e}`} />
                        })}
                    </Space>
                </Descriptions.Item>
            ) : undefined}
            {port.Fingerprint && (
                <Descriptions.Item span={2} label={<Tag>指纹信息</Tag>}>
                    <div style={{height: 200}}>
                        <YakEditor value={port.Fingerprint} noLineNumber={true} noMiniMap={true} />
                    </div>
                </Descriptions.Item>
            )}
        </Descriptions>
    )
}
