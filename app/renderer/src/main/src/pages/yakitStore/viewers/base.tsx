import React, {useEffect, useRef, useState} from "react"
import {YakScript} from "../../invoker/schema"
import {Card, Col, Popover, Progress, Row, Space, Statistic, Tabs, Timeline, Tooltip} from "antd"
import {LogLevelToCode, TableFilterDropdownForm} from "../../../components/HTTPFlowTable"
import {YakitLogFormatter} from "../../invoker/YakitLogFormatter"
import {ExecResultLog, ExecResultProgress} from "../../invoker/batch/ExecMessageViewer"
import {randomString} from "../../../utils/randomUtil"
import {WebsiteTreeViewer} from "./WebsiteTree"
import {BasicTable} from "./BasicTable"
import {XTerm} from "xterm-for-react"
import {formatDate} from "../../../utils/timeUtil"
import {xtermFit} from "../../../utils/xtermUtils"
import {CaretDownOutlined, CaretUpOutlined, SearchOutlined} from "@ant-design/icons"
import {failed} from "../../../utils/notification"
import {CVXterm} from "../../../components/CVXterm"
import {AutoCard} from "../../../components/AutoCard"
import "./base.scss"
import {ExportExcel} from "../../../components/DataExport"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

export interface StatusCardProps {
    Id: string
    Data: string
    Timestamp: number
    Tag?: string
}

export interface StatusCardInfoProps {
    tag: string
    info: StatusCardProps[]
}

export type ExecResultStatusCard = StatusCardProps

export interface PluginResultUIProp {
    loading: boolean
    results: ExecResultLog[]
    featureType: ExecResultLog[]
    feature?: ExecResultLog[]
    progress: ExecResultProgress[]
    statusCards: StatusCardInfoProps[]
    script?: YakScript
    defaultConsole?: boolean

    onXtermRef?: (ref: any) => any
    debugMode?: boolean

    cardStyleType?: number
}

export interface TooltipTitleProps {
    list: StatusCardProps[]
}

const idToColor = (id: string) => {
    switch (true) {
        case id.includes("success"):
        case id.includes("成功"):
        case id.includes("succeeded"):
        case id.includes("finished"):
            return "#b7eb8f"
        case id.includes("error"):
        case id.includes("失败"):
        case id.includes("错误"):
        case id.includes("fatal"):
        case id.includes("missed"):
        case id.includes("miss"):
        case id.includes("failed"):
        case id.includes("panic"):
            return "#ea5f5f"
        default:
            return "#8c8c8c"
    }
}

const TooltipTitle: React.FC<TooltipTitleProps> = React.memo((props) => {
    const {list} = props
    return (
        <div className='tooltip-title'>
            {list.map((info, infoIndex) => (
                <Statistic
                    valueStyle={{
                        color: idToColor(info.Id),
                        fontSize: 14
                    }}
                    key={info.Id}
                    title={list.length > 1 && <p className='tooltip-id'>{info.Id}</p>}
                    value={info.Data}
                />
            ))}
        </div>
    )
})

export const PluginResultUI: React.FC<PluginResultUIProp> = React.memo((props) => {
    const {loading, results, featureType = [], feature = [], progress, script, statusCards, cardStyleType} = props
    const [active, setActive] = useState(props.defaultConsole ? "console" : "feature-0")
    const xtermRef = useRef(null)
    const timer = useRef<any>(null)

    useEffect(() => {
        if (!xtermRef) {
            return
        }
        if (props.onXtermRef) props.onXtermRef(xtermRef)
    }, [xtermRef])

    let progressBars: { id: string; node: React.ReactNode }[] = []
    progress.forEach((v) => {
        progressBars.push({
            id: v.id,
            node: (
                <Card size={"small"} hoverable={false} bordered={true} title={`任务进度ID：${v.id}`}>
                    <Progress percent={parseInt((v.progress * 100).toFixed(0))} status='active'/>
                </Card>
            )
        })
    })
    // progressBars = progressBars.sort((a, b) => a.id.localeCompare(b.id));

    const features: { feature: string; params: any; key: string }[] = featureType
        .filter((i) => {
            return i.level === "json-feature"
        })
        .map((i) => {
            try {
                let res = JSON.parse(i.data) as { feature: string; params: any; key: string }
                if (!res.key) {
                    res.key = randomString(50)
                }
                return res
            } catch (e) {
                return {feature: "", params: undefined, key: ""}
            }
        })
        .filter((i) => i.feature !== "")

    const finalFeatures = features.length > 0 ? features.filter((data, i) => features.indexOf(data) === i) : []

    const timelineItemProps = (results || [])
        .filter((i) => {
            return !((i?.level || "").startsWith("json-feature") || (i?.level || "").startsWith("feature-"))
        })
        .splice(0, 25)
    const renderCard = (infoList, type) => {
        switch (type) {
            case 1:
                return (
                    <>
                        {infoList.length > 0 && (
                            <Tooltip
                                color='#fff'
                                title={<TooltipTitle list={infoList}/>}
                                overlayClassName='status-cards-info'
                                placement='topLeft'
                            >
                                <Statistic
                                    valueStyle={{
                                        color: idToColor(infoList[0].Id)
                                    }}
                                    key={infoList[0].Id}
                                    value={infoList[0].Data}
                                />
                            </Tooltip>
                        )}
                    </>
                )
            default:
                return (
                    <div style={{display: "flex", justifyContent: "space-between"}}>
                        {infoList.map((info, infoIndex) => {
                            return (
                                <Statistic
                                    valueStyle={{
                                        color: idToColor(info.Id),
                                        textAlign: `${infoIndex >= 1 && 2 === infoIndex + 1 ? "right" : "left"}`
                                    }}
                                    key={info.Id}
                                    title={infoList.length > 1 ? info.Id : ""}
                                    value={info.Data}
                                />
                            )
                        })}
                    </div>
                )
        }
    }
    return (
        <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
            {/* <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "auto"}}> */}
            {props.debugMode && props.onXtermRef && (
                <>
                    <div style={{width: "100%", height: 240}}>
                        <XTerm
                            ref={xtermRef}
                            options={{convertEol: true, rows: 8}}
                            onResize={(r) => {
                                xtermFit(xtermRef, 50, 18)
                            }}
                            customKeyEventHandler={(e) => {
                                if (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) {
                                    const str = xtermRef?.current
                                        ? (xtermRef.current as any).terminal.getSelection()
                                        : ""

                                    if (timer.current) {
                                        clearTimeout(timer.current)
                                        timer.current = null
                                    }
                                    timer.current = setTimeout(() => {
                                        ipcRenderer.invoke("copy-clipboard", str).finally(() => {
                                            timer.current = null
                                        })
                                    }, 300)
                                }
                                return true
                            }}
                        />
                    </div>
                </>
            )}
            {statusCards.length > 0 && (
                <div className='status-cards-body'>
                    <Row gutter={8}>
                        {statusCards.map((card, cardIndex) => {
                            return (
                                <Col key={card.tag} span={8} style={{marginBottom: 8}}>
                                    <Card
                                        hoverable={true}
                                        bodyStyle={{
                                            padding: 12,
                                            height: 130,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between"
                                        }}
                                    >
                                        <Tooltip
                                            color='#fff'
                                            title={<span className='font-color-000'>{card.tag}</span>}
                                            placement='topLeft'
                                        >
                                            <h2 className='status-cards-tag'>{card.tag}</h2>
                                        </Tooltip>
                                        {renderCard(card.info, cardStyleType)}
                                    </Card>
                                </Col>
                            )
                        })}
                    </Row>
                </div>
            )}
            {progressBars.length > 0 && (
                <div style={{marginTop: 4, marginBottom: 8}}>{progressBars.map((i) => i.node)}</div>
            )}
            <Tabs
                style={{flex: 1}}
                className={"main-content-tabs"}
                size={"small"}
                activeKey={active}
                onChange={(activeKey) => {
                    setActive(activeKey)
                    setTimeout(() => {
                        if (xtermRef && props.debugMode) xtermFit(xtermRef, 50, 18)
                    }, 50)
                }}
            >
                {(finalFeatures || []).map((i, index) => {
                    return (
                        <Tabs.TabPane tab={YakitFeatureTabName(i.feature, i.params)} key={`feature-${index}`}>
                            <YakitFeatureRender params={i.params} feature={i.feature} execResultsLog={feature || []}/>
                        </Tabs.TabPane>
                    )
                })}
                <Tabs.TabPane tab={"基础插件信息 / 日志"} key={finalFeatures.length > 0 ? "log" : "feature-0"}>
                    {
                        <>
                            {/*<Divider orientation={"left"}>Yakit Module Output</Divider>*/}
                            <AutoCard
                                size={"small"}
                                hoverable={true}
                                bordered={true}
                                title={
                                    <Space>
                                        <div>任务额外日志与结果</div>
                                        {(timelineItemProps || []).length > 0
                                            ? formatDate(timelineItemProps[0].timestamp)
                                            : ""}
                                    </Space>
                                }
                                style={{marginBottom: 20, marginRight: 2}}
                                bodyStyle={{overflowY: "auto"}}
                            >
                                <Timeline pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                                    {(timelineItemProps || []).reverse().map((e, index) => {
                                        return (
                                            <Timeline.Item key={index} color={LogLevelToCode(e.level)}>
                                                <YakitLogFormatter
                                                    data={e.data}
                                                    level={e.level}
                                                    timestamp={e.timestamp}
                                                    onlyTime={true}
                                                />
                                            </Timeline.Item>
                                        )
                                    })}
                                </Timeline>
                            </AutoCard>
                        </>
                    }
                </Tabs.TabPane>
                {!props.debugMode && props.onXtermRef && (
                    <Tabs.TabPane tab={"Console"} key={"console"}>
                        <div style={{width: "100%", height: "100%"}}>
                            <CVXterm ref={xtermRef} options={{convertEol: true}}/>
                            {/* <XTerm ref={xtermRef} options={{convertEol: true, rows: 8}}
                        onResize={(r) => {
                            xtermFit(xtermRef, 50, 18)
                        }}
                        customKeyEventHandler={(e) => {
                            if (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) {
                                const str = xtermRef?.current ? (xtermRef.current as any).terminal.getSelection() : ""

                                if (timer.current) {
                                    clearTimeout(timer.current)
                                    timer.current = null
                                }
                                timer.current = setTimeout(() => {
                                    ipcRenderer.invoke("copy-clipboard", str).finally(() => {
                                        timer.current = null
                                    })
                                }, 300)
                            }
                            return true
                        }}
                    /> */}
                        </div>
                    </Tabs.TabPane>
                )}
            </Tabs>
            {/* </div> */}
        </div>
    )
})

export interface YakitFeatureRenderProp {
    feature: string
    params: any
    execResultsLog: ExecResultLog[]
}

export const YakitFeatureTabName = (feature: string, params: any) => {
    switch (feature) {
        case "website-trees":
            return "网站树结构 / Website Map"
        case "fixed-table":
            return params["table_name"] || "输出表"
    }
    return feature.toUpperCase
}

const formatJson = (filterVal, jsonData) => {
    return jsonData.map((v) => filterVal.map((j) => v[j]))
}

// 升序
const compareAsc = (value1: object, value2: object, text: string) => {
    if (value1[text] < value2[text]) {
        return -1
    } else if (value1[text] > value2[text]) {
        return 1
    } else {
        return 0
    }
}

// 降序
const compareDesc = (value1: object, value2: object, text: string) => {
    if (value1[text] > value2[text]) {
        return -1
    } else if (value1[text] < value2[text]) {
        return 1
    } else {
        return 0
    }
}

export const YakitFeatureRender: React.FC<YakitFeatureRenderProp> = (props) => {
    const [params, setParams] = useState<any>({}) // 设置表头 排序
    const [query, setQuery] = useState<any>({}) // 设置表头查询条件
    const [loading, setLoading] = useState<boolean>(false)
    const tableData = useRef<any>([])
    const tableDataOriginal = useRef<any>([])
    useEffect(() => {
        tableData.current = (props.execResultsLog || [])
            .filter((i) => i.level === "feature-table-data")
            .map((i) => {
                try {
                    const originData = JSON.parse(i.data)
                    return {...originData.data, table_name: originData?.table_name}
                } catch (e) {
                    return {} as any
                }
            })
            .filter((i) => {
                try {
                    if ((i?.table_name || "") === (props.params?.table_name || "")) {
                        return true
                    }
                } catch (e) {
                    return false
                }
                return false
            })
        tableDataOriginal.current = tableData.current
    }, [])

    useEffect(() => {
        const item = tableData.current[0] || {}
        const obj = {}
        const objQuery = {};
        (props.params["columns"] || []).forEach((ele) => {
            obj[ele] = {
                isFilter: !isNaN(Number(item[ele])) // 只有数字类型才排序
            }
            objQuery[ele] = ""
        })
        setParams(obj)
        setQuery(objQuery)
    }, [])

    const getData = useMemoizedFn(() => {
        return new Promise((resolve) => {
            const header = props.params["columns"]
            const exportData = formatJson(header, tableData.current)
            const params = {
                header,
                exportData,
                response: {
                    Pagination: {
                        Page: 1
                    },
                    Data: props.execResultsLog,
                    Total: props.execResultsLog.length
                }
            }
            resolve(params)
        })
    })

    // 排序
    const confirmFilter = useMemoizedFn((text: string) => {
        if (!params[text]?.isFilter) {
            failed("该类型不支持排序")
            return
        }
        setLoading(true)
        const value = params[text].sort === "up" ? "down" : "up"
        const newParams = {
            ...params[text],
            sort: value
        }
        if (value === "up") {
            tableData.current.sort((a, b) => compareAsc(a, b, text))
        } else {
            tableData.current.sort((a, b) => compareDesc(a, b, text))
        }
        setParams({...params, [text]: {...newParams}})
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })
    // 搜索
    const confirm = useMemoizedFn(() => {
        setLoading(true)
        const list: any = []
        const length = tableDataOriginal.current.length
        const queryHaveValue = {}
        // 找出有查询条件
        for (const key in query) {
            const objItem = query[key]
            if (objItem) {
                queryHaveValue[key] = query[key]
            }
        }
        // 所有查询条件为空时，返回原始数据
        if (Object.getOwnPropertyNames(queryHaveValue).length == 0) {
            tableData.current = tableDataOriginal.current
            setTimeout(() => {
                setLoading(false)
            }, 200)
            return
        }
        // 搜索
        for (let index = 0; index < length; index++) {
            const elementArrayItem = tableDataOriginal.current[index]
            let isAdd: boolean[] = []
            for (const key in queryHaveValue) {
                const objItem = queryHaveValue[key]
                const isHave = `${elementArrayItem[key]}`.includes(objItem)
                isAdd.push(isHave)
            }
            // 所有条件都满足
            if (!isAdd.includes(false)) {
                list.push(elementArrayItem)
            }
            isAdd = []
        }

        tableData.current = list
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })

    const columns = (props.params["columns"] || []).map((i) => ({
        name: i,
        title: (
            <div className='columns-title'>
                <div className='title'>{i}</div>
                <div className='icon'>
                    <Popover
                        content={
                            <TableFilterDropdownForm
                                label={`搜索${i}`}
                                params={query}
                                setParams={setQuery}
                                filterName={i}
                                pureString={true}
                                confirm={confirm}
                            />
                        }
                        trigger={["hover", "click"]}
                    >
                        <SearchOutlined style={{color: "#1890ff", marginRight: 6}}/>
                    </Popover>
                    {params[i]?.isFilter && (
                        <Tooltip title={<span>{params[i]?.sort === "up" ? "点击降序" : "点击升序"}</span>}>
                            <div className='filter' onClick={() => confirmFilter(i)}>
                                <CaretUpOutlined
                                    style={{color: (params[i]?.sort === "up" && "#1890ff") || undefined}}
                                />
                                <CaretDownOutlined
                                    style={{color: (params[i]?.sort === "down" && "#1890ff") || undefined}}
                                />
                            </div>
                        </Tooltip>
                    )}
                </div>
            </div>
        )
    }))
    switch (props.feature) {
        case "website-trees":
            return (
                <div style={{height: "100%"}}>
                    <WebsiteTreeViewer {...props.params} />
                </div>
            )
        case "fixed-table":
            return (
                <div style={{height: "100%", display: "flex", flexFlow: "column", overflowY: "auto"}}>
                    <div className='btn-body'>
                        <ExportExcel getData={getData} btnProps={{size: "small"}} fileName='爆破结果'/>
                    </div>
                    <BasicTable columns={columns} data={tableData.current} loading={loading}/>
                </div>
            )
    }
    return <div>Other</div>
}
