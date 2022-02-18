import React, {useEffect, useState} from "react"
import {Select, Button, Spin} from "antd"
import {useMemoizedFn} from "ahooks"
import {queryYakScriptList} from "../yakitStore/network"
import {YakScript} from "../invoker/schema"
import debounce from "lodash/debounce"
import {AutoCard} from "../../components/AutoCard"
import {PluginResultUI} from "../yakitStore/viewers/base"
import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream"
import {randomString} from "../../utils/randomUtil"
import {failed} from "../../utils/notification"

import "./HackerPlugin.css"

const {ipcRenderer} = window.require("electron")
const {Option} = Select

export interface HackerPluginProps {
    request: Uint8Array | string
    response?: Uint8Array

    isHTTPS: boolean
}
export interface ExecutePacketYakScriptProp {
    ScriptName: string
    IsHttps: boolean
    Request: Uint8Array | string
    Response?: Uint8Array
}

export const HackerPlugin: React.FC<HackerPluginProps> = React.memo((props) => {
    const [value, setValue] = useState<string>("")
    const [token, setToken] = useState(randomString(20))
    const [execting, setExecting] = useState<boolean>(false)
    const [pluginList, setPluginList] = useState<string[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [selectPage, setSelectPage] = useState<number>(1)

    const [infoState, {reset, setXtermRef}] = useHoldingIPCRStream(
        `execute-packet-yak-script`,
        "ExecutePacketYakScript",
        token,
        () => setExecting(false)
    )

    const search = debounce(
        useMemoizedFn((page: number, keyword?: string) => {
            setLoading(true)
            queryYakScriptList(
                "packet-hack",
                (i: YakScript[], total) => {
                    const arr = pluginList.concat(i.map((item) => item.ScriptName))
                    if (page !== 1) setPluginList(arr)
                    else setPluginList(i.map((item) => item.ScriptName))
                },
                () => setTimeout(() => setLoading(false), 300),
                20,
                page,
                keyword
            )
        }),
        500
    )

    const startScript = useMemoizedFn(() => {
        if (!value) {
            failed("请选一个插件后在点击执行")
            return
        }
        setExecting(true)

        const params: ExecutePacketYakScriptProp = {
            ScriptName: value,
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
        ipcRenderer.invoke("cancel-ExecutePacketYakScript")
    })

    useEffect(() => {
        search(1)
    }, [])

    return (
        <div className='mitm-exec-plugin'>
            <div className='exec-plugin-input'>
                <span className='input-title'>社区插件</span>
                <Select
                    className='input-style'
                    loading={loading}
                    disabled={execting}
                    value={value}
                    showSearch
                    allowClear
                    filterOption={false}
                    onChange={setValue}
                    onSearch={(value) => {
                        search(1, value)
                        setSelectPage(1)
                    }}
                    dropdownRender={(originNode) => {
                        return (
                            <div>
                                {originNode}
                                {loading && <Spin size='small' style={{padding: "0 10px"}} />}
                            </div>
                        )
                    }}
                    onPopupScroll={(e: any) => {
                        // 懒加载
                        const {clientHeight, scrollHeight, scrollTop} = e.target
                        if (clientHeight + scrollTop === scrollHeight && !loading) {
                            search(selectPage + 1)
                            setSelectPage(selectPage + 1)
                        }
                    }}
                >
                    {pluginList.map((item) => {
                        return (
                            <Option key={item} value={item}>
                                {item}
                            </Option>
                        )
                    })}
                </Select>
                {execting ? (
                    <Button type='primary' danger onClick={() => cancelScript()}>
                        停止执行
                    </Button>
                ) : (
                    <Button
                        type='primary'
                        onClick={() => {
                            reset()
                            startScript()
                        }}
                    >
                        立即执行
                    </Button>
                )}
            </div>

            <div className='exec-plugin-info'>
                <AutoCard title={"execute-packet-yak-script"}>
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
