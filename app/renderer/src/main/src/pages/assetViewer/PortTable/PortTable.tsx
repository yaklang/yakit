import {SolidViewgridIcon, SolidPaperairplaneIcon} from "@/assets/icon/solid"
import {ExportExcel} from "@/components/DataExport/DataExport"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {PaginationSchema, QueryGeneralResponse, genDefaultPagination} from "@/pages/invoker/schema"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {YakitRoute} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {formatTimestamp} from "@/utils/timeUtil"
import React, {useState, useMemo, useEffect, useRef, useImperativeHandle} from "react"
import {QueryPortsRequest, portAssetFormatJson, PortTableAndDetail} from "../PortAssetPage"
import {PortAsset} from "../models"
import {defQueryPortsRequest, apiQueryPortsBase, apiQueryPortsIncrementOrderAsc} from "./utils"
import {
    useDebounceFn,
    useMemoizedFn,
    useSelections,
    useInterval,
    useCreation,
    useControllableValue,
    useLatest,
    useUpdateEffect,
    useWhyDidYouUpdate,
    useInViewport
} from "ahooks"
import styles from "./PortTable.module.scss"
import {PortTableProps} from "./PortTableType"
import ReactResizeDetector from "react-resize-detector"
import {Divider} from "antd"
import classNames from "classnames"
import {onRemoveToolFC} from "@/utils/deleteTool"
import {isEnpriTraceAgent} from "@/utils/envfile"
import cloneDeep from "lodash/cloneDeep"

const {ipcRenderer} = window.require("electron")
const defLimit = 20
export const PortTable: React.FC<PortTableProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            btnSize,
            tableTitle,
            tableTitleExtraOperate,
            containerClassName = "",
            tableTitleClassName = "",
            isStop = true,
            setSelectNumber
        } = props
        const [loading, setLoading] = useState(false)
        const [response, setResponse] = useState<QueryGeneralResponse<PortAsset>>({
            Data: [],
            Pagination: genDefaultPagination(defLimit),
            Total: 0
        })
        const [total, setTotal] = useControllableValue<number>(props, {
            defaultValue: 0,
            trigger: "setTotal"
        })
        const [isRefresh, setIsRefresh] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "isRefresh",
            trigger: "setIsRefresh"
        })
        const [offsetDataInTop, setOffsetDataInTop] = useControllableValue<PortAsset[]>(props, {
            defaultValue: [],
            trigger: "setOffsetDataInTop"
        })
        const [interval, setInterval] = useState<number | undefined>(1000)
        const [sendPopoverVisible, setSendPopoverVisible] = useState<boolean>(false)
        const [checkedURL, setCheckedURL] = useState<string[]>([])
        const [currentSelectItem, setCurrentSelectItem] = useState<PortAsset>()
        const [scrollToIndex, setScrollToIndex] = useState<number>()

        // const [titleEffective, setTitleEffective] = useState<boolean>(false)
        const [query, setQuery] = useControllableValue<QueryPortsRequest>(props, {
            defaultValue: {
                ...cloneDeep(defQueryPortsRequest)
            },
            valuePropName: "query",
            trigger: "setQuery"
        })

        const prePage = useRef<number>(0)
        const tableBodyHeightRef = useRef<number>(0)
        const defLimitRef = useRef<number>(defLimit)
        const afterId = useRef<number>()
        const beforeId = useRef<number>()
        const tableRef = useRef<any>(null)
        const selectedId = useMemo<string[]>(() => {
            return response.Data.map((i) => `${i.Id}`)
        }, [response.Data])
        const {selected, allSelected, isSelected, select, unSelect, selectAll, unSelectAll, setSelected} =
            useSelections<string>(selectedId)

        // 选中数量
        const selectNum = useMemo(() => {
            if (allSelected) return total
            else return selected.length
        }, [allSelected, selected, total])

        useImperativeHandle(ref, () => ({
            onRemove
        }))

        useEffect(() => {
            setCheckedURL(
                response.Data.filter((e) => selected.includes(`${e.Id}`)).map((item) => `${item.Host}:${item.Port}`)
            )
        }, [selected])
        useEffect(() => {
            if (setSelectNumber) setSelectNumber(selectNum)
        }, [selectNum])

        useEffect(() => {
            getTotal()
        }, [query, isRefresh])
        useUpdateEffect(() => {
            onRefreshData()
        }, [query, isRefresh])

        useUpdateEffect(() => {
            if (isStop) {
                setInterval(1000)
            } else {
                setInterval(undefined)
            }
            return () => {
                clearTopIncrement()
            }
        }, [isStop])
        const clearTopIncrement = useInterval(() => {
            if (beforeId.current) {
                getIncrementInTop()
            }
        }, interval)

        const onRemove = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                const transferParams = {
                    selectedRowKeys: allSelected ? [] : selected,
                    params: {...query},
                    interfaceName: "DeletePorts"
                }
                setLoading(true)
                onRemoveToolFC(transferParams)
                    .then(() => {
                        setCheckedURL([])
                        unSelectAll()
                        onRefreshData()
                        resolve(null)
                    })
                    .catch((err) => {
                        reject(err)
                    })
                    .finally(() => setTimeout(() => setLoading(false), 200))
            })
        })

        /**搜索，刷新数据 */
        const onRefreshData = useMemoizedFn(() => {
            update(true)
        })
        /**获取数据总数，通过page和limit。因为有BeforeId/AfterId字段查询回来的总数并不是真正的总数 */
        const getTotal = useMemoizedFn(() => {
            const params: QueryPortsRequest = {
                ...query,
                Pagination: {
                    Limit: 1,
                    Page: 1,
                    Order: "desc",
                    OrderBy: "id"
                },
                RuntimeId: query.RuntimeId
            }
            apiQueryPortsBase(params).then((res) => {
                setTotal(Number(res.Total))
            })
        })

        const getScrollTop = useMemoizedFn(() => {
            return tableRef.current?.containerRef?.scrollTop || 0
        })

        /**滚动加载数据 */
        const update = useDebounceFn(
            (init?: boolean) => {
                const params: QueryPortsRequest = {
                    ...query,
                    Pagination: {
                        Limit: defLimitRef.current,
                        // Page: current || response.Pagination.Page,
                        Page: 1,
                        Order: query.Pagination.Order,
                        OrderBy: query.Pagination.OrderBy
                    }
                }
                if (query.Pagination.Order === "asc") {
                    params.AfterId = init ? undefined : afterId.current
                } else {
                    params.BeforeId = init ? undefined : beforeId.current
                }
                if (init) {
                    setLoading(true)
                    prePage.current = 1
                    setIsRefresh(!isRefresh)
                }
                console.log("query-params", params)
                apiQueryPortsBase(params)
                    .then((rsp: QueryGeneralResponse<PortAsset>) => {
                        console.log(
                            "rsp",
                            rsp,
                            rsp.Data.map((ele) => ele.Id)
                        )
                        const d = init ? rsp.Data : response.Data.concat(rsp.Data)
                        prePage.current += 1
                        setResponse({
                            Total: 0,
                            Pagination: {
                                ...rsp.Pagination,
                                Page: prePage.current // 虚假的page，只是为了让表格滚动加载下一页数据
                            },
                            Data: d
                        })
                        defLimitRef.current = defLimit
                        if (query.Pagination.Order === "asc") {
                            if (init) {
                                beforeId.current = (rsp.Data[0] && rsp.Data[0].Id) || 1
                                onTableResize(undefined, tableBodyHeightRef.current)
                            }
                            afterId.current = (rsp.Data[rsp.Data.length - 1] && rsp.Data[rsp.Data.length - 1].Id) || 1
                        } else {
                            if (init) {
                                afterId.current = (rsp.Data[0] && rsp.Data[0].Id) || 1
                                onTableResize(undefined, tableBodyHeightRef.current)
                            }
                            beforeId.current = (rsp.Data[rsp.Data.length - 1] && rsp.Data[rsp.Data.length - 1].Id) || 1
                        }
                    })
                    .finally(() => setTimeout(() => setLoading(false), 200))
            },
            {wait: 200, leading: true}
        ).run
        /**获取滚动条在顶部的数据 */
        const getIncrementInTop = useMemoizedFn(() => {
            const params: QueryPortsRequest = {
                ...query,
                Pagination: {
                    Limit: 20,
                    Page: 1,
                    Order: query.Pagination.Order,
                    OrderBy: query.Pagination.OrderBy
                },
                AfterId: afterId.current ? afterId.current : undefined
            }
            if (query.Pagination.Order === "asc" || query.Pagination.OrderBy !== "id") {
                // 升序时，顶部不实时刷新，避免数据混乱
                // 排序字段为Id才实时刷新数据
                return
            }
            const scrollTop = getScrollTop()
            // console.log("offsetDataInTop", offsetDataInTop)
            if (scrollTop < 10 && offsetDataInTop?.length > 0) {
                // 滚动条滚动到顶部的时候，如果偏移缓存数据中有数据，第一次优先将缓存数据放在总的数据中
                setResponse({
                    ...response,
                    Data: [...offsetDataInTop, ...response.Data]
                })
                setOffsetDataInTop([])
                return
            }
            apiQueryPortsIncrementOrderAsc(params).then((rsp) => {
                console.log(
                    "rsp-------top",
                    params,
                    rsp.Data.map((ele) => ele.Id)
                )
                if (rsp.Data.length > 0) {
                    afterId.current = rsp.Data[0].Id
                }
                const newData = rsp.Data
                const newTotal = total + rsp.Data.length
                if (scrollTop < 10) {
                    setResponse({
                        ...response,
                        Data: [...newData, ...response.Data]
                    })
                    setTotal(newTotal)
                } else {
                    setOffsetDataInTop([...newData, ...offsetDataInTop])
                    setTotal(newTotal)
                }
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
                    enableDrag: false
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
                                checked={query.TitleEffective}
                                onChange={(e) => {
                                    setQuery({
                                        ...query,
                                        TitleEffective: e.target.checked
                                    })
                                }}
                            />
                            <span className={styles["valid-data"]}>有效数据</span>
                        </div>
                    )
                },
                {
                    title: "最近更新时间",
                    dataKey: "UpdatedAt",
                    fixed: "right",
                    sorterProps: {
                        sorter: true,
                        sorterKey: "updated_at"
                    },
                    render: (text) => (text ? formatTimestamp(text) : "-")
                }
            ]
        }, [query.TitleEffective])
        const getData = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                const params: QueryPortsRequest = {
                    ...query,
                    All: true
                }
                apiQueryPortsIncrementOrderAsc(params)
                    .then((res) => {
                        let exportData: PortAsset[] = []
                        const header: string[] = []
                        const filterVal: string[] = []
                        columns.forEach((item) => {
                            header.push(item.title)
                            filterVal.push(item.dataKey)
                        })
                        exportData = portAssetFormatJson(filterVal, res.Data)
                        resolve({
                            header,
                            exportData,
                            response: response
                        })
                    })
                    .catch(reject)
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
        const onTableChange = useMemoizedFn((page: number, limit: number, sort: SortProps, filter: any) => {
            if (sort.order === "none") {
                sort.order = "desc"
                sort.orderBy = "id"
            }
            setQuery({
                ...query,
                Pagination: {
                    ...query.Pagination,
                    Order: sort.order,
                    OrderBy: sort.orderBy
                }
            })
        }) /**table所在的div大小发生变化 */
        const onTableResize = useMemoizedFn((width, height) => {
            if (!height) {
                return
            }
            const tableCellHeight = 28
            const limit = Math.trunc(height / tableCellHeight) + 5
            defLimitRef.current = limit
            // if (total === 0) {
            //     // init
            //     update(true)
            //     return
            // } else if (tableBodyHeightRef.current <= height) {
            //     // 窗口由小变大时 重新拉取数据
            //     const length = response.Data.length
            //     const h = length * tableCellHeight
            //     if (h < height) {
            //         // update()
            //     }
            //     return
            // }
            update()
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
                            loading={loading}
                            isRefresh={isRefresh}
                            ref={tableRef}
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
                                                    {total}
                                                </span>
                                            </div>
                                            <Divider type='vertical' />
                                            <div className={styles["virtual-table-heard-right-item"]}>
                                                <span className={styles["virtual-table-heard-right-text"]}>
                                                    Selected
                                                </span>
                                                <span className={styles["virtual-table-heard-right-number"]}>
                                                    {selectNum}
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
                                        {!isEnpriTraceAgent() && (
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
                                                    disabled: allSelected || selected.length === 0
                                                }}
                                            >
                                                <YakitButton
                                                    onClick={() => {}}
                                                    icon={<SolidPaperairplaneIcon />}
                                                    type={"primary"}
                                                    disabled={allSelected || selected.length === 0}
                                                    size={btnSize}
                                                >
                                                    发送到...
                                                </YakitButton>
                                            </YakitDropdownMenu>
                                        )}
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
                                total: total,
                                limit: response.Pagination.Limit,
                                page: response.Pagination.Page,
                                onChange: (page, limit) => update()
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
                            onChange={onTableChange}
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
