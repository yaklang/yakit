import React, {memo, useEffect, useRef, useState, ReactNode, useLayoutEffect} from "react"
import {Input, Popover, Space, Tabs} from "antd"
import {multipleNodeInfo} from "./MainOperator"
import {AutoSpin} from "../components/AutoSpin"
import {DropdownMenu} from "../components/baseTemplate/DropdownMenu"
import {CloseOutlined, EditOutlined} from "@ant-design/icons"
import {isEnpriTraceAgent} from "@/utils/envfile"
import "./MainTabs.scss"
import {simpleDetectParams} from "@/store"
import {useGetState} from "ahooks"

const {ipcRenderer} = window.require("electron")
const {TabPane} = Tabs

interface InitTabIdProp {
    children: ReactNode
    id: string
}

const InitTabId: React.FC<InitTabIdProp> = (props) => {
    useLayoutEffect(() => {
        if (isEnpriTraceAgent()) {
            simpleDetectParams.tabId = props.id
        }
    }, [])
    return <>{props.children}</>
}

export interface MainTabsProp {
    currentTabKey: string
    tabType: string
    pages: multipleNodeInfo[]
    currentKey: string
    isShowAdd?: boolean
    setCurrentKey: (key: string, type: string) => void
    removePage: (key: string, type: string) => void
    removeOtherPage: (key: string, type: string) => void
    onAddTab?: () => any
    updateCacheVerbose: (key: string, tabType: string, value: string) => void
}

interface SimpleDetectTabsProps {
    tabId: string
    status: "run" | "stop" | "success"
}

export const MainTabs: React.FC<MainTabsProp> = memo((props) => {
    const {
        currentTabKey,
        tabType,
        pages,
        currentKey,
        isShowAdd = false,
        setCurrentKey,
        removePage,
        removeOtherPage,
        onAddTab = () => {
        },
        updateCacheVerbose
    } = props
    const [loading, setLoading] = useState<boolean>(false)
    const tabsRef = useRef(null)
    const [_, setSimpleDetectTabsStatus, getSimpleDetectTabsStatus] = useGetState<SimpleDetectTabsProps[]>([])
    useEffect(() => {
        setTimeout(() => {
            if (!tabsRef || !tabsRef.current) return
            const ref = tabsRef.current as unknown as HTMLDivElement
            ref.focus()
        }, 100)
    }, [currentKey])
    useEffect(() => {
        if (currentTabKey === tabType) {
            setTimeout(() => {
                if (!tabsRef || !tabsRef.current) return
                const ref = tabsRef.current as unknown as HTMLDivElement
                ref.focus()
            }, 100)
        }
    }, [currentTabKey])

    const bars = (props: any, TabBarDefault: any) => {
        return (
            <TabBarDefault
                {...props}
                children={(barNode: React.ReactElement) => {
                    const route = ((barNode.key as string) || "httpHacker").split("-[").shift()
                    if (pages.length === 1) return barNode
                    return (
                        <DropdownMenu
                            menu={{
                                data: [{key: "other", title: "关闭其他Tabs"}]
                            }}
                            dropdown={{trigger: ["contextMenu"]}}
                            onClick={(key) => {
                                switch (key) {
                                    case "other":
                                        removeOtherPage(barNode.key as unknown as string, tabType)
                                        break
                                    default:
                                        break
                                }
                            }}
                        >
                            {barNode}
                        </DropdownMenu>
                    )
                }}
            />
        )
    }

    // 简易企业版 根据任务状态控制颜色
    const judgeTabColor = (verbose: string, id: string) => {
        if (isEnpriTraceAgent()) {
            let itemArr = getSimpleDetectTabsStatus().filter((item) => item.tabId === id)
            if (itemArr.length > 0 && itemArr[0].tabId !== currentKey) {
                let status = itemArr[0].status
                let color = ""
                switch (status) {
                    case "run":
                        color = "blue"
                        break;
                    case "stop":
                        color = "red"
                        break;
                    case "success":
                        color = "green"
                        break;
                }
                return <div style={{color}}>{verbose}</div>
            }
            return verbose
        }
        return verbose

    }

    useEffect(() => {
        ipcRenderer.on("fetch-new-tabs-color", (e, data: SimpleDetectTabsProps) => {
            let cacheData = [...getSimpleDetectTabsStatus()]
            let isFind: boolean = cacheData.filter((item) => item.tabId === data.tabId).length > 0
            if (isFind) {
                cacheData = cacheData.map((item) => {
                    if (item.tabId === data.tabId && item.status !== data.status) {
                        return ({
                            tabId: data.tabId,
                            status: data.status
                        })
                    }
                    return item
                })
                setSimpleDetectTabsStatus(cacheData)
            } else {
                setSimpleDetectTabsStatus([...getSimpleDetectTabsStatus(), data])
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-new-tabs-color")
        }
    }, [])

    return (
        <AutoSpin spinning={loading}>
            <div
                ref={tabsRef}
                className='secondary-menu-tabs'
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        e.stopPropagation()
                        if (pages.length === 0) return

                        setLoading(true)
                        removePage(currentKey, tabType)
                        setTimeout(() => {
                            setLoading(false)
                        }, 300)
                        return
                    }
                    if (e.code === "KeyT" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isShowAdd) return
                        onAddTab()
                        return
                    }
                }}
            >
                <Tabs
                    className='secondary-menu-tabs yakit-main-tabs'
                    size='small'
                    type='editable-card'
                    hideAdd={!isShowAdd}
                    activeKey={currentKey}
                    onChange={(key) => setCurrentKey(key, tabType)}
                    onEdit={(targetKey, action) => {
                        // if (action === "remove") removePage(targetKey as unknown as string, tabType)
                        if (action === "add") onAddTab()
                    }}
                    renderTabBar={(props, TabBarDefault) => {
                        return bars(props, TabBarDefault)
                    }}
                >
                    {pages.map((item, index) => {
                        return (
                            <TabPane
                                forceRender={true}
                                key={item.id}
                                tab={judgeTabColor(item.verbose, item.id)}
                                closeIcon={
                                    <Space>
                                        <Popover
                                            trigger={"click"}
                                            title={"修改名称"}
                                            content={
                                                <>
                                                    <Input
                                                        size={"small"}
                                                        defaultValue={item.verbose}
                                                        onBlur={(e) =>
                                                            updateCacheVerbose(`${item.id}`, tabType, e.target.value)
                                                        }
                                                    />
                                                </>
                                            }
                                        >
                                            <EditOutlined className='main-container-cion'/>
                                        </Popover>
                                        <CloseOutlined
                                            className='main-container-cion'
                                            onClick={() => removePage(`${item.id}`, tabType)}
                                        />
                                    </Space>
                                }
                            >
                                <div
                                    style={{
                                        overflow: "hidden",
                                        height: "100%",
                                        maxHeight: "100%"
                                    }}
                                >
                                    <InitTabId children={item.node} id={item.id}/>
                                </div>
                            </TabPane>
                        )
                    })}
                </Tabs>
            </div>
        </AutoSpin>
    )
})

export const addToTab = (type: string, data?: any) => {
    ipcRenderer.invoke("send-to-tab", {type, data})
}