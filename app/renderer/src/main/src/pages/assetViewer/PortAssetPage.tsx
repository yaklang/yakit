import React, {useEffect, useState, useMemo, useRef, ReactNode, CSSProperties} from "react"
import {Descriptions, Space, Divider, Badge} from "antd"
import {PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {failed} from "../../utils/notification"
import {PortAsset} from "./models"
import {formatTimestamp} from "../../utils/timeUtil"
import {YakEditor} from "../../utils/editors"
import {openExternalWebsite} from "../../utils/openWebsite"
import {ExportExcel} from "../../components/DataExport/DataExport"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn, useSelections, useUpdateEffect} from "ahooks"
import {onRemoveToolFC} from "../../utils/deleteTool"
import {isEnpriTraceAgent} from "@/utils/envfile"
import styles from "./PortAssetPage.module.scss"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ChromeFrameSvgIcon, ExportIcon, PaperAirplaneIcon, RefreshIcon, SearchIcon, TrashIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import classNames from "classnames"
import {
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
import {YakitResizeBox, YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {PortTable} from "./PortTable/PortTable"
import {apiQueryPortsBase, defQueryPortsRequest} from "./PortTable/utils"
import cloneDeep from "lodash/cloneDeep"
import {PortTableRefProps} from "./PortTable/PortTableType"

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
    RuntimeId: string
    AfterId?: number
    BeforeId?: number
    All?: boolean
    Order?: string
    OrderBy?: string
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

export const portAssetFormatJson = (filterVal, jsonData) => {
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
    const [params, setParams] = useState<QueryPortsRequest>({
        ...cloneDeep(defQueryPortsRequest),
        State: props.closed ? "closed" : "open"
    })
    const [keywords, setKeywords] = useState<string>("")
    const [total, setTotal] = useState<number>(0)

    const [selectNumber, setSelectNumber] = useState<number>(0)

    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [advancedConfig, setAdvancedConfig] = useState(true)
    const [advancedQueryLoading, setAdvancedQueryLoading] = useState(false)
    const [portsGroup, setPortsGroup] = useState<PortsGroup[]>([])
    const [queryList, setQueryList] = useState<QueryListProps>()

    const [offsetDataInTop, setOffsetDataInTop] = useState<PortAsset[]>([])

    const portAssetRef = useRef(null)
    const portTableRef = useRef<PortTableRefProps>(null)
    const [inViewport] = useInViewport(portAssetRef)

    useUpdateEffect(() => {
        // params.ComplexSelect 此条件搜索点击频繁
        const query = onGetQueryProcessing()
        setParams({...query})
        setIsRefresh(!isRefresh)
    }, [queryList, advancedConfig])
    useEffect(() => {
        getPortsGroup()
    }, [])

    const getPortsGroup = useMemoizedFn(() => {
        setAdvancedQueryLoading(true)
        ipcRenderer
            .invoke("QueryPortsGroup", {})
            .then((data: QueryPortsGroupResponse) => {
                setPortsGroup(data.PortsGroupList)
                setAdvancedConfig(data.PortsGroupList.length > 0)
            })
            .catch((e: any) => {
                failed("getPortsGroup failed: " + e)
            })
            .finally(() => setTimeout(() => setAdvancedQueryLoading(false), 200))
    })

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
        } else {
            query.ComplexSelect = ""
        }
        return query
    })

    const onRemove = useMemoizedFn(() => {
        if (portTableRef.current) {
            portTableRef.current.onRemove()
        }
    })
    const onResetRefresh = useMemoizedFn(() => {
        setParams({
            ...cloneDeep(defQueryPortsRequest),
            State: props.closed ? "closed" : "open"
        })
        setKeywords("")
        setQueryList(undefined)
        setIsRefresh(!isRefresh)
    })
    const onSearch = useMemoizedFn((val: string) => {
        setParams({
            ...params,
            Keywords: val
        })
        setIsRefresh(!isRefresh)
    })
    return (
        <div ref={portAssetRef} className={styles["portAsset-content"]} style={{display: "flex", flexDirection: "row"}}>
            <div className={styles["portAsset"]}>
                <div className={styles["portAsset-head"]}>
                    <div className={styles["head-title"]}>端口资产列表</div>
                    <div className={styles["head-extra"]}>
                        <YakitInput.Search
                            placeholder='请输入网络地址、端口、服务指纹、title关键词搜索'
                            style={{width: 320}}
                            onSearch={onSearch}
                            onPressEnter={() => onSearch(keywords)}
                            value={keywords}
                            onChange={(e) => {
                                const {value} = e.target
                                setKeywords(value)
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
                                            setIsRefresh(!isRefresh)
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
                            <Badge
                                dot={offsetDataInTop.length > 0}
                                offset={[-5, 4]}
                                className={styles["port-table-badge"]}
                            >
                                <div className={styles["refresh-button"]}>
                                    <RefreshIcon className={styles["refresh-icon"]} />
                                </div>
                            </Badge>
                        </YakitDropdownMenu>

                        {!advancedConfig && (
                            <>
                                <Divider type='vertical' style={{margin: "0 8px", marginRight: 12}} />
                                <span style={{marginRight: 4}}>高级筛选</span>
                                <YakitSwitch checked={advancedConfig} onChange={setAdvancedConfig} />
                            </>
                        )}
                    </div>
                </div>
                <PortTable
                    ref={portTableRef}
                    tableTitle={false}
                    query={params}
                    setQuery={setParams}
                    isRefresh={isRefresh}
                    setIsRefresh={setIsRefresh}
                    tableTitleExtraOperate={
                        <>
                            <YakitPopconfirm
                                title={selectNumber > 0 ? "确定删除勾选数据吗？" : "确定清空列表数据吗?"}
                                onConfirm={() => {
                                    onRemove()
                                }}
                                placement='bottomRight'
                            >
                                <YakitButton type='outline1' colors='danger' icon={<TrashIcon />}>
                                    {selectNumber > 0 ? "删除" : "清空"}
                                </YakitButton>
                            </YakitPopconfirm>
                        </>
                    }
                    tableTitleClassName={styles["port-table-title"]}
                    btnSize='middle'
                    offsetDataInTop={offsetDataInTop}
                    setOffsetDataInTop={setOffsetDataInTop}
                    setSelectNumber={setSelectNumber}
                    setTotal={setTotal}
                />
            </div>
            <PortAssetQuery
                loading={advancedQueryLoading}
                portsGroupList={portsGroup}
                visible={advancedConfig}
                setVisible={setAdvancedConfig}
                queryList={queryList || {}}
                setQueryList={setQueryList}
            />
        </div>
    )
}

interface PortTableAndDetailProps {
    firstNode: ReactNode
    currentSelectItem?: PortAsset
    resizeBoxProps?: YakitResizeBoxProps
    secondNodeClassName?: string
}
export const PortTableAndDetail: React.FC<PortTableAndDetailProps> = React.memo((props) => {
    const {firstNode, currentSelectItem, resizeBoxProps, secondNodeClassName} = props
    const onlyShowFirstNode = useMemo(() => {
        return !(currentSelectItem && currentSelectItem.Id)
    }, [currentSelectItem])
    return (
        <>
            <YakitResizeBox
                isVer={true}
                firstMinSize={150}
                freeze={!onlyShowFirstNode}
                firstRatio={onlyShowFirstNode ? "100%" : "60%"}
                secondRatio={onlyShowFirstNode ? "0%" : "40%"}
                secondMinSize={onlyShowFirstNode ? "0px" : 100}
                lineStyle={{display: currentSelectItem?.Id ? "" : "none"}}
                {...resizeBoxProps}
                secondNodeStyle={{
                    padding: currentSelectItem ? "8px 16px 16px 12px" : 0,
                    display: currentSelectItem ? "" : "none",
                    ...(resizeBoxProps?.secondNodeStyle || {})
                }}
                firstNode={firstNode}
                secondNode={
                    <>
                        {!onlyShowFirstNode && currentSelectItem && (
                            <div className={classNames("yakit-descriptions", secondNodeClassName)}>
                                <PortAssetDescription port={currentSelectItem} />
                            </div>
                        )}
                    </>
                }
            ></YakitResizeBox>
        </>
    )
})
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
        <div className={classNames(styles["portAsset-query"])} style={{display: visible ? "" : "none"}}>
            <div className={styles["query-head"]}>
                <span>高级筛选</span>
                <YakitSwitch checked={visible} onChange={setVisible} />
            </div>
            <YakitSpin spinning={loading} wrapperClassName={styles["portAsset-query-loading"]}>
                {portsGroupList.length === 0 ? (
                    <YakitEmpty style={{paddingTop: 48}} title='暂无指纹信息' />
                ) : (
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
                                        colors='danger'
                                        className={styles["port-group-remove"]}
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
                )}
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
                                return (
                                    <React.Fragment key={e}>
                                        <YakitCopyText showText={e} />
                                    </React.Fragment>
                                )
                            })}
                        </Space>
                    </Descriptions.Item>
                ) : undefined}
                {port.Fingerprint && (
                    <Descriptions.Item span={2} label='指纹信息'>
                        <div style={{height: 200}}>
                            <YakEditor value={port.Fingerprint} noLineNumber={true} noMiniMap={true} readOnly />
                        </div>
                    </Descriptions.Item>
                )}
            </Descriptions>
            <div className='descriptions-no-more'>暂无更多</div>
        </>
    )
}
