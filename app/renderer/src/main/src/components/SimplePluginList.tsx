import React, {useEffect, useRef, useState} from "react"
import {QueryYakScriptRequest, YakScript} from "../pages/invoker/schema"
import {PluginList} from "./PluginList"
import "./PluginList.css"
import {useDebounce, useDebounceEffect, useGetState, useMemoizedFn, useVirtualList} from "ahooks"
import {queryYakScriptList} from "../pages/yakitStore/network"
import {AutoCard} from "./AutoCard"
import {Space, Tag, Tooltip} from "antd"
import ReactResizeDetector from "react-resize-detector"
import {OneLine} from "../utils/inputUtil"
import {showModal} from "../utils/showModal"
import {CodeOutlined, QuestionCircleOutlined, UserOutlined} from "@ant-design/icons"
import {YakEditor} from "../utils/editors"

export interface SimplePluginListProp {
    readOnly?: boolean
    initialQuery?: QueryYakScriptRequest
    autoSelectAll?: boolean
    pluginTypes?: string
    initialSelected?: string[]
    onSelected?: (names: string[]) => any
    verbose?: string | any
    bordered?: boolean
    disabled?: boolean
}

export const SimplePluginList: React.FC<SimplePluginListProp> = React.memo((props: SimplePluginListProp) => {
    const [scripts, setScripts, getScripts] = useGetState<YakScript[]>([])
    const [total, setTotal] = useState(0)
    const [listNames, setListNames] = useState<string[]>([...(props.initialSelected || [])])

    // const [params, setParams] = useState<{ ScriptNames: string[] }>({ScriptNames: [...props.initialSelected || []]})
    const [pluginLoading, setPluginLoading] = useState<boolean>(false)

    const allSelectYakScript = useMemoizedFn((flag: boolean) => {
        if (flag) {
            const newSelected = [...scripts.map((i) => i.ScriptName), ...listNames]
            setListNames([...newSelected.filter((e, index) => newSelected.indexOf(e) === index)])
        } else {
            setListNames([])
        }
    })
    const selectYakScript = useMemoizedFn((y: YakScript) => {
        listNames.push(y.ScriptName)
        setListNames([...listNames])
    })
    const unselectYakScript = useMemoizedFn((y: YakScript) => {
        const names = listNames.splice(listNames.indexOf(y.ScriptName), 1)
        setListNames([...listNames])
    })

    useEffect(() => {
        if (props.onSelected) {
            props.onSelected([...listNames])
        }
    }, [listNames])

    const search = useMemoizedFn((searchParams?: {limit?: number; keyword?: string}, initial?: boolean) => {
        const {limit, keyword} = searchParams || {}
        console.info("插件菜单栏搜索", keyword, limit)
        setPluginLoading(true)
        queryYakScriptList(
            props.pluginTypes ? props.pluginTypes : "",
            (data, total) => {
                setTotal(total || 0)
                setScripts(data)
                if (props.autoSelectAll) {
                    setListNames(data.map((i) => i.ScriptName))
                } else {
                    setListNames([...(data || []).filter((i) => i.IsGeneralModule).map((i) => i.ScriptName)])
                }
            },
            () => setTimeout(() => setPluginLoading(false), 300),
            limit || 200,
            undefined,
            keyword,
            props.initialQuery
        )
    })

    useDebounceEffect(
        () => {
            search(
                {
                    limit: props.initialQuery?.Pagination ? props.initialQuery.Pagination.Limit : 300,
                    keyword: props.initialQuery?.Keyword
                },
                true
            )
        },
        [props.initialQuery],
        {wait: 500}
    )

    return (
        <PluginList
            readOnly={props.readOnly}
            bordered={props.bordered}
            loading={pluginLoading}
            lists={(scripts || []).sort((a: YakScript, b: YakScript) => {
                return (b.IsGeneralModule ? 1 : 0) - (a.IsGeneralModule ? 1 : 0)
            })}
            disabled={props.disabled}
            getLists={getScripts}
            total={total}
            selected={listNames}
            allSelectScript={allSelectYakScript}
            selectScript={selectYakScript}
            unSelectScript={unselectYakScript}
            search={search}
            title={props?.verbose || "插件"}
            bodyStyle={{
                padding: "0 4px",
                overflow: "hidden"
            }}
        />
    )
})

export interface SimplePluginListFromYakScriptNamesProp {
    names: string[]
}

export const SimplePluginListFromYakScriptNames: React.FC<SimplePluginListFromYakScriptNamesProp> = React.memo(
    (props: SimplePluginListFromYakScriptNamesProp) => {
        const [_list, setLists, getLists] = useGetState(props.names)

        const containerRef = useRef()
        const wrapperRef = useRef()
        const [list] = useVirtualList(getLists(), {
            containerTarget: containerRef,
            wrapperTarget: wrapperRef,
            itemHeight: 40,
            overscan: 20
        })
        const [vlistWidth, setVListWidth] = useState(260)
        const [vlistHeigth, setVListHeight] = useState(600)

        return (
            <div className={"plugin-list-body"}>
                <AutoCard
                    title={"未完成的任务列表"}
                    size={"small"}
                    bordered={false}
                    extra={[
                        <Space>
                            <Tag>共{getLists().length}个</Tag>
                        </Space>
                    ]}
                >
                    <ReactResizeDetector
                        onResize={(width, height) => {
                            if (!width || !height) {
                                return
                            }
                            setVListWidth(width - 90)
                            setVListHeight(height)
                        }}
                        handleWidth={true}
                        handleHeight={true}
                        refreshMode={"debounce"}
                        refreshRate={50}
                    />
                    <div ref={containerRef as any} style={{height: vlistHeigth, overflow: "auto"}}>
                        <div ref={wrapperRef as any}>
                            {list.map((i) => (
                                <div key={i.index} className={`list-opt`}>
                                    <OneLine width={vlistWidth} overflow={`hidden`}>
                                        <div>{i.data}</div>
                                    </OneLine>
                                    <div style={{flex: 1, textAlign: "right"}}>
                                        <a
                                            onClick={() => {
                                                showYakScriptHelp(i.data)
                                            }}
                                            href={"#"}
                                            style={{marginLeft: 2, marginRight: 2}}
                                        >
                                            <QuestionCircleOutlined />
                                        </a>
                                        <a
                                            href={"#"}
                                            style={{marginRight: 2, marginLeft: 2}}
                                            onClick={() => {
                                                showYakScriptAuthor(i.data)
                                            }}
                                        >
                                            <UserOutlined />
                                        </a>
                                        <a
                                            href={"#"}
                                            style={{marginRight: 2, marginLeft: 2}}
                                            onClick={() => {
                                                showYakScriptCode(i.data)
                                            }}
                                        >
                                            <CodeOutlined />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AutoCard>
            </div>
        )
    }
)

const {ipcRenderer} = window.require("electron")

const showYakScriptHelp = (name: string) => {
    ipcRenderer.invoke("GetYakScriptByName", {Name: name}).then((i: YakScript) => {
        showModal({
            width: "40%",
            title: "Help",
            content: <>{i.Help}</>
        })
    })
}

const showYakScriptAuthor = (name: string) => {
    ipcRenderer.invoke("GetYakScriptByName", {Name: name}).then((i: YakScript) => {
        showModal({
            width: "40%",
            title: "Help",
            content: <>{i.Author}</>
        })
    })
}

const showYakScriptCode = (name: string) => {
    ipcRenderer.invoke("GetYakScriptByName", {Name: name}).then((i: YakScript) => {
        showModal({
            title: "1231",
            width: "60%",
            content: (
                <div style={{height: 400}}>
                    <YakEditor type={i.Type === "nuclei" ? "yaml" : "yak"} readOnly={true} value={i.Content} />
                </div>
            )
        })
    })
}
