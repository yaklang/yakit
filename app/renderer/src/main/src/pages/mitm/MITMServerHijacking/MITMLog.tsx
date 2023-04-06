import React, {useEffect, useMemo, useRef, useState} from "react"
import styles from "./MITMServerHijacking.module.scss"
import {
    availableColors,
    CalloutColor,
    CompateData,
    getClassNameData,
    HTTPFlow,
    HTTPFlowsFieldGroupResponse,
    HTTPFlowShield,
    onExpandHTTPFlow,
    onRemoveCalloutColor,
    onSendToTab,
    ShieldData
} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import classNames from "classnames"
import {ColumnsTypeProps, FiltersItemProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {useDebounceEffect, useDebounceFn, useGetState, useInViewport, useMemoizedFn, useRafInterval} from "ahooks"
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema"
import {yakitFailed} from "@/utils/notification"
import {callCopyToClipboard} from "@/utils/basic"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {showResponseViaHTTPFlowID, showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {GetPacketScanByCursorMenuItem, packetScanDefaultValue} from "@/pages/packetScanner/DefaultPacketScanGroup"
import {ArrowCircleRightSvgIcon, ChromeFrameSvgIcon} from "@/assets/newIcon"
import {showDrawer} from "@/utils/showModal"
import {showByCustom} from "@/components/functionTemplate/showByContext"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {execPacketScan} from "@/pages/packetScanner/PacketScanner"

const {ipcRenderer} = window.require("electron")

interface MITMLogProps {
    shieldData: ShieldData
    setShieldData: (s: ShieldData) => void
}
// 数组去重
const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)
export const MITMLog: React.FC<MITMLogProps> = React.memo((props) => {
    const {shieldData, setShieldData} = props
    const [params, setParams] = useState<YakQueryHTTPFlowRequest>({
        SearchURL: "",
        SourceType: "mitm",
        Pagination: {...genDefaultPagination(), OrderBy: "created_at", Page: 1, Limit: 30}
    })
    const [data, setData] = useState<HTTPFlow[]>([])
    const [loading, setLoading] = useState(true)
    const [statusCode, setStatusCode, getStatusCode] = useGetState<FiltersItemProps[]>([])

    const [selected, setSelected] = useState<HTTPFlow>()

    const [compareLeft, setCompareLeft] = useState<CompateData>({content: "", language: "http"})
    const [compareRight, setCompareRight] = useState<CompateData>({content: "", language: "http"})

    const [compareState, setCompareState] = useState<number>(0)
    const [total, setTotal] = useState<number>(0)

    const logRef = useRef(null)
    const [inViewport] = useInViewport(logRef)

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
                title: "方法",
                dataKey: "Method",
                width: 80
                // filterProps: {
                //     filterKey: "Methods",
                //     filtersType: "select",
                //     filtersSelectAll: {
                //         isAll: true
                //     },
                //     filters: [
                //         {
                //             label: "GET",
                //             value: "GET"
                //         },
                //         {
                //             label: "POST",
                //             value: "POST"
                //         },
                //         {
                //             label: "HEAD",
                //             value: "HEAD"
                //         }
                //     ]
                // }
            },
            {
                title: "状态码",
                dataKey: "StatusCode",
                width: 100,
                // filterProps: {
                //     filtersType: "select",
                //     filterMultiple: true,
                //     filterSearchInputProps: {
                //         size: "small"
                //     },
                //     filterOptionRender: (item: FiltersItemProps) => (
                //         <div>
                //             <span>{item.value}</span>
                //             <span>{item.total}</span>
                //         </div>
                //     ),
                //     filters: statusCode
                // },
                render: (text) => <div className={styles["status-code"]}>{text}</div>
            },
            {
                title: "URL",
                dataKey: "Url"
            },
            {
                title: "Title",
                dataKey: "HtmlTitle",
                width: 180
            },
            {
                title: "Tag",
                dataKey: "Tags",
                minWidth: 200,
                render: (text) => {
                    return text
                        ? `${text}`
                              .split("|")
                              .filter((i) => !i.startsWith("YAKIT_COLOR_"))
                              .join(", ")
                        : ""
                }
            },
            {
                title: "响应长度",
                dataKey: "BodyLength",
                minWidth: 80,
                render: (_, rowData) => {
                    return (
                        <>
                            {/* 1M 以上的话，是红色*/}
                            {rowData.BodyLength !== -1 && (
                                <div
                                    className={classNames({
                                        [styles["body-length-text-red"]]: rowData.BodyLength > 1000000
                                    })}
                                >
                                    {rowData.BodySizeVerbose ? rowData.BodySizeVerbose : rowData.BodyLength}
                                </div>
                            )}
                        </>
                    )
                }
            },
            {
                title: "操作",
                dataKey: "action",
                width: 80,
                fixed: "right",
                render: (_, rowData) => {
                    if (!rowData.Hash) return <></>
                    return (
                        <div className={styles["action-btn-group"]}>
                            <a
                                onClick={(e) => {
                                    ipcRenderer
                                        .invoke("GetHTTPFlowById", {Id: rowData?.Id})
                                        .then((i: HTTPFlow) => {
                                            showResponseViaResponseRaw(i?.Response)
                                        })
                                        .catch((e: any) => {
                                            yakitFailed(`Query HTTPFlow failed: ${e}`)
                                        })
                                }}
                            >
                                <ChromeFrameSvgIcon className={styles["icon-style"]} />
                            </a>
                            <div className={styles["divider-style"]}></div>
                            <a
                                onClick={(e) => {
                                    let m = showDrawer({
                                        width: "80%",
                                        content: onExpandHTTPFlow(rowData, () => m.destroy())
                                    })
                                }}
                            >
                                <ArrowCircleRightSvgIcon className={styles["icon-style"]} />
                            </a>
                        </div>
                    )
                }
            }
        ]
    }, [statusCode])
    const update = () => {
        if (!inViewport) {
            return
        }
        const l = data.length
        const newParams = {
            ...params,
            AfterId: l > 0 ? Math.ceil(data[0].Id) : undefined // 用于计算增量的
        }
        ipcRenderer
            .invoke("QueryHTTPFlows", {...newParams})
            .then((res: QueryGeneralResponse<HTTPFlow>) => {
                // if (res?.Data.length === 0) return
                const newData: HTTPFlow[] = getClassNameData(res?.Data || [])
                    .concat(data || [])
                    .filter((_, index) => index < 30)

                setData(newData)
                setTotal(res.Total)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    }
    useEffect(() => {
        let idArr: number[] = []
        let urlArr: string[] = []
        shieldData.data.map((item) => {
            if (typeof item === "string") {
                urlArr = [...urlArr, item]
            } else {
                idArr = [...idArr, item]
            }
        })
        setParams({...params, ExcludeId: idArr, ExcludeInUrl: urlArr})
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 1000)
    }, [shieldData])

    useRafInterval(
        () => {
            update()
        },
        1000,
        {immediate: true}
    )
    useEffect(() => {
        getHTTPFlowsFieldGroup(true)
    }, [])
    // useEffect(() => {
    //     // 刷新
    //     getHTTPFlowsFieldGroup(true)
    // }, [total])
    // 向主页发送对比数据
    useEffect(() => {
        if (compareLeft.content) {
            const params = {info: compareLeft, type: 1}
            setCompareState(compareState === 0 ? 1 : 0)
            ipcRenderer.invoke("add-data-compare", params)
        }
    }, [compareLeft])

    useEffect(() => {
        if (compareRight.content) {
            const params = {info: compareRight, type: 2}
            setCompareState(compareState === 0 ? 2 : 0)
            ipcRenderer.invoke("add-data-compare", params)
        }
    }, [compareRight])
    // 获取tags等分组
    const getHTTPFlowsFieldGroup = useMemoizedFn((RefreshRequest: boolean) => {
        ipcRenderer
            .invoke("HTTPFlowsFieldGroup", {
                RefreshRequest
            })
            .then((rsp: HTTPFlowsFieldGroupResponse) => {
                const statusCode = rsp.StatusCode.map((ele) => ({value: ele.Value, total: ele.Total, label: ele.Value}))
                setStatusCode([...statusCode])
            })
            .catch((e: any) => {
                yakitFailed(`query HTTP Flows Field Group failed: ${e}`)
            })
    })
    const onRowClick = useMemoizedFn((rowDate: HTTPFlow) => {
        if (!rowDate.Hash) return
        if (rowDate.Hash !== selected?.Hash) {
            setSelected(rowDate)
        } else {
            // setSelected(undefined)
        }
    })

    const menuData = [
        {
            key: "send-web-fuzzer",
            label: "发送到 Web Fuzzer"
        },
        {
            key: "packet-scanning",
            label: "数据包扫描",
            onClick: () => {},
            children: GetPacketScanByCursorMenuItem(selected?.Id || 0)?.subMenuItems?.map((ele) => ({
                key: ele.title,
                label: ele.title
            }))
        },
        {
            key: "copy-url",
            label: "复制 URL"
        },
        {
            key: "down-response-body",
            label: "下载 Response Body"
        },
        {
            key: "open-in-browser",
            label: "浏览器中打开"
        },
        {
            key: "callout-color",
            label: "标注颜色",
            children: availableColors.map((i) => {
                return {
                    label: i.render,
                    key: i.color
                }
            })
        },
        {
            key: "remove-color",
            label: "移除颜色"
        },
        {
            key: "send-comparator",
            label: "发送到对比器",
            children: [
                {
                    key: "send-comparator-to-left",
                    label: "发送到对比器左侧",
                    disabled: [false, true, false][compareState]
                },
                {
                    key: "send-comparator-to-right",
                    label: "发送到对比器右侧",
                    disabled: [false, false, true][compareState]
                }
            ]
        },
        {
            key: "shield",
            label: "屏蔽",
            children: [
                {
                    key: "shield-record",
                    label: "屏蔽该记录"
                },
                {
                    key: "shield-url",
                    label: "屏蔽URL"
                },
                {
                    key: "shield-domain",
                    label: "屏蔽域名"
                }
            ]
        }
    ]
    const onDownResponseBody = useMemoizedFn(() => {
        if (!selected) return
        ipcRenderer.invoke("GetResponseBodyByHTTPFlowID", {Id: selected.Id}).then((bytes: {Raw: Uint8Array}) => {
            saveABSFileToOpen(`response-body.txt`, bytes.Raw)
        })
    })
    const onShieldRecord = useMemoizedFn(() => {
        if (!selected) return
        const id = Math.ceil(selected.Id)
        const newArr = filterItem([...shieldData.data, id])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
    })
    const onShieldUrl = useMemoizedFn(() => {
        if (!selected) return
        let Url = selected?.Url
        // 根据URL拿到ID数组
        const newArr = filterItem([...shieldData.data, Url])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
    })
    const onShieldDomain = useMemoizedFn(() => {
        if (!selected) return
        const host = selected?.HostPort?.split(":")[0] || ""
        // 根据host拿到对应ID数组
        const newArr = filterItem([...shieldData.data, host])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
    })
    const menuSelect = useMemoizedFn((key: string) => {
        if (!selected) return
        switch (key) {
            case "send-web-fuzzer":
                onSendToTab(selected)
                break
            case "自定义":
            case "网络设备与OA系统":
            case "安全产品":
            case "FastJSON":
            case "Log4j":
            case "Weblogic":
            case "远程代码执行（扫描）":
            case "XSS":
                execPacketScan([selected.Id], packetScanDefaultValue.find((ele) => ele.Verbose === key)?.Keyword)
                break
            case "copy-url":
                callCopyToClipboard(selected.Url)
                break
            case "down-response-body":
                onDownResponseBody()
                break
            case "open-in-browser":
                showResponseViaHTTPFlowID(selected)
                break
            case "RED":
            case "GREEN":
            case "BLUE":
            case "YELLOW":
            case "ORANGE":
            case "PURPLE":
            case "CYAN":
            case "GREY":
                CalloutColor(
                    selected,
                    availableColors.find((ele) => ele.color === key),
                    data,
                    setData
                )
                break
            case "remove-color":
                onRemoveCalloutColor(selected, data, setData)
                break
            case "send-comparator-to-left":
                setCompareLeft({
                    content: new Buffer(selected.Request).toString("utf8"),
                    language: "http"
                })
                break
            case "send-comparator-to-right":
                setCompareRight({
                    content: new Buffer(selected.Request).toString("utf8"),
                    language: "http"
                })
                break
            case "shield-record":
                onShieldRecord()
                break

            case "shield-url":
                onShieldUrl()
                break
            case "shield-domain":
                onShieldDomain()
                break
            default:
                break
        }
    })
    const onRowContextMenu = (rowData: HTTPFlow, event: React.MouseEvent) => {
        if (rowData) {
            setSelected(rowData)
        }
        showByCustom(
            {
                reactNode: (
                    <div className={styles["context-menu-custom"]}>
                        <YakitMenu
                            data={menuData}
                            width={150}
                            onClick={({key}) => {
                                menuSelect(key)
                            }}
                        />
                    </div>
                ),
                height: 266,
                width: 158
            },
            event.clientX,
            event.clientY
        )
    }
    const onTableChange = useDebounceFn(
        (page: number, limit: number, _, filter: any) => {
            setParams({
                ...params,
                ...filter
            })
            setLoading(true)
            setTimeout(() => {
                setLoading(false)
            }, 1000)
        },
        {wait: 500}
    ).run
    const onSetCurrentRow = useDebounceFn(
        (rowDate: HTTPFlow) => {
            onRowClick(rowDate)
        },
        {wait: 200}
    ).run
    return (
        <div className={styles["mitm-log"]} ref={logRef}>
            <TableVirtualResize<HTTPFlow>
                query={params}
                titleHeight={0.1}
                renderTitle={<></>}
                renderKey='Id'
                data={data}
                loading={loading}
                enableDrag={true}
                columns={columns}
                onRowClick={onRowClick}
                onRowContextMenu={onRowContextMenu}
                onChange={onTableChange}
                onSetCurrentRow={onSetCurrentRow}
                pagination={{
                    total: data.length,
                    page: 1,
                    limit: 50,
                    onChange: () => {}
                }}
            />
        </div>
    )
})

interface MITMLogHeardExtraProps {
    shieldData: ShieldData
    cancleFilter: (s: string | number) => void
}
export const MITMLogHeardExtra: React.FC<MITMLogHeardExtraProps> = React.memo((props) => {
    const {shieldData, cancleFilter} = props
    return (
        <div className={styles["mitm-log-heard"]}>
            <HTTPFlowShield shieldData={shieldData} cancleFilter={cancleFilter} />
        </div>
    )
})
