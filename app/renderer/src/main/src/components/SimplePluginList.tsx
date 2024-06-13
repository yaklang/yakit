import React, {useRef, useState} from "react"
import {YakScript} from "../pages/invoker/schema"
import "./PluginList.css"
import {useGetState, useVirtualList} from "ahooks"
import {AutoCard} from "./AutoCard"
import {Space, Tag} from "antd"
import ReactResizeDetector from "react-resize-detector"
import {OneLine} from "../utils/inputUtil"
import {showModal} from "../utils/showModal"
import {CodeOutlined, QuestionCircleOutlined, UserOutlined} from "@ant-design/icons"
import {YakEditor} from "../utils/editors"

export interface SimplePluginListFromYakScriptNamesProp {
    names: string[]
}

/**
 * @deprecated 暂时不删，批量执行任务列表功能做参考
 * @description ReadOnlyBatchExecutorByRecoverUid 再用，等ReadOnlyBatchExecutorByRecoverUid删除后同步删除
 * TODO - 任务列表已做，可以删除了
 */
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
                    <YakEditor type={i.Type} readOnly={true} value={i.Content} />
                </div>
            )
        })
    })
}
