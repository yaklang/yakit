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
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {
    ArrowCircleRightSvgIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ChromeFrameSvgIcon,
    ExportIcon,
    PaperAirplaneIcon,
    SearchIcon,
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
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"

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
    const [params, setParams] = useGetState<QueryPortsRequest>({
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
    const [checkedURL, setCheckedURL] = useState<string[]>([])

    const [sendPopoverVisible, setSendPopoverVisible] = useState<boolean>(false)

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
        if (allSelected) {
            setCheckedURL(allResponse.Data.map((item) => `${item.Host}:${item.Port}`))
        }
    }, [allSelected])

    useEffect(() => {
        setCheckedURL(
            allResponse.Data.filter((e) => selected.includes(`${e.Id}`)).map((item) => `${item.Host}:${item.Port}`)
        )
    }, [selected])

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

    const update = (current: number, pageSize?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        ipcRenderer
            .invoke("QueryPorts", {
                ...params,
                Pagination: {
                    Limit: pageSize || response.Pagination.Limit,
                    Page: current || response.Pagination.Page,
                    Order: order || "desc",
                    OrderBy: orderBy || "updated_at"
                }
            })
            .then((rsp: QueryGeneralResponse<PortAsset>) => {
                if (Number(current) === 1) {
                    unSelectAll()
                    setIsRefresh(!isRefresh)
                }
                const d = current === 1 ? rsp.Data : response.Data.concat(rsp.Data)
                setResponse({
                    Total: current === 1 ? rsp.Total : response.Total,
                    Pagination: {
                        ...rsp.Pagination
                    },
                    Data: d
                })
            })
            .catch((e: any) => {
                failed("QueryPorts failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }

    useEffect(() => {
        update(1)
    }, [])
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "网络地址",
                dataKey: "Host",
                filterProps: {
                    filterIcon: <SearchIcon />,
                    filtersType: "input"
                }
            },
            {
                title: "端口",
                dataKey: "Port",
                width: 100,
                filterProps: {
                    filterIcon: <SearchIcon />,
                    filtersType: "input"
                },
                render: (text) => <YakitTag color='blue'>{text}</YakitTag>
            },
            {
                title: "协议",
                dataKey: "Proto",
                width: 100,
                filterProps: {
                    filterIcon: <SearchIcon />,
                    filtersType: "input"
                },
                render: (text) => <YakitTag color='success'>{text}</YakitTag>
            },
            {
                title: "服务指纹",
                dataKey: "ServiceType",
                filterProps: {
                    filterKey: "Service",
                    filterIcon: <SearchIcon />,
                    filtersType: "input"
                }
            },
            {
                title: "Title",
                dataKey: "HtmlTitle",
                beforeIconExtra: (
                    <div className={styles["htmlTitle-extra"]}>
                        <YakitCheckbox /> <span className={styles["valid-data"]}>有效数据</span>
                    </div>
                ),
                filterProps: {
                    filterKey: "Title",
                    filterIcon: <SearchIcon />,
                    filtersType: "input"
                }
            },
            {
                title: "最近更新时间",
                dataKey: "UpdatedAt",
                render: (text) => (text ? formatTimestamp(text) : "-")
            },
            {
                title: "操作",
                dataKey: "Action",
                width: 90,
                render: (_, i: PortAsset) => {
                    return (
                        <div className={styles["action-btn-group"]}>
                            <ChromeFrameSvgIcon
                                className={styles["icon-style"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    openExternalWebsite(`http://${i.Host}:${i.Port}`)
                                }}
                            />
                            <div className={styles["divider-style"]}></div>

                            <ArrowCircleRightSvgIcon
                                className={styles["icon-style"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    let m = showYakitDrawer({
                                        width: "60%",
                                        title: "详情",
                                        content: <PortAssetDescription port={i} />
                                    })
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
            selectedRowKeys: allSelected ? [] : selected,
            params,
            interfaceName: "DeletePorts"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                refList()
                setCheckedURL([])
                unSelectAll()
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
            update(1)
        }, 10)
        setTimeout(() => {
            getAllData()
        }, 10)
    })
    const onTableChange = useMemoizedFn((page: number, limit: number, _, filter: any) => {
        setParams({
            ...params,
            ...filter
        })
        setTimeout(() => {
            update(1)
        }, 100)
    })
    return (
        <div className={styles["portAsset-content"]}>
            <div className={styles["portAsset"]}>
                <div className={styles["portAsset-head"]}>
                    <div className={styles["head-title"]}>端口资产列表</div>
                    <div className={styles["head-extra"]}>
                        <YakitInput.Search
                            placeholder='请输入端口、网络地址、服务指纹、title 等关键词搜索'
                            style={{width: 320}}
                            onSearch={() => update(1)}
                            onPressEnter={() => update(1)}
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
                                <ExportExcel
                                    newUI={true}
                                    newBtnProps={{
                                        type: "outline2",
                                        icon: <ExportIcon className={styles["table-head-icon"]} />
                                    }}
                                    getData={getData}
                                />
                                <YakitPopconfirm
                                    title={"确定删除吗？"}
                                    onConfirm={() => {
                                        onRemove()
                                    }}
                                    placement='bottomRight'
                                >
                                    <YakitButton
                                        type='outline2'
                                        icon={<TrashIcon className={styles["table-head-icon"]} />}
                                    >
                                        {checkedURL.length ? "删除" : "清空"}
                                    </YakitButton>
                                </YakitPopconfirm>

                                <YakitPopover
                                    content={
                                        <YakitMenu
                                            type='grey'
                                            data={[
                                                {
                                                    label: "发送到漏洞检测",
                                                    key: "bug-test"
                                                },
                                                {
                                                    label: "发送到端口扫描",
                                                    key: "scan-port"
                                                },
                                                {label: "发送到爆破", key: "brute"}
                                            ]}
                                            onClick={({key}) => {
                                                ipcRenderer
                                                    .invoke("send-to-tab", {
                                                        type: key,
                                                        data: {URL: JSON.stringify(checkedURL)}
                                                    })
                                                    .then(() => {
                                                        setSendPopoverVisible(false)
                                                    })
                                            }}
                                        />
                                    }
                                    trigger='click'
                                    placement='bottomRight'
                                    overlayClassName={styles["table-head-send-popover"]}
                                    visible={sendPopoverVisible}
                                    onVisibleChange={(v) => setSendPopoverVisible(v)}
                                >
                                    <YakitButton
                                        onClick={() => {}}
                                        icon={<PaperAirplaneIcon style={{height: 16}} />}
                                        type={"primary"}
                                        disabled={checkedURL.length === 0}
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
                            onChange: (page, limit) => update(page, limit)
                        }}
                        loading={loading}
                        columns={columns}
                        // currentSelectItem={currentItem}
                        // onRowClick={onSetCurrentRow}
                        enableDrag={true}
                        onChange={onTableChange}
                    />
                </div>
            </div>
            <PortAssetQuery visible={advancedConfig} setVisible={setAdvancedConfig} setQueryList={() => {}} />
        </div>
    )
}

interface PortAssetQueryProps {
    visible: boolean
    setVisible: (b: boolean) => void
    setQueryList: (s: string[]) => void
}
/**@description 资产高级查询 */
const PortAssetQuery: React.FC<PortAssetQueryProps> = React.memo((props) => {
    const {visible, setVisible, setQueryList} = props
    const [activeKey, setActiveKey] = useState<string[]>(["数据库", "Web 服务器", "其他指纹信息"]) // Collapse打开的key
    const [selectList, setSelectList] = useState({})
    const [list, setList] = useState([
        {
            Name: "数据库",
            List: [
                {
                    Label: "mysql",
                    Value: "mysql",
                    Total: "56"
                },
                {
                    Label: "mangodb",
                    Value: "mangodb",
                    Total: "56"
                },
                {
                    Label: "sql serer",
                    Value: "sql serer",
                    Total: "56"
                },
                {
                    Label: "Oracle",
                    Value: "Oracle",
                    Total: "56"
                }
            ]
        },
        {
            Name: "Web 服务器",
            List: [
                {
                    Label: "Nginx",
                    Value: "Nginx",
                    Total: "56"
                },
                {
                    Label: "Tomcat",
                    Value: "Tomcat",
                    Total: "56"
                },
                {
                    Label: "Apache",
                    Value: "Apache",
                    Total: "56"
                },
                {
                    Label: "WebLogic",
                    Value: "WebLogic",
                    Total: "56"
                }
            ]
        },
        {
            Name: "其他指纹信息",
            List: [
                {
                    Label: "Windows",
                    Value: "Windows",
                    Total: "56"
                },
                {
                    Label: "Linux",
                    Value: "Linux",
                    Total: "56"
                }
            ]
        }
    ])
    useEffect(() => {
        /** 扁平化=>string[] 丢出去*/
        let list: string[] = []
        Object.keys(selectList).forEach((key) => {
            list = list.concat(selectList[key])
        })
        setQueryList(list)
    }, [selectList])
    const onSelect = useMemoizedFn((GroupName: string, value: string, checked: boolean) => {
        if (checked) {
            selectList[GroupName] = [...(selectList[GroupName] || []), value]
            setSelectList({...selectList})
        } else {
            const oldSelectLists = selectList[GroupName] || []
            const index = oldSelectLists.findIndex((ele) => ele === value)
            if (index === -1) return
            const newSelectList = {
                ...selectList,
                [selectList[GroupName]]: oldSelectLists.splice(index, 1)
            }
            setSelectList({...newSelectList})
        }
    })
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
                {list.map((item) => (
                    <Panel
                        header={item.Name}
                        key={item.Name}
                        extra={
                            <YakitButton
                                type='text'
                                className='button-text-danger'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    selectList[item.Name] = []
                                    setSelectList({...selectList})
                                }}
                            >
                                清空
                            </YakitButton>
                        }
                    >
                        {item.List.map((listItem) => {
                            const checked = (selectList[item.Name] || []).includes(listItem.Value)
                            return (
                                <label
                                    className={classNames(styles["list-item"], {
                                        [styles["list-item-active"]]: checked
                                    })}
                                    key={listItem.Value}
                                >
                                    <div className={styles["list-item-left"]}>
                                        <YakitCheckbox
                                            checked={checked}
                                            onChange={(e) => onSelect(item.Name, listItem.Value, e.target.checked)}
                                        />
                                        <span className='content-ellipsis'>{listItem.Label}</span>
                                    </div>
                                    <span>{listItem.Total}</span>
                                </label>
                            )
                        })}
                    </Panel>
                ))}
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
            <Descriptions.Item label='状态'>
                <YakitCopyText showText={port.State} />
            </Descriptions.Item>
            {port.HtmlTitle && (
                <Descriptions.Item label='Title'>
                    <YakitCopyText showText={port.HtmlTitle} />
                </Descriptions.Item>
            )}
            {port.ServiceType && (
                <Descriptions.Item span={2} label='应用'>
                    <YakitCopyText showText={port.ServiceType} />
                </Descriptions.Item>
            )}
            {port.Reason && (
                <Descriptions.Item span={2} label='失败原因'>
                    <YakitCopyText showText={port.Reason} />
                </Descriptions.Item>
            )}
            {port.CPE.join("|") !== "" ? (
                <Descriptions.Item span={2} label='CPE'>
                    <Space direction={"vertical"}>
                        {port.CPE.map((e) => {
                            return <YakitCopyText key={e} showText={e} />
                        })}
                    </Space>
                </Descriptions.Item>
            ) : undefined}
            {port.Fingerprint && (
                <Descriptions.Item span={2} label='指纹信息'>
                    <div style={{height: 200}}>
                        <YakEditor value={port.Fingerprint} noLineNumber={true} noMiniMap={true} />
                    </div>
                </Descriptions.Item>
            )}
        </Descriptions>
    )
}
