import React, {useEffect, useState, useMemo, useRef} from "react"
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
import {useCreation, useDebounceFn, useGetState, useInViewport, useMemoizedFn, useSelections} from "ahooks"
import {onRemoveToolFC} from "../../utils/deleteTool"
import {isCommunityEdition, isEnpriTraceAgent} from "@/utils/envfile"
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
    RefreshIcon,
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
import {
    YakitMenu,
    YakitMenuItemDividerProps,
    YakitMenuItemProps,
    YakitMenuItemType
} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse
export interface PortAssetTableProp {
    closed?: boolean
    onClicked?: (i: PortAsset) => any
}

export interface QueryPortsRequest extends QueryGeneralRequest {
    Hosts: string
    Ports: string
    State: "open" | "closed" | "unknown"
    Service: string
    Title: string
    TitleEffective: boolean
    Keywords: string
    ComplexSelect: string
}

interface GroupList {
    ServiceType: string
    ShowServiceType: string
    Total: number
}

interface PortsGroup {
    GroupName: string
    GroupLists: GroupList[]
}
interface QueryPortsGroupResponse {
    PortsGroupList: PortsGroup[]
}

interface QueryListProps {
    [key: string]: string[]
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
    const [params, setParams] = useState<QueryPortsRequest>({
        Hosts: "",
        Ports: "",
        Service: "",
        State: props.closed ? "closed" : "open",
        Title: "",
        Keywords: "",
        ComplexSelect: "",
        TitleEffective: false,
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
    const [advancedQueryLoading, setAdvancedQueryLoading] = useState(false)
    const [portsGroup, setPortsGroup] = useState<PortsGroup[]>([])
    const [queryList, setQueryList] = useState<QueryListProps>()
    const [currentSelectItem, setCurrentSelectItem] = useState<PortAsset>()
    const [scrollToIndex, setScrollToIndex] = useState<number>()

    const portAssetRef = useRef(null)
    const [inViewport] = useInViewport(portAssetRef)
    
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
        // params.ComplexSelect 此条件搜索点击频繁
        update(1)
    }, [queryList, advancedConfig])
    useEffect(() => {
        // getAllData()
        update(1)
        getPortsGroup()
    }, [])
    useEffect(()=>{
        if(inViewport){
            getAllData()
            update(1)
        }
    },[inViewport])
    const getPortsGroup = useMemoizedFn(() => {
        setAdvancedQueryLoading(true)
        ipcRenderer
            .invoke("QueryPortsGroup", {})
            .then((data: QueryPortsGroupResponse) => {
                setPortsGroup(data.PortsGroupList)
            })
            .catch((e: any) => {
                failed("getPortsGroup failed: " + e)
            })
            .finally(() => setTimeout(() => setAdvancedQueryLoading(false), 200))
    })
    const getAllData = () => {
        ipcRenderer
            .invoke("QueryPorts", {
                All: true,
                ...onGetQueryProcessing()
            })
            .then((data: QueryGeneralResponse<PortAsset>) => {
                setAllResponse(data)
            })
            .catch((e: any) => {
                failed("QueryPorts failed: " + `${e}`)
            })
            .finally(() => {})
    }

    const update = useDebounceFn(
        (current: number, pageSize?: number, order?: string, orderBy?: string) => {
            setLoading(true)
            const query = {
                ...onGetQueryProcessing(),
                Pagination: {
                    Limit: pageSize || response.Pagination.Limit,
                    Page: current || response.Pagination.Page,
                    Order: order || "desc",
                    OrderBy: orderBy || "updated_at"
                }
            }
            ipcRenderer
                .invoke("QueryPorts", query)
                .then((rsp: QueryGeneralResponse<PortAsset>) => {
                    if (Number(current) === 1) {
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
        },
        {wait: 200}
    ).run

    const onGetQueryProcessing = useMemoizedFn(() => {
        const query = {
            ...params
        }
        if (advancedConfig && queryList) {
            let list: string[] = []
            Object.keys(queryList).forEach((key) => {
                list = list.concat(queryList[key])
            })
            query.ComplexSelect = list.join(",")
        }
        return query
    })

    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "网络地址",
                dataKey: "Host",
                filterProps: {
                    filterKey: "Hosts",
                    filterIcon: <SearchIcon />,
                    filtersType: "input"
                },
                render: (text) => (
                    <div className={styles["table-host"]}>
                        <span className='content-ellipsis'>{text}</span>
                        <CopyComponents copyText={text} />
                    </div>
                ),
                fixed: "left"
            },
            {
                title: "端口",
                dataKey: "Port",
                width: 100,
                filterProps: {
                    filterKey: "Ports",
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
                    filterKey: "Proto",
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
                        <YakitCheckbox
                            checked={params.TitleEffective}
                            onChange={(e) => {
                                setParams({...params, TitleEffective: e.target.checked})
                                setTimeout(() => {
                                    update(1)
                                }, 200)
                            }}
                        />
                        <span className={styles["valid-data"]}>有效数据</span>
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
                width: 60,
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
                        </div>
                    )
                },
                fixed: "right"
            }
        ]
    }, [params])

    const getData = useMemoizedFn((query) => {
        return new Promise((resolve) => {
            ipcRenderer
                .invoke("QueryPorts", {
                    ...onGetQueryProcessing(),
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
                update(1)
                setCheckedURL([])
                unSelectAll()
                getAllData()
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const onResetRefresh = useMemoizedFn(() => {
        setParams({
            Hosts: "",
            Ports: "",
            Service: "",
            State: props.closed ? "closed" : "open",
            Title: "",
            Keywords: "",
            ComplexSelect: "",
            TitleEffective: false,
            Pagination: {
                Limit: 15,
                Page: 1,
                OrderBy: "desc",
                Order: "updated_at"
            }
        })
        setQueryList(undefined)
        setTimeout(() => {
            update(1)
        }, 100)
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
    const menuData: YakitMenuItemType[] = useMemo(() => {
        return [
            {
                label: "发送到漏洞检测",
                key: "bug-test"
            },
            {
                label: "发送到端口扫描",
                key: "scan-port"
            },
            {label: "发送到爆破", key: "brute"},
            {type: "divider"},
            {
                label: "删除框选数据",
                key: "remove"
            }
        ]
    }, [])
    const onRowContextMenu = useMemoizedFn((rowData: PortAsset, selectedRows: PortAsset[], event: React.MouseEvent) => {
        if (!rowData) return
        showByRightContext(
            {
                width: 180,
                data: menuData.map((ele) => {
                    if (typeof (ele as any as YakitMenuItemDividerProps)["type"] !== "undefined") {
                        return ele
                    } else {
                        const info: YakitMenuItemProps = {...(ele as any)}
                        if (info.key === "remove") {
                            return {
                                label:
                                    selectedRows.length > 0 ? (
                                        <div className={styles["context-menu-remove"]}>
                                            <span>删除框选数据</span>
                                            <span className={styles["number"]}>{selectedRows.length}条</span>
                                        </div>
                                    ) : (
                                        "删除"
                                    ),
                                key: info.key
                            }
                        }
                        return info
                    }
                }),
                onClick: ({key, keyPath}) => {
                    switch (key) {
                        case "remove":
                            onDeleteBoxSelection(selectedRows)
                            break
                        default:
                            let urls: string[] = []
                            if ((selectedRows?.length || 0) > 0) {
                                urls = selectedRows?.map((item) => `${item.Host}:${item.Port}`) || []
                            } else {
                                urls = [`${rowData.Host}:${rowData.Port}`]
                            }
                            ipcRenderer
                                .invoke("send-to-tab", {
                                    type: key,
                                    data: {URL: JSON.stringify(urls)}
                                })
                                .then(() => {
                                    unSelectAll()
                                    setSendPopoverVisible(false)
                                })
                            break
                    }
                }
            },
            event.clientX,
            event.clientY
        )
    })
    const onDeleteBoxSelection = useMemoizedFn((s: PortAsset[]) => {
        const transferParams = {
            selectedRowKeys: s.map((ele) => ele.Id),
            params: {},
            interfaceName: "DeletePorts"
        }
        setLoading(true)
        onRemoveToolFC(transferParams)
            .then(() => {
                unSelectAll()
                update(1)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const onSearch = useMemoizedFn((val: string) => {
        setParams({
            ...params,
            Keywords: val
        })
        setTimeout(() => {
            update(1)
        }, 100)
    })

    const ResizeBoxProps = useCreation(() => {
        let p = {
            secondRatio: "0%",
            firstRatio: "100%"
        }
        if (currentSelectItem) {
            p.firstRatio = "60%"
            p.secondRatio = "40%"
        }
        return p
    }, [currentSelectItem])
    return (
        <div ref={portAssetRef} className={styles["portAsset-content"]} style={{display:"flex",flexDirection:"row"}}>
            <div style={{flex:1,overflow:"hidden"}}>
                <YakitResizeBox
                isVer={true}
                firstMinSize={150}
                secondMinSize={100}
                firstNode={
                    <div className={styles["portAsset"]}>
                        <div className={styles["portAsset-head"]}>
                            <div className={styles["head-title"]}>端口资产列表</div>
                            <div className={styles["head-extra"]}>
                                <YakitInput.Search
                                    placeholder='请输入网络地址、端口、服务指纹、title关键词搜索'
                                    style={{width: 320}}
                                    onSearch={onSearch}
                                    onPressEnter={() => update(1)}
                                    value={params.Keywords}
                                    onChange={(e) => {
                                        const {value} = e.target
                                        setParams({
                                            ...params,
                                            Keywords: value
                                        })
                                    }}
                                />
                                <YakitDropdownMenu
                                    menu={{
                                        data: [
                                            {
                                                key: "noResetRefresh",
                                                label: "仅刷新"
                                            },
                                            {
                                                key: "resetRefresh",
                                                label: "重置查询条件刷新"
                                            }
                                        ],
                                        onClick: ({key}) => {
                                            switch (key) {
                                                case "noResetRefresh":
                                                    update(1)
                                                    break
                                                case "resetRefresh":
                                                    onResetRefresh()
                                                    break
                                                default:
                                                    break
                                            }
                                        }
                                    }}
                                    dropdown={{
                                        trigger: ["hover"],
                                        placement: "bottom"
                                    }}
                                >
                                    <div className={styles["refresh-button"]}>
                                        <RefreshIcon className={styles["refresh-icon"]} />
                                    </div>
                                </YakitDropdownMenu>

                                {allResponse.Total > 0 && !advancedConfig && (
                                    <>
                                        <Divider type='vertical' style={{margin: "0 8px", marginRight: 12}} />
                                        <span style={{marginRight: 4}}>高级筛选</span>
                                        <YakitSwitch checked={advancedConfig} onChange={setAdvancedConfig} />
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={styles["portAsset-table"]}>
                            <TableVirtualResize<PortAsset>
                                currentIndex={scrollToIndex}
                                containerClassName={styles["portAsset-table-list-container"]}
                                query={params}
                                isRefresh={isRefresh}
                                isShowTotal={true}
                                isRightClickBatchOperate={true}
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
                                            title={selected.length > 0 ? "确定删除勾选数据吗？" : "确定清空列表数据吗?"}
                                            onConfirm={() => {
                                                onRemove()
                                            }}
                                            placement='bottomRight'
                                        >
                                            <YakitButton
                                                type='outline1'
                                                colors="danger"
                                                icon={<TrashIcon />}
                                            >
                                                {selected.length > 0 ? "删除" : "清空"}
                                            </YakitButton>
                                        </YakitPopconfirm>

                                        {!isEnpriTraceAgent()&&<YakitDropdownMenu
                                            menu={{
                                                data: [
                                                    {
                                                        label: "发送到漏洞检测",
                                                        key: "bug-test"
                                                    },
                                                    {
                                                        label: "发送到端口扫描",
                                                        key: "scan-port"
                                                    },
                                                    {label: "发送到爆破", key: "brute"}
                                                ],
                                                onClick: ({key}) => {
                                                    ipcRenderer
                                                        .invoke("send-to-tab", {
                                                            type: key,
                                                            data: {URL: JSON.stringify(checkedURL)}
                                                        })
                                                        .then(() => {
                                                            setSendPopoverVisible(false)
                                                        })
                                                }
                                            }}
                                            dropdown={{
                                                trigger: ["click"],
                                                placement: "bottom",
                                                // overlayClassName: styles["table-head-send-popover"],
                                                visible: sendPopoverVisible,
                                                onVisibleChange: (v) => setSendPopoverVisible(v),
                                                disabled: selected.length === 0
                                            }}
                                        >
                                            <YakitButton
                                                onClick={() => {}}
                                                icon={<PaperAirplaneIcon />}
                                                type={"primary"}
                                                disabled={selected.length === 0}
                                            >
                                                发送到...
                                            </YakitButton>
                                        </YakitDropdownMenu>}
                                    </div>
                                }
                                renderKey='Id'
                                data={response.Data}
                                rowSelection={{
                                    isAll: allSelected,
                                    type: "checkbox",
                                    selectedRowKeys: selected,
                                    onSelectAll: (
                                        newSelectedRowKeys: string[],
                                        selected: PortAsset[],
                                        checked: boolean
                                    ) => {
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
                                onRowContextMenu={onRowContextMenu}
                                onSetCurrentRow={(val) => {
                                    if (!currentSelectItem) {
                                        const index = response.Data.findIndex((ele) => ele.Id === val?.Id)
                                        setScrollToIndex(index)
                                    }
                                    setCurrentSelectItem(val)
                                }}
                                enableDrag={true}
                                onChange={onTableChange}
                            />
                        </div>
                    </div>
                }
                secondNode={
                    <>
                        {currentSelectItem ? (
                            <div className={classNames("yakit-descriptions", styles["port-description"])}>
                                <PortAssetDescription port={currentSelectItem} />
                            </div>
                        ) : (
                            <></>
                        )}
                    </>
                }
                secondNodeStyle={{
                    padding: currentSelectItem ? "8px 16px 16px 12px" : 0,
                    display: currentSelectItem ? "" : "none",
                }}
                lineStyle={{display: currentSelectItem?.Id ? "" : "none"}}
                {...ResizeBoxProps}
            ></YakitResizeBox>
            </div>
            <PortAssetQuery
                loading={advancedQueryLoading}
                portsGroupList={portsGroup}
                visible={allResponse.Total > 0 && advancedConfig}
                setVisible={setAdvancedConfig}
                queryList={queryList || {}}
                setQueryList={(val) => setQueryList(val)}
            />
        </div>
    )
}

interface PortAssetQueryProps {
    loading: boolean
    portsGroupList: PortsGroup[]
    visible: boolean
    setVisible: (b: boolean) => void
    queryList: QueryListProps
    setQueryList: (s: QueryListProps) => void
}

/**@description 资产高级查询 */
const PortAssetQuery: React.FC<PortAssetQueryProps> = React.memo((props) => {
    const {loading, portsGroupList, visible, setVisible, queryList, setQueryList} = props
    const [activeKey, setActiveKey] = useState<string[]>([]) // Collapse打开的key

    useEffect(() => {
        const keys = portsGroupList.map((l) => l.GroupName)
        setActiveKey(keys)
    }, [portsGroupList])
    const onSelect = useMemoizedFn((GroupName: string, value: string, checked: boolean) => {
        if (checked) {
            queryList[GroupName] = [...(queryList[GroupName] || []), value]
            setQueryList({...queryList})
        } else {
            const oldSelectLists = queryList[GroupName] || []

            const index = oldSelectLists.findIndex((ele) => ele === value)

            if (index === -1) return
            oldSelectLists.splice(index, 1)
            const newSelectList = {
                ...queryList,
                [GroupName]: oldSelectLists
            }
            setQueryList({...newSelectList})
        }
    })
    return (
        <div
            className={classNames(styles["portAsset-query"])}
            style={{display: visible ? "" : "none"}}
        >
            <div className={styles["query-head"]}>
                <span>高级筛选</span>
                <YakitSwitch checked={visible} onChange={setVisible} />
            </div>
            <YakitSpin spinning={loading}>
                <YakitCollapse
                    activeKey={activeKey}
                    onChange={(key) => setActiveKey(key as string[])}
                    className={styles["query-collapse"]}
                >
                    {portsGroupList.map((item, i) => (
                        <YakitPanel
                            header={item.GroupName}
                            key={item.GroupName}
                            extra={
                                <YakitButton
                                    type='text'
                                    colors="danger"
                                    className={styles['port-group-remove']}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        queryList[item.GroupName] = []
                                        setQueryList({...queryList})
                                    }}
                                >
                                    清空
                                </YakitButton>
                            }
                        >
                            {item.GroupLists.map((listItem) => {
                                const checked = (queryList[item.GroupName] || []).includes(listItem.ServiceType)
                                return (
                                    <label
                                        className={classNames(styles["list-item"], {
                                            [styles["list-item-active"]]: checked
                                        })}
                                        key={listItem.ServiceType}
                                    >
                                        <div className={styles["list-item-left"]}>
                                            <YakitCheckbox
                                                checked={checked}
                                                onChange={(e) =>
                                                    onSelect(item.GroupName, listItem.ServiceType, e.target.checked)
                                                }
                                            />
                                            <span className='content-ellipsis'>{listItem.ShowServiceType}</span>
                                        </div>
                                        <span className={styles["list-item-extra"]}>{listItem.Total}</span>
                                    </label>
                                )
                            })}
                        </YakitPanel>
                    ))}
                </YakitCollapse>
                {portsGroupList.length === 0 && <YakitEmpty style={{paddingTop: 48}} title='暂无指纹信息' />}
            </YakitSpin>
        </div>
    )
})
export interface PortAssetDescriptionProp {
    port: PortAsset
}

export const PortAssetDescription: React.FC<PortAssetDescriptionProp> = (props) => {
    const {port} = props
    return (
        <>
            <Descriptions size={"small"} bordered={true} column={!port.ServiceType ? 1 : 2} title={"端口资产详情"}>
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
            <div className='descriptions-no-more'>暂无更多</div>
        </>
    )
}
