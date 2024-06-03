import {SolidPaperairplaneIcon} from "@/assets/icon/solid"
import {ExportExcel} from "@/components/DataExport/DataExport"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {QueryGeneralResponse, genDefaultPagination} from "@/pages/invoker/schema"
import {formatTimestamp} from "@/utils/timeUtil"
import React, {useState, useMemo, useEffect, useRef, useImperativeHandle} from "react"
import {QueryPortsRequest, portAssetFormatJson, PortTableAndDetail} from "../PortAssetPage"
import {PortAsset} from "../models"
import {defQueryPortsRequest, apiQueryPortsBase, apiQueryPortsIncrementOrderAsc} from "./utils"
import {useDebounceFn, useMemoizedFn, useInterval, useCreation, useControllableValue, useUpdateEffect} from "ahooks"
import styles from "./PortTable.module.scss"
import {PortTableProps} from "./PortTableType"
import ReactResizeDetector from "react-resize-detector"
import {Divider} from "antd"
import classNames from "classnames"
import {onRemoveToolFC} from "@/utils/deleteTool"
import {isEnpriTraceAgent} from "@/utils/envfile"
import cloneDeep from "lodash/cloneDeep"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"

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
            detailBodyClassName = "",
            isStop = true
        } = props
        const [loading, setLoading] = useState(false)
        const [response, setResponse] = useState<QueryGeneralResponse<PortAsset>>({
            Data: [],
            Pagination: genDefaultPagination(defLimit),
            Total: 0
        })
        const [allResponse, setAllResponse] = useState<QueryGeneralResponse<PortAsset>>({
            Data: [],
            Pagination: genDefaultPagination(defLimit),
            Total: 0
        })
        const [selected, setSelected] = useState<PortAsset[]>([])
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
        const [selectNum, setSelectNumber] = useControllableValue<number>(props, {
            defaultValue: 0,
            trigger: "setSelectNumber"
        })
        const [interval, setInterval] = useState<number | undefined>(undefined)
        const [sendPopoverVisible, setSendPopoverVisible] = useState<boolean>(false)
        const [currentSelectItem, setCurrentSelectItem] = useState<PortAsset>()
        const [scrollToIndex, setScrollToIndex] = useState<number>()

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
        const limitRef = useRef<number>(defLimit)
        const afterId = useRef<number>()
        const beforeId = useRef<number>()
        const tableRef = useRef<any>(null)

        const allSelected = useCreation(() => {
            if (total > 0) {
                return selectNum === total
            }
            return false
        }, [selectNum, total])

        const selectedRowKeys = useCreation(() => {
            return selected.map((ele) => `${ele.Id}`)
        }, [selected])
        const checkedURL = useCreation(() => {
            return selected.map((ele) => `${ele.Host}:${ele.Port}`)
        }, [selected])

        useImperativeHandle(ref, () => ({
            onRemove
        }))

        useEffect(() => {
            getAllData()
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
        /**
         * 1.获取所有数据，带查询条件
         * 2.获取数据总数，因为有BeforeId/AfterId字段查询回来的总数并不是真正的总数
         */
        const getAllData: () => Promise<QueryGeneralResponse<PortAsset>> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                const params: QueryPortsRequest = {
                    ...query,
                    All: true,
                    Order: query.Pagination.Order,
                    OrderBy: query.Pagination.OrderBy
                }
                apiQueryPortsBase(params)
                    .then((allRes) => {
                        setAllResponse(allRes)
                        setTotal(Number(allRes.Total))
                        resolve(allRes)
                    })
                    .catch(reject)
            })
        })

        const onRemove = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                const transferParams = {
                    selectedRowKeys: allSelected ? [] : selected.map((ele) => ele.Id),
                    params: {...query},
                    interfaceName: "DeletePorts"
                }
                setLoading(true)
                onRemoveToolFC(transferParams)
                    .then(() => {
                        setSelectNumber(0)
                        setSelected([])
                        onRefreshData()
                        getAllData()
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
            limitRef.current = defLimitRef.current
            setOffsetDataInTop([])
            setInterval(undefined)
            update(true)
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
                        Limit: limitRef.current,
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
                    prePage.current = 0
                    setSelectNumber(0)
                    setSelected([])
                }
                apiQueryPortsBase(params)
                    .then((rsp: QueryGeneralResponse<PortAsset>) => {
                        const d = init ? rsp.Data : response.Data.concat(rsp.Data)
                        prePage.current += 1
                        if (init) {
                            // 初始数据回来后，再开始刷新实时数据
                            setInterval(1000)
                        }
                        setResponse({
                            Total: 0,
                            Pagination: {
                                ...rsp.Pagination,
                                Page: prePage.current // 虚假的page，只是为了让表格滚动加载下一页数据
                            },
                            Data: d
                        })
                        limitRef.current = defLimit
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
            if (scrollTop < 10 && offsetDataInTop?.length > 0) {
                // 滚动条滚动到顶部的时候，如果偏移缓存数据中有数据，第一次优先将缓存数据放在总的数据中
                setResponse({
                    ...response,
                    Data: [...offsetDataInTop, ...response.Data]
                })
                setAllResponse({
                    ...allResponse,
                    Data: [...offsetDataInTop, ...allResponse.Data]
                })
                setOffsetDataInTop([])
                return
            }
            apiQueryPortsIncrementOrderAsc(params).then((rsp) => {
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
                    setAllResponse({
                        ...allResponse,
                        Data: [...newData, ...allResponse.Data]
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
                    title: "序号",
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
                                    setIsRefresh(!isRefresh)
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
        /**导出数据 */
        const getData = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                let exportData: PortAsset[] = []
                const header: string[] = []
                const filterVal: string[] = []
                columns.forEach((item) => {
                    header.push(item.title)
                    filterVal.push(item.dataKey)
                })
                exportData = portAssetFormatJson(filterVal, allResponse.Data)
                resolve({
                    header,
                    exportData,
                    response: {
                        ...allResponse,
                        Pagination: {
                            Page: 1,
                            Limit: total,
                            OrderBy: query.Pagination.OrderBy,
                            Order: query.Pagination.Order
                        }
                    }
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
            if (allSelected) {
                const allUrls = allResponse.Data.map((item) => `${item.Host}:${item.Port}`)
                openExternalPage(key, allUrls)
            } else {
                openExternalPage(key, urls)
            }
        })
        /**发送到其他页面 */
        const openExternalPage = useMemoizedFn((key, urls) => {
            switch (key) {
                case "brute":
                    emiter.emit(
                        "openPage",
                        JSON.stringify({
                            route: YakitRoute.Mod_Brute,
                            params: {
                                targets: urls.join(",")
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
                                URL: JSON.stringify(urls)
                            }
                        })
                    )
                    break
                default:
                    break
            }
            setSendPopoverVisible(false)
        })
        const onTableChange = useMemoizedFn((page: number, limit: number, sort: SortProps, filter: any) => {
            if (sort.order === "none") {
                sort.order = "desc"
                sort.orderBy = "id"
            }
            setOffsetDataInTop([]) // 排序条件变化，清空缓存的实时数据
            setIsRefresh(!isRefresh)
            setQuery({
                ...query,
                Pagination: {
                    ...query.Pagination,
                    Order: sort.order,
                    OrderBy: sort.orderBy
                }
            })
            limitRef.current = defLimitRef.current
        })
        /**table所在的div大小发生变化 */
        const onTableResize = useMemoizedFn((width, height) => {
            if (!height) {
                return
            }
            const tableCellHeight = 28
            const limit = Math.trunc(height / tableCellHeight) + 10
            defLimitRef.current = limit
            if (total === 0) {
                // init
                update(true)
                return
            } else if (tableBodyHeightRef.current <= height) {
                // 窗口由小变大时 重新拉取数据
                const length = response.Data.length
                const h = length * tableCellHeight
                if (h < height) {
                    update()
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
                                                    disabled: selectNum === 0
                                                }}
                                            >
                                                <YakitButton
                                                    onClick={() => {}}
                                                    icon={<SolidPaperairplaneIcon />}
                                                    type={"primary"}
                                                    disabled={selectNum === 0}
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
                                selectedRowKeys: selectedRowKeys,
                                onSelectAll: (
                                    newSelectedRowKeys: string[],
                                    selected: PortAsset[],
                                    checked: boolean
                                ) => {
                                    if (checked) {
                                        setSelected(allResponse.Data)
                                        setSelectNumber(total)
                                    } else {
                                        setSelected([])
                                        setSelectNumber(0)
                                    }
                                },
                                onChangeCheckboxSingle: (c: boolean, keys: string, selectedRows) => {
                                    if (c) {
                                        setSelected((s) => [...s, selectedRows])
                                        setSelectNumber(selectNum + 1)
                                    } else {
                                        setSelected((s) => s.filter((ele) => ele.Id !== selectedRows.Id))
                                        setSelectNumber(selectNum - 1 <= 0 ? 0 : selectNum - 1)
                                    }
                                }
                            }}
                            pagination={{
                                total: total,
                                limit: response.Pagination.Limit,
                                page: response.Pagination.Page,
                                onChange: () => update()
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
                            useUpAndDown
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
                secondNodeClassName={classNames(styles["port-table-detail"], detailBodyClassName)}
            />
        )
    })
)
