import {SolidViewgridIcon, SolidPaperairplaneIcon} from "@/assets/icon/solid"
import {ExportExcel} from "@/components/DataExport/DataExport"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {QueryGeneralResponse, genDefaultPagination} from "@/pages/invoker/schema"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {YakitRoute} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {formatTimestamp} from "@/utils/timeUtil"
import React, {useState, useMemo, useEffect, useRef} from "react"
import {QueryPortsRequest, portAssetFormatJson, PortTableAndDetail} from "../PortAssetPage"
import {PortAsset} from "../models"
import {defQueryPortsRequest, apiQueryPortsBase, apiQueryPortsIncrementOrderAsc} from "./utils"
import {useDebounceFn, useMemoizedFn, useSelections, useInterval, useCreation, useControllableValue} from "ahooks"
import styles from "./PortTable.module.scss"
import {PortTableProps} from "./PortTableType"
import ReactResizeDetector from "react-resize-detector"
import {Divider} from "antd"
import classNames from "classnames"
import {compareAsc} from "@/pages/yakitStore/viewers/base"

const {ipcRenderer} = window.require("electron")
const defLimit = 20
export const PortTable: React.FC<PortTableProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            runtimeId = "",
            btnSize,
            tableTitle,
            tableTitleExtraOperate,
            containerClassName = "",
            tableTitleClassName = "",
        } = props
        const [response, setResponse] = useState<QueryGeneralResponse<PortAsset>>({
            Data: [],
            Pagination: genDefaultPagination(defLimit),
            Total: 0
        })
        const [total, setTotal] = useState<number>(0)
        const [offsetInTop,setOffsetInTop] = useControllableValue<number>(props,{
            
        })
        const [sendPopoverVisible, setSendPopoverVisible] = useState<boolean>(false)
        const [checkedURL, setCheckedURL] = useState<string[]>([])
        const [currentSelectItem, setCurrentSelectItem] = useState<PortAsset>()
        const [scrollToIndex, setScrollToIndex] = useState<number>()

        const [titleEffective, setTitleEffective] = useState<boolean>(false)

        const prePage = useRef<number>()
        const tableBodyHeightRef = useRef<number>(0)
        const defLimitRef = useRef<number>(defLimit)
        const afterId = useRef<number>()
        const beforeId = useRef<number>()

        const selectedId = useMemo<string[]>(() => {
            return response.Data.map((i) => `${i.Id}`)
        }, [response.Data])
        const {selected, allSelected, isSelected, select, unSelect, selectAll, unSelectAll, setSelected} =
            useSelections<string>(selectedId)
        useEffect(() => {
            setCheckedURL(
                response.Data.filter((e) => selected.includes(`${e.Id}`)).map((item) => `${item.Host}:${item.Port}`)
            )
            return () => {
                clearTopIncrement()
            }
        }, [selected])
        const clearTopIncrement = useInterval(() => {
            if (beforeId.current) {
                getIncrementInTop()
            }
        }, 5000)

        /**滚动加载数据 */
        const update = useDebounceFn(
            (current: number) => {
                // if (prePage.current && current <= prePage.current) return
                const query: QueryPortsRequest = {
                    ...defQueryPortsRequest,
                    Pagination: {
                        Limit: defLimitRef.current,
                        Page: current || response.Pagination.Page,
                        Order: "asc",
                        OrderBy: "id"
                    },
                    TitleEffective: titleEffective,
                    // RuntimeId: runtimeId
                    RuntimeId: "36845738-c7f4-4e9d-bec8-28b3b361398c"
                    // AfterId: beforeId.current ? beforeId.current : undefined
                }

                apiQueryPortsBase(query).then((rsp: QueryGeneralResponse<PortAsset>) => {
                    console.log(
                        "query,rsp",
                        query,
                        rsp,
                        rsp.Data.map((ele) => ele.Id)
                    )
                    if (rsp.Data.length > 0) {
                        beforeId.current = rsp.Data[rsp.Data.length - 1].Id
                    }

                    prePage.current = Number(rsp.Pagination.Page)
                    const d = current === 1 ? rsp.Data : response.Data.concat(rsp.Data)
                    setResponse({
                        Total: current === 1 ? rsp.Total : response.Total,
                        Pagination: {
                            ...rsp.Pagination
                        },
                        Data: d
                    })
                    // setTotal(Number(rsp.Total))
                })
            },
            {wait: 200, leading: true}
        ).run
        /**获取滚动条在顶部的数据 */
        const getIncrementInTop = useMemoizedFn(() => {
            const query: QueryPortsRequest = {
                ...defQueryPortsRequest,
                Pagination: {
                    Limit: 2,
                    Page: 1,
                    Order: "asc",
                    OrderBy: "id"
                },
                TitleEffective: titleEffective,
                // RuntimeId: runtimeId
                RuntimeId: "36845738-c7f4-4e9d-bec8-28b3b361398c",
                AfterId: beforeId.current ? beforeId.current : undefined
            }
            apiQueryPortsIncrementOrderAsc(query).then((rsp) => {
                console.log(
                    "rsp-------top",
                    query,
                    rsp,
                    rsp.Data.map((ele) => ele.Id)
                )
                if (rsp.Data.length > 0) {
                    beforeId.current = rsp.Data[rsp.Data.length - 1].Id
                }
                const newData = rsp.Data.sort((a, b) => Number(b.Id) - Number(a.Id))
                console.log(
                    "newData",
                    newData.map((ele) => ele.Id)
                )
                const newTotal = Number(response.Total) + rsp.Data.length
                // setTotal(newTotal)
                setResponse({
                    ...response,
                    Total: newTotal,
                    Data: [...newData, ...response.Data]
                })
                setOffsetInTop(rsp.Data.length)
            })
        })
        const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
            return [
                {
                    title: "Id",
                    dataKey: "Id",
                    fixed: "left",
                    ellipsis: false,
                    width: 96,
                    enableDrag: false,
                },
                {
                    title: "网络地址",
                    dataKey: "Host",
                    // fixed: "left",
                    render: (text) => (
                        <div className={styles["table-host"]}>
                            <span className='content-ellipsis'>{text}</span>
                            <CopyComponents copyText={text} />
                        </div>
                    )
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
                    dataKey: "HtmlTitle",
                    afterIconExtra: (
                        <div className={styles["htmlTitle-extra"]}>
                            <YakitCheckbox
                                checked={titleEffective}
                                onChange={(e) => {
                                    setTitleEffective(e.target.checked)
                                    setTimeout(() => {
                                        update(1)
                                    }, 200)
                                }}
                            />
                            <span className={styles["valid-data"]}>有效数据</span>
                        </div>
                    )
                },
                {
                    title: "最近更新时间",
                    dataKey: "UpdatedAt",
                    sorterProps: {
                        sorter: true
                    },
                    render: (text) => (text ? formatTimestamp(text) : "-")
                }
            ]
        }, [titleEffective])
        const getData = useMemoizedFn(() => {
            return new Promise((resolve) => {
                let exportData: PortAsset[] = []
                const header: string[] = []
                const filterVal: string[] = []
                columns.forEach((item) => {
                    if (item.dataKey !== "Action") {
                        header.push(item.title)
                        filterVal.push(item.dataKey)
                    }
                })
                exportData = portAssetFormatJson(filterVal, response.Data)
                resolve({
                    header,
                    exportData,
                    response: response
                })
            })
        })
        const menuData: YakitMenuItemType[] = useMemo(() => {
            return [
                {
                    label: "发送到漏洞检测",
                    key: "bug-test"
                },
                {label: "发送到爆破", key: "brute"}
            ]
        }, [])
        const onRowContextMenu = useMemoizedFn(
            (rowData: PortAsset, selectedRows: PortAsset[], event: React.MouseEvent) => {
                if (!rowData) return
                showByRightContext(
                    {
                        width: 180,
                        data: menuData,
                        onClick: ({key}) => menuSelect(key, [`${rowData.Host}:${rowData.Port}`])
                    },
                    event.clientX,
                    event.clientY
                )
            }
        )
        const menuSelect = useMemoizedFn((key, urls) => {
            ipcRenderer
                .invoke("send-to-tab", {
                    type: key,
                    data: {URL: JSON.stringify(urls)}
                })
                .then(() => {
                    setSendPopoverVisible(false)
                })
        })
        /**table所在的div大小发生变化 */
        const onTableResize = useMemoizedFn((width, height) => {
            if (!height) {
                return
            }
            const tableCellHeight = 28

            const limit = Math.trunc(height / tableCellHeight) + 5
            defLimitRef.current = limit
            console.log("defLimitRef.current", defLimitRef.current)
            if (Number(response.Total) === 0) {
                // init
                update(1, limit)
                return
            } else if (tableBodyHeightRef.current <= height) {
                // 窗口由小变大时 重新拉取数据
                const length = response.Data.length
                const h = length * tableCellHeight
                if (h < height) {
                    // update(Number(response.Pagination.Page) + 1, limit)
                    update(Number(response.Pagination.Page) + 1, limit)
                }
                return
            }
            tableBodyHeightRef.current = height
        })
        return (
            <PortTableAndDetail
                firstNode={
                    <>
                        <ReactResizeDetector
                            onResize={onTableResize}
                            handleWidth={true}
                            handleHeight={true}
                            refreshMode={"debounce"}
                            refreshRate={50}
                        />
                        <TableVirtualResize<PortAsset>
                            titleHeight={43}
                            renderTitle={
                                <div className={classNames(styles["table-renderTitle"], tableTitleClassName)}>
                                    {tableTitle ? (
                                        tableTitle
                                    ) : (
                                        <div className={styles["virtual-table-heard-right"]}>
                                            <div className={styles["virtual-table-heard-right-item"]}>
                                                <span className={styles["virtual-table-heard-right-text"]}>Total</span>
                                                <span className={styles["virtual-table-heard-right-number"]}>
                                                    {response.Total}
                                                </span>
                                            </div>
                                            <Divider type='vertical' />
                                            <div className={styles["virtual-table-heard-right-item"]}>
                                                <span className={styles["virtual-table-heard-right-text"]}>
                                                    Selected
                                                </span>
                                                <span className={styles["virtual-table-heard-right-number"]}>
                                                    {selected.length}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className={styles["table-head-extra"]}>
                                        <ExportExcel
                                            btnProps={{
                                                size: btnSize,
                                                type: "outline2"
                                            }}
                                            getData={getData}
                                            text='导出全部'
                                        />
                                        <YakitDropdownMenu
                                            menu={{
                                                data: menuData,
                                                onClick: ({key}) => menuSelect(key, checkedURL)
                                            }}
                                            dropdown={{
                                                trigger: ["click"],
                                                placement: "bottom",
                                                visible: sendPopoverVisible,
                                                onVisibleChange: (v) => setSendPopoverVisible(v),
                                                disabled: selected.length === 0
                                            }}
                                        >
                                            <YakitButton
                                                onClick={() => {}}
                                                icon={<SolidPaperairplaneIcon />}
                                                type={"primary"}
                                                disabled={selected.length === 0}
                                                size={btnSize}
                                            >
                                                发送到...
                                            </YakitButton>
                                        </YakitDropdownMenu>
                                        {tableTitleExtraOperate}
                                    </div>
                                </div>
                            }
                            scrollToIndex={scrollToIndex}
                            isRightClickBatchOperate={true}
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
                                onChange: (page, limit) => update(page)
                            }}
                            columns={columns}
                            onRowContextMenu={onRowContextMenu}
                            onSetCurrentRow={(val) => {
                                if (!currentSelectItem) {
                                    const index = response.Data.findIndex((ele) => ele.Id === val?.Id)
                                    setScrollToIndex(index)
                                }
                                if (val?.Id !== currentSelectItem?.Id) {
                                    setCurrentSelectItem(val)
                                }
                            }}
                            enableDrag={true}
                            containerClassName={containerClassName}
                        />
                    </>
                }
                currentSelectItem={currentSelectItem}
                resizeBoxProps={{
                    isShowDefaultLineStyle: false,
                    firstNode: undefined,
                    secondNode: undefined,
                    lineDirection: "bottom",
                    secondNodeStyle: {padding: 0}
                }}
                secondNodeClassName={styles["port-table-detail"]}
            />
        )
    })
)
