import React, {useEffect, useRef, useState} from "react"
import {Button, Space, Popover, Form, Checkbox, Typography, Tooltip, Tag} from "antd"
import {
    QuestionCircleOutlined,
    SearchOutlined,
    SettingOutlined,
    UserOutlined,
    CaretRightOutlined,
    PoweroffOutlined
} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useVirtualList} from "ahooks"
import {queryYakScriptList} from "../yakitStore/network"
import {YakScript} from "../invoker/schema"
import {AutoCard} from "../../components/AutoCard"
import {PluginResultUI} from "../yakitStore/viewers/base"
import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream"
import {randomString} from "../../utils/randomUtil"
import {failed} from "../../utils/notification"
import {InputInteger, InputItem} from "../../utils/inputUtil"
import ReactResizeDetector from "react-resize-detector"

import "./HackerPlugin.css"
import {showModal} from "../../utils/showModal"
import {xtermClear} from "../../utils/xtermUtils"

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

export interface HackerPluginProps {
    request: Uint8Array
    response?: Uint8Array

    isHTTPS: boolean
}
export interface ExecutePacketYakScriptProp {
    ScriptName: string
    IsHttps: boolean
    Request: Uint8Array
    Response?: Uint8Array
}

export const HackerPlugin: React.FC<HackerPluginProps> = React.memo((props) => {
    const [token, setToken] = useState<string>(randomString(40))
    const [loading, setLoading] = useState<boolean>(false)
    const [lists, setLists, getLists] = useGetState<YakScript[]>([])
    const [keyword, setKeyword] = useState<string>("")
    const [limit, setLimit] = useState<number>(100)
    const [total, setTotal] = useState<number>(0)

    const [selected, setSelected] = useState<string[]>([])
    const [indeterminate, setIndeterminate] = useState<boolean>(false)
    const [checked, setChecked] = useState<boolean>(false)

    const containerRef = useRef()
    const wrapperRef = useRef()
    const [list] = useVirtualList(getLists(), {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 40,
        overscan: 20
    })
    const [vlistHeigth, setVListHeight] = useState(600)

    const [execting, setExecting] = useState<boolean>(false)
    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream(
        `execute-packet-yak-script`,
        "ExecutePacketYakScript",
        token,
        () => setExecting(false)
    )

    const search = useMemoizedFn(() => {
        setLoading(true)
        queryYakScriptList(
            "packet-hack",
            (data, total) => {
                setTotal(total || 0)
                setLists(data)
            },
            () => setTimeout(() => setLoading(false), 300),
            limit,
            undefined,
            keyword
        )
    })

    const selectYakScript = useMemoizedFn((info: YakScript) => {
        setSelected([info.ScriptName])
        // if (!selected.includes(info.ScriptName)) {
        //     setSelected([...selected, info.ScriptName])
        // }
    })
    const unselectYakScript = useMemoizedFn((info: YakScript) => {
        setSelected([])
        // setSelected(selected.filter((i) => i !== info.ScriptName))
    })

    // useEffect(() => {
    //     const totalYakScript = lists.length
    //     const filterArr = lists.filter((item) => selected.indexOf(item.ScriptName) > -1)

    //     const IndeterminateFlag =
    //         (filterArr.length > 0 && filterArr.length < totalYakScript && selected.length !== 0) ||
    //         (filterArr.length === 0 && selected.length !== 0)
    //     const checkedFlag = filterArr.length === totalYakScript && selected.length !== 0

    //     setIndeterminate(IndeterminateFlag)
    //     setChecked(checkedFlag)
    // }, [selected, lists])

    const startScript = useMemoizedFn(() => {
        if (selected.length === 0) {
            failed("请选一个插件后在点击执行")
            return
        }
        setExecting(true)

        const params: ExecutePacketYakScriptProp = {
            ScriptName: selected[0],
            IsHttps: props.isHTTPS,
            Request: props.request
        }
        if (!!props.response) params.Response = props.response
        ipcRenderer
            .invoke("ExecutePacketYakScript", params, token)
            .then(() => {})
            .catch((e) => {
                failed(`Start Packet Checker Error: ${e}`)
                setExecting(false)
            })
    })
    const cancelScript = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-ExecutePacketYakScript", token)
    })

    useEffect(() => {
        search()
    }, [])

    const renderListItem = useMemoizedFn((info: YakScript) => {
        return (
            <div key={info.ScriptName} className='list-opt'>
                <Checkbox
                    checked={selected.includes(info.ScriptName)}
                    onChange={(r) => {
                        if (r.target.checked) selectYakScript(info)
                        else unselectYakScript(info)
                    }}
                >
                    <Space>
                        <Text style={{maxWidth: 270}} ellipsis={{tooltip: true}}>
                            {info.ScriptName}
                        </Text>
                        {info.Help && (
                            <Button
                                size={"small"}
                                type={"link"}
                                onClick={() => {
                                    showModal({
                                        width: "40%",
                                        title: "Help",
                                        content: <>{info.Help}</>
                                    })
                                }}
                                icon={<QuestionCircleOutlined />}
                            />
                        )}
                    </Space>
                </Checkbox>
                <div style={{flex: 1, textAlign: "right"}}>
                    {info.Author && (
                        <Tooltip title={info.Author}>
                            <Button size={"small"} type={"link"} icon={<UserOutlined />} />
                        </Tooltip>
                    )}
                </div>
            </div>
        )
    })

    return (
        <div className='mitm-exec-plugin'>
            <div className='left-body'>
                <AutoCard
                    size='small'
                    bordered={false}
                    title={"数据包扫描插件(暂只支持单选)"}
                    bodyStyle={{padding: "0 4px", overflowY: "hidden"}}
                    extra={
                        <Space>
                            {/* <Checkbox
                                indeterminate={indeterminate}
                                onChange={(r) => {
                                    if (r.target.checked) {
                                        const newSelected = [...lists.map((i) => i.ScriptName), ...selected]
                                        setSelected(newSelected.filter((e, index) => newSelected.indexOf(e) === index))
                                    } else {
                                        setSelected([])
                                    }
                                }}
                                checked={checked}
                            >
                                全选
                            </Checkbox> */}
                            <Popover
                                title={"额外设置"}
                                trigger={["click"]}
                                content={
                                    <div>
                                        <Form
                                            size={"small"}
                                            onSubmitCapture={(e) => {
                                                e.preventDefault()
                                                search()
                                            }}
                                        >
                                            <InputInteger
                                                label={"插件展示数量"}
                                                value={limit}
                                                setValue={setLimit}
                                                formItemStyle={{marginBottom: 4}}
                                            />
                                            <Form.Item colon={false} label={""} style={{marginBottom: 10}}>
                                                <Button type='primary' htmlType='submit'>
                                                    刷新
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </div>
                                }
                            >
                                <Button size={"small"} icon={<SettingOutlined />} type={"link"} />
                            </Popover>
                            <Popover
                                title={"搜索插件关键字"}
                                trigger={["click"]}
                                content={
                                    <div>
                                        <Form
                                            size={"small"}
                                            onSubmitCapture={(e) => {
                                                e.preventDefault()
                                                search()
                                            }}
                                        >
                                            <InputItem
                                                label={""}
                                                extraFormItemProps={{style: {marginBottom: 4}, colon: false}}
                                                value={keyword}
                                                setValue={setKeyword}
                                            />
                                            <Form.Item colon={false} label={""} style={{marginBottom: 10}}>
                                                <Button type='primary' htmlType='submit'>
                                                    搜索
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </div>
                                }
                            >
                                <Button
                                    size={"small"}
                                    type={!!keyword ? "primary" : "link"}
                                    icon={<SearchOutlined />}
                                />
                            </Popover>
                            {execting ? (
                                <Button
                                    type='link'
                                    danger
                                    style={{padding: "4px 0"}}
                                    icon={<PoweroffOutlined />}
                                    onClick={cancelScript}
                                />
                            ) : (
                                <Button
                                    type='link'
                                    style={{padding: "4px 0"}}
                                    icon={<CaretRightOutlined />}
                                    onClick={() => {
                                        xtermClear(xtermRef)
                                        reset()
                                        startScript()
                                    }}
                                />
                            )}
                        </Space>
                    }
                >
                    <div style={{height: "100%"}}>
                        <ReactResizeDetector
                            onResize={(width, height) => {
                                if (!width || !height) {
                                    return
                                }
                                setVListHeight(height)
                            }}
                            handleWidth={true}
                            handleHeight={true}
                            refreshMode={"debounce"}
                            refreshRate={50}
                        />
                        <div ref={containerRef as any} style={{height: vlistHeigth, overflow: "auto"}}>
                            <div ref={wrapperRef as any}>{list.map((i) => renderListItem(i.data))}</div>
                        </div>
                    </div>
                </AutoCard>
            </div>

            <div className='right-body'>
                <AutoCard
                    size='small'
                    bordered={false}
                    title={
                        <Space>
                            {"已选插件 / 当页插件 / 插件总量"}
                            <Tag>{`${selected.length} / ${lists.length} / ${total}`}</Tag>
                        </Space>
                    }
                    bodyStyle={{padding: 0, paddingLeft: 5}}
                >
                    <PluginResultUI
                        results={infoState.messageSate}
                        progress={infoState.processState}
                        feature={infoState.featureMessageState}
                        statusCards={infoState.statusState}
                        loading={loading}
                        onXtermRef={setXtermRef}
                    />
                </AutoCard>
            </div>
        </div>
    )
})
